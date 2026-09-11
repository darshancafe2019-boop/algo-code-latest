"""
Upstox V3 Market Data WebSocket Adapter
========================================
Official Protobuf-decoded real-time WebSocket feed for Indian Stock Market:
- Equities (NSE/BSE)
- Indices (NIFTY 50, BANK NIFTY, INDIA VIX)
- Derivatives (NSE Futures & Options)

STRICT TRUTH-IN-DATA & PRODUCTION STANDARDS:
- Connects exclusively to authorized Upstox V3 WebSocket endpoint.
- Decodes official binary Protobuf frames (all feed modes: ltpc, option_greeks, full, full_d30).
- Never generates synthetic or simulated ticks (NO ltp*0.9995, NO fake OHLC, NO default oi=0).
- Status is only 'LIVE' when actual recent market ticks are being received.
- Separates socket message time from valid market tick time.
- Fully instruments decoder metrics (errors, successes, latency).
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

try:
    import websockets
    from websockets.exceptions import ConnectionClosed
    WS_AVAILABLE = True
except ImportError:
    WS_AVAILABLE = False

from market_data_gateway.adapters.base import (
    BaseProviderAdapter,
    CanonicalInstrument,
    NormalizedQuote,
    OHLCVCandle,
    ProviderHealth,
)
from market_data_gateway.upstox_protobuf_decoder import (
    decode_market_data_feed,
    get_decoder_metrics,
)
from src.exchange_session_engine import global_session_engine
from src.upstox_service import (
    global_upstox_service,
    OFFICIAL_UPSTOX_KEYS,
)

logger = logging.getLogger("MDGateway.UpstoxWS")
MAX_BACKOFF_SEC = 30.0


def is_indian_market_open() -> bool:
    """Delegates to universal exchange session engine for NSE session state."""
    return global_session_engine.get_session("NSE").is_trading_open


class UpstoxWSAdapter(BaseProviderAdapter):
    """
    Official Upstox V3 Market Data WebSocket Adapter.
    Authorizes via Upstox V3 endpoint, subscribes to requested instrument keys,
    and decodes incoming binary Protobuf frames with strict truth-in-data validation.
    """

    def __init__(self):
        super().__init__("upstox_ws", "Upstox V3 WebSocket")
        self._ws = None
        self._ws_task: Optional[asyncio.Task] = None
        self._running = False
        self._retry_count = 0
        self._last_latency_ms: float = 0.0
        self._quote_cache: Dict[str, NormalizedQuote] = {}
        self._subscribed_keys: Set[str] = set()
        self._subscribed_modes: Dict[str, str] = {}  # symbol -> mode

        # Diagnostic Timestamps
        self._last_socket_msg_at: Optional[float] = None
        self._last_binary_msg_at: Optional[float] = None
        self._last_decoded_msg_at: Optional[float] = None
        self._last_valid_tick_at: Optional[float] = None
        self._last_valid_quote_at: Optional[float] = None
        self._last_valid_depth_at: Optional[float] = None
        self._last_valid_greeks_at: Optional[float] = None

        # Counters & Metrics
        self._bytes_received = 0
        self._messages_received = 0
        self._ticks_received = 0
        self._decode_errors = 0
        self._decode_successes = 0
        self._invalid_messages = 0
        self._unknown_instruments = 0

        self._auth_error_reason: Optional[str] = None

    @property
    def is_market_open(self) -> bool:
        session = global_session_engine.get_session("NSE")
        return session.is_trading_open

    @property
    def feed_state(self) -> str:
        if not global_upstox_service.is_authenticated:
            return global_upstox_service._auth_status if global_upstox_service._auth_status != "INITIAL" else "ACCESS_TOKEN_MISSING"
        if not self.is_market_open and self._status == "CONNECTED":
            return "MARKET_CLOSED"
        return self._status

    # ─── Connection Lifecycle ────────────────────────────────────────────────

    async def connect(self) -> None:
        if not WS_AVAILABLE:
            logger.error("websockets package not installed. Run: pip install websockets")
            self._status = "DISCONNECTED"
            self._auth_error_reason = "WEBSOCKETS_PACKAGE_MISSING"
            return

        self._running = True

        # Pre-validate token before opening WebSocket connection
        val = global_upstox_service.validate_token()
        if not val.get("valid"):
            self._status = "DISCONNECTED"
            self._auth_error_reason = val.get("status", "AUTH_REQUIRED")
            logger.info("Upstox WebSocket: %s (%s). Live feed idle (no retry loop).", self._auth_error_reason, val.get("message"))
            return

        self._status = "CONNECTING"
        logger.info("UpstoxWSAdapter connecting via official V3 authorization flow...")
        if not self._ws_task or self._ws_task.done():
            self._ws_task = asyncio.create_task(self._ws_loop(), name="UpstoxWSLoop")

    async def disconnect(self) -> None:
        self._running = False
        if self._ws_task and not self._ws_task.done():
            self._ws_task.cancel()
            try:
                await self._ws_task
            except asyncio.CancelledError:
                pass
        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass
            self._ws = None
        self._status = "DISCONNECTED"
        logger.info("UpstoxWSAdapter disconnected.")

    # ─── Subscription Management ─────────────────────────────────────────────

    @property
    def is_connected(self) -> bool:
        if not self._ws:
            return False
        if hasattr(self._ws, "open"):
            return bool(self._ws.open)
        if hasattr(self._ws, "closed"):
            return not self._ws.closed
        if hasattr(self._ws, "close_code"):
            return self._ws.close_code is None
        return True

    async def subscribe(self, symbols: List[str], mode: str = "full") -> None:
        for s in symbols:
            clean = s.strip().upper()
            self._subscribed_symbols.add(clean)
            self._subscribed_modes[clean] = mode.lower()
            ik = global_upstox_service.resolve_instrument_key(clean)
            if ik:
                self._subscribed_keys.add(ik)

        if self._running:
            if global_upstox_service.is_authenticated and not self._ws_task:
                self._ws_task = asyncio.create_task(self._ws_loop(), name="UpstoxWSLoop")

            if self.is_connected:
                await self._send_subscription(mode=mode)

    async def unsubscribe(self, symbols: List[str]) -> None:
        keys_to_unsub: List[str] = []
        for s in symbols:
            clean = s.strip().upper()
            self._subscribed_symbols.discard(clean)
            self._subscribed_modes.pop(clean, None)
            ik = global_upstox_service.resolve_instrument_key(clean)
            if ik:
                self._subscribed_keys.discard(ik)
                keys_to_unsub.append(ik)

        if self.is_connected and keys_to_unsub:
            payload = {
                "guid": f"quantos_unsub_{int(time.time() * 1000)}",
                "method": "unsub",
                "data": {
                    "instrumentKeys": keys_to_unsub,
                },
            }
            try:
                await self._ws.send(json.dumps(payload).encode("utf-8"))
                logger.info("Sent Upstox V3 binary unsubscribe for %d instruments", len(keys_to_unsub))
            except Exception as e:
                logger.warning("Failed to send Upstox unsubscribe: %s", e)

    async def change_mode(self, symbols: List[str], mode: str = "ltpc") -> None:
        keys_to_change: List[str] = []
        for s in symbols:
            clean = s.strip().upper()
            self._subscribed_modes[clean] = mode.lower()
            ik = global_upstox_service.resolve_instrument_key(clean)
            if ik:
                keys_to_change.append(ik)

        if self.is_connected and keys_to_change:
            payload = {
                "guid": f"quantos_mode_{int(time.time() * 1000)}",
                "method": "change_mode",
                "data": {
                    "mode": mode.lower(),
                    "instrumentKeys": keys_to_change,
                },
            }
            try:
                await self._ws.send(json.dumps(payload).encode("utf-8"))
                logger.info("Sent Upstox V3 binary change_mode (%s) for %d instruments", mode, len(keys_to_change))
            except Exception as e:
                logger.warning("Failed to send Upstox change_mode: %s", e)

    async def _send_subscription(self, mode: str = "full") -> None:
        if not self.is_connected or not self._subscribed_keys:
            return
        payload = {
            "guid": f"quantos_sub_{int(time.time() * 1000)}",
            "method": "sub",
            "data": {
                "mode": mode.lower(),
                "instrumentKeys": list(self._subscribed_keys),
            },
        }
        try:
            # Strict Upstox V3 requirement: Send payload as binary UTF-8 bytes
            binary_payload = json.dumps(payload).encode("utf-8")
            await self._ws.send(binary_payload)
            logger.info("Sent Upstox V3 binary WebSocket subscription for %d instruments (%s mode)", len(self._subscribed_keys), mode)
        except Exception as e:
            logger.warning("Failed to send Upstox subscription: %s", e)

    # ─── Live WebSocket Loop ─────────────────────────────────────────────────

    async def _ws_loop(self) -> None:
        while self._running:
            if not global_upstox_service.is_authenticated or global_upstox_service._circuit_breaker_open:
                self._status = "DISCONNECTED"
                self._auth_error_reason = global_upstox_service._auth_status or "AUTH_REQUIRED"
                logger.info("Upstox WebSocket: Circuit breaker active (%s). Halting WebSocket loop.", self._auth_error_reason)
                break

            auth_res = global_upstox_service.authorize_market_data_feed()
            if not auth_res.get("success"):
                self._status = "DISCONNECTED"
                err_code = auth_res.get("error_code") or auth_res.get("error") or "AUTHORIZATION_FAILED"
                self._auth_error_reason = err_code
                if err_code in ("UDAPI100050", "AUTH_REQUIRED", "UPSTOX_ACCESS_TOKEN_MISSING"):
                    logger.warning(
                        "Upstox V3 Market Data Feed authorization rejected (%s). Halting retry loop until user reconnects.",
                        err_code
                    )
                    break

                # Transient network error only -> bounded retry
                self._retry_count += 1
                if self._retry_count > 5:
                    logger.warning("Upstox V3 Market Data Feed exceeded max transient retries. Halting loop.")
                    break
                await asyncio.sleep(10.0)
                continue

            ws_url = auth_res.get("authorized_redirect_uri")
            if not ws_url:
                self._status = "DISCONNECTED"
                self._auth_error_reason = "NO_AUTHORIZED_URI"
                break

            try:
                logger.info("Connecting to authorized Upstox V3 WebSocket URI...")
                async with websockets.connect(
                    ws_url,
                    ping_interval=20,
                    ping_timeout=10,
                    close_timeout=5,
                ) as ws:
                    self._ws = ws
                    self._status = "CONNECTED"
                    self._retry_count = 0
                    self._auth_error_reason = None
                    logger.info("Connected to Upstox Live WebSocket feed.")

                    # Send subscriptions
                    await self._send_subscription()

                    async for message in ws:
                        if not self._running:
                            break
                        self._last_socket_msg_at = time.time()
                        self._messages_received += 1
                        if isinstance(message, bytes):
                            self._last_binary_msg_at = time.time()
                            self._bytes_received += len(message)
                            self._process_binary_message(message)
                        elif isinstance(message, str):
                            self._process_text_message(message)

            except asyncio.CancelledError:
                break
            except Exception as e:
                self._status = "DEGRADED"
                self._retry_count += 1
                if self._retry_count > 5:
                    logger.warning("Upstox WebSocket error: %s. Max retries exceeded. Live feed idle.", e)
                    break
                backoff = min(MAX_BACKOFF_SEC, 2.0 ** min(self._retry_count, 5))
                logger.warning("Upstox WebSocket error: %s. Reconnecting in %.1fs (attempt %d/5)...", e, backoff, self._retry_count)
                await asyncio.sleep(backoff)

    def _process_binary_message(self, binary_data: bytes) -> None:
        """Decodes binary Protobuf frame from Upstox V3 WebSocket with Strict Truth-in-Data validation."""
        try:
            decoded = decode_market_data_feed(binary_data)
            self._last_decoded_msg_at = time.time()

            if not decoded or "feeds" not in decoded:
                self._invalid_messages += 1
                return

            self._decode_successes += 1
            now_iso = datetime.now(timezone.utc).isoformat()
            now_epoch_ms = time.time() * 1000
            server_ts = decoded.get("current_ts", 0)
            latency = (now_epoch_ms - server_ts) if (server_ts and server_ts > 0) else 0.0
            self._last_latency_ms = max(0.0, latency)

            for ik, feed_data in decoded["feeds"].items():
                sym = self._key_to_symbol(ik)
                if not sym:
                    self._unknown_instruments += 1
                    continue

                ltp = feed_data.get("ltp")
                if ltp is None or float(ltp) <= 0:
                    # Partial message without valid trade price (e.g. status heartbeat)
                    continue

                ltp_val = float(ltp)
                self._ticks_received += 1
                self._last_valid_tick_at = time.time()
                self._status = "LIVE"

                # STRICT TRUTH-IN-DATA: Never synthesize missing fields
                close_val = feed_data.get("close")
                if close_val is None:
                    close_val = feed_data.get("cp")

                close_float = float(close_val) if close_val is not None and float(close_val) > 0 else None
                change_pct = None
                if close_float is not None and close_float > 0:
                    change_pct = round(((ltp_val - close_float) / close_float * 100.0), 2)

                bid_val = float(feed_data["bid"]) if feed_data.get("bid") is not None and float(feed_data["bid"]) > 0 else None
                ask_val = float(feed_data["ask"]) if feed_data.get("ask") is not None and float(feed_data["ask"]) > 0 else None
                open_val = float(feed_data["open"]) if feed_data.get("open") is not None and float(feed_data["open"]) > 0 else None
                high_val = float(feed_data["high"]) if feed_data.get("high") is not None and float(feed_data["high"]) > 0 else None
                low_val = float(feed_data["low"]) if feed_data.get("low") is not None and float(feed_data["low"]) > 0 else None
                volume_val = float(feed_data["volume"]) if feed_data.get("volume") is not None else None
                oi_val = float(feed_data["oi"]) if feed_data.get("oi") is not None else None

                depth_data = feed_data.get("depth")
                if depth_data:
                    self._last_valid_depth_at = time.time()

                greeks_data = feed_data.get("greeks")
                if greeks_data:
                    self._last_valid_greeks_at = time.time()

                q = NormalizedQuote(
                    symbol=sym,
                    exchange="NSE",
                    provider="upstox_ws",
                    last_price=ltp_val,
                    bid=bid_val,
                    ask=ask_val,
                    volume=volume_val,
                    open=open_val,
                    high=high_val,
                    low=low_val,
                    close=close_float,
                    change_pct=change_pct,
                    oi=oi_val,
                    depth=depth_data,
                    greeks=greeks_data,
                    event_timestamp=now_iso,
                    received_timestamp=now_iso,
                    feed_latency_ms=round(self._last_latency_ms, 1),
                    data_mode="REAL_TIME",
                    is_stale=False,
                )
                self._quote_cache[sym] = q
                self._emit(q)

        except Exception as exc:
            self._decode_errors += 1
            logger.error("Upstox Protobuf decoding error: %s", exc, exc_info=True)

    def _process_text_message(self, raw_text: str) -> None:
        """Handles text status responses or connection acknowledgements."""
        try:
            data = json.loads(raw_text)
            logger.info("Upstox WS text message received: %s", data)
        except Exception:
            pass

    def _key_to_symbol(self, ik: str) -> str:
        for sym, meta in OFFICIAL_UPSTOX_KEYS.items():
            if meta["instrument_key"] == ik or meta["instrument_key"].replace("|", ":") == ik:
                return sym
        if "|" in ik:
            return ik.split("|")[-1]
        return ik

    # ─── Data Access Methods ─────────────────────────────────────────────────

    async def get_snapshot(self, symbols: List[str]) -> Dict[str, NormalizedQuote]:
        result = {}
        for s in symbols:
            clean = s.strip().upper()
            if clean in self._quote_cache:
                result[clean] = self._quote_cache[clean]
        return result

    async def get_history(self, symbol: str, timeframe: str, start_time: str, end_time: Optional[str] = None) -> List[OHLCVCandle]:
        """Fetches historical candles with safe dataframe handling."""
        df = global_upstox_service.fetch_historical_candles(symbol, timeframe, limit=300)
        candles: List[OHLCVCandle] = []

        if df is None:
            return candles

        if hasattr(df, "iterrows"):
            for _, row in df.iterrows():
                ts = str(row.get("timestamp", ""))
                try:
                    ts_iso = datetime.fromisoformat(ts.replace("Z", "+00:00")).isoformat()
                except Exception:
                    ts_iso = ts

                candles.append(
                    OHLCVCandle(
                        symbol=symbol,
                        exchange="NSE",
                        provider="upstox_ws",
                        timeframe=timeframe,
                        timestamp=ts_iso,
                        open=float(row.get("open", 0.0)),
                        high=float(row.get("high", 0.0)),
                        low=float(row.get("low", 0.0)),
                        close=float(row.get("close", 0.0)),
                        volume=float(row.get("volume", 0.0)),
                        is_closed=True,
                    )
                )
        elif isinstance(df, list):
            for row in df:
                candles.append(
                    OHLCVCandle(
                        symbol=symbol,
                        exchange="NSE",
                        provider="upstox_ws",
                        timeframe=timeframe,
                        timestamp=str(row.get("timestamp", "")),
                        open=float(row.get("open", 0.0)),
                        high=float(row.get("high", 0.0)),
                        low=float(row.get("low", 0.0)),
                        close=float(row.get("close", 0.0)),
                        volume=float(row.get("volume", 0.0)),
                        is_closed=True,
                    )
                )
        return candles

    async def get_instruments(self) -> List[CanonicalInstrument]:
        instruments = []
        for sym, meta in OFFICIAL_UPSTOX_KEYS.items():
            instruments.append(
                CanonicalInstrument(
                    canonical_symbol=sym,
                    display_name=meta["name"],
                    asset_class=meta["asset_class"],
                    exchange="NSE",
                    mic_code="XNSE",
                    region="IN",
                    currency="INR",
                    timezone="Asia/Kolkata",
                    tick_size=meta.get("tick_size", 0.05),
                    lot_size=meta.get("lot_size", 1),
                    provider_symbols={"upstox": meta.get("instrument_key", "")},
                    is_active=True,
                )
            )
        return instruments

    async def health_check(self) -> ProviderHealth:
        last_tick = self._last_valid_tick_at
        age = (time.time() - last_tick) if last_tick else 9999.0
        status = self._status

        if global_upstox_service._auth_status == "AUTH_REQUIRED" or self._auth_error_reason in ("AUTH_REQUIRED", "UDAPI100050"):
            status = "AUTH_REQUIRED"
            msg = "Upstox access token expired or invalid (UDAPI100050). Please reconnect in Settings -> Brokers."
        elif not global_upstox_service.is_authenticated:
            status = "ACCESS_TOKEN_MISSING"
            msg = "Access token missing; set UPSTOX_ACCESS_TOKEN in .env or login via Settings -> Brokers."
        elif not self.is_market_open and self._status == "CONNECTED":
            status = "MARKET_CLOSED"
            msg = "Indian market (NSE/BSE) is CLOSED (Mon-Fri 09:15-15:30 IST)"
        elif status == "LIVE" and age > 15.0 and self.is_market_open:
            status = "STALE"
            msg = f"Upstox V3 Market Data Feed STALE ({age:.1f}s since last valid tick)"
        elif self._status == "CONNECTED" and self._ticks_received == 0:
            status = "CONNECTED_NO_VALID_DATA"
            msg = "Connected to Upstox WebSocket but waiting for initial valid market ticks"
        else:
            msg = f"Upstox V3 Market Data Feed {status}"

        return ProviderHealth(
            provider_id="upstox_ws",
            provider_name="Upstox V3 WebSocket",
            status=status,
            asset_classes=["INDIAN_EQUITIES", "INDIAN_INDICES", "OPTIONS", "FUTURES"],
            subscribed_symbols=len(self._subscribed_symbols),
            latency_ms=round(self._last_latency_ms, 1),
            error_count=self._decode_errors + self._retry_count,
            last_tick_time=datetime.fromtimestamp(last_tick, tz=timezone.utc).isoformat() if last_tick else None,
            message=msg,
        )

    def get_diagnostics(self) -> Dict[str, Any]:
        """Comprehensive Phase 28 diagnostics telemetry."""
        return {
            "provider": "upstox_ws",
            "status": self._status,
            "feed_state": self.feed_state,
            "is_market_open": self.is_market_open,
            "messages_received": self._messages_received,
            "bytes_received": self._bytes_received,
            "ticks_received": self._ticks_received,
            "decode_successes": self._decode_successes,
            "decode_errors": self._decode_errors,
            "invalid_messages": self._invalid_messages,
            "unknown_instruments": self._unknown_instruments,
            "latency_ms": self._last_latency_ms,
            "last_socket_msg_at": self._last_socket_msg_at,
            "last_binary_msg_at": self._last_binary_msg_at,
            "last_decoded_msg_at": self._last_decoded_msg_at,
            "last_valid_tick_at": self._last_valid_tick_at,
            "last_valid_depth_at": self._last_valid_depth_at,
            "last_valid_greeks_at": self._last_valid_greeks_at,
            "subscribed_symbols": list(self._subscribed_symbols),
            "subscribed_modes": self._subscribed_modes,
        }

    async def search_instruments(self, query: str, limit: int = 20) -> List[CanonicalInstrument]:
        q = query.strip().upper()
        results = []
        for sym, meta in OFFICIAL_UPSTOX_KEYS.items():
            if q in sym or q in meta["name"].upper():
                results.append(
                    CanonicalInstrument(
                        canonical_symbol=sym,
                        display_name=meta["name"],
                        asset_class=meta["asset_class"],
                        exchange="NSE",
                        mic_code="XNSE",
                        region="IN",
                        currency="INR",
                        timezone="Asia/Kolkata",
                        tick_size=meta.get("tick_size", 0.05),
                        lot_size=meta.get("lot_size", 1),
                        provider_symbols={"upstox": meta.get("instrument_key", "")},
                        is_active=True,
                    )
                )
                if len(results) >= limit:
                    break
        return results
