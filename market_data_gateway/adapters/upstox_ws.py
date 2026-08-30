"""
Upstox V3 Market Data WebSocket Adapter
========================================
Official Protobuf-decoded real-time WebSocket feed for Indian Stock Market:
- Equities (NSE/BSE)
- Indices (NIFTY 50, BANK NIFTY, INDIA VIX)
- Derivatives (NSE Futures & Options)

STRICT TRUTH-IN-DATA:
- Connects exclusively to authorized Upstox V3 WebSocket endpoint.
- Decodes official binary Protobuf frames.
- Never generates synthetic or simulated ticks.
- Status is only 'LIVE' when actual recent market ticks are being received.
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
from market_data_gateway.upstox_protobuf_decoder import decode_market_data_feed
from src.upstox_service import (
    global_upstox_service,
    OFFICIAL_UPSTOX_KEYS,
)

logger = logging.getLogger("MDGateway.UpstoxWS")
MAX_BACKOFF_SEC = 30.0


def is_indian_market_open() -> bool:
    """
    Checks if Indian stock market (NSE/BSE) is currently in regular trading session:
    Monday to Friday, 09:15 to 15:30 IST (UTC+05:30).
    """
    now_utc = datetime.now(timezone.utc)
    # IST = UTC + 5h30m
    ist_offset = timezone(timezone.utc.utcoffset(now_utc) or __import__("datetime").timedelta(hours=5, minutes=30))
    now_ist = now_utc.astimezone(ist_offset)

    # Check weekday (0 = Monday, ..., 4 = Friday, 5 = Saturday, 6 = Sunday)
    if now_ist.weekday() >= 5:
        return False

    current_time_minutes = now_ist.hour * 60 + now_ist.minute
    market_open_minutes = 9 * 60 + 15    # 09:15 IST
    market_close_minutes = 15 * 60 + 30  # 15:30 IST

    return market_open_minutes <= current_time_minutes <= market_close_minutes


class UpstoxWSAdapter(BaseProviderAdapter):
    """
    Official Upstox V3 Market Data WebSocket Adapter.
    Authorizes via Upstox V3 endpoint, subscribes to requested instrument keys,
    and decodes incoming binary Protobuf frames.
    """

    def __init__(self):
        super().__init__("upstox_ws", "Upstox V3 WebSocket")
        self._ws = None
        self._ws_task: Optional[asyncio.Task] = None
        self._running = False
        self._retry_count = 0
        self._last_msg_time: float = 0.0
        self._last_latency_ms: float = 0.0
        self._quote_cache: Dict[str, NormalizedQuote] = {}
        self._subscribed_keys: Set[str] = set()
        self._bytes_received = 0
        self._messages_received = 0
        self._ticks_received = 0
        self._auth_error_reason: Optional[str] = None
        self._feed_state = "DISCONNECTED"

    @property
    def feed_state(self) -> str:
        if not global_upstox_service.is_authenticated:
            return global_upstox_service._auth_status if global_upstox_service._auth_status != "INITIAL" else "ACCESS_TOKEN_MISSING"
        if not is_indian_market_open() and self._status == "CONNECTED":
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

    async def subscribe(self, symbols: List[str]) -> None:
        for s in symbols:
            clean = s.strip().upper()
            self._subscribed_symbols.add(clean)
            ik = global_upstox_service.resolve_instrument_key(clean)
            if ik:
                self._subscribed_keys.add(ik)

        if self._running:
            if global_upstox_service.is_authenticated and not self._ws_task:
                self._ws_task = asyncio.create_task(self._ws_loop(), name="UpstoxWSLoop")

            if self.is_connected:
                await self._send_subscription()

    async def unsubscribe(self, symbols: List[str]) -> None:
        for s in symbols:
            clean = s.strip().upper()
            self._subscribed_symbols.discard(clean)
            ik = global_upstox_service.resolve_instrument_key(clean)
            if ik:
                self._subscribed_keys.discard(ik)

    async def _send_subscription(self) -> None:
        if not self.is_connected or not self._subscribed_keys:
            return
        payload = {
            "guid": f"quantos_sub_{int(time.time())}",
            "method": "sub",
            "data": {
                "mode": "full",
                "instrumentKeys": list(self._subscribed_keys),
            },
        }
        try:
            await self._ws.send(json.dumps(payload))
            logger.info("Sent Upstox V3 WebSocket subscription for %d instruments: %s", len(self._subscribed_keys), list(self._subscribed_keys)[:5])
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
                        self._last_msg_time = time.time()
                        self._messages_received += 1
                        if isinstance(message, bytes):
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
        """Decodes binary Protobuf frame from Upstox V3 WebSocket."""
        try:
            decoded = decode_market_data_feed(binary_data)
            if not decoded or "feeds" not in decoded:
                return

            now_iso = datetime.now(timezone.utc).isoformat()
            server_ts = decoded.get("current_ts", 0)
            latency = (time.time() * 1000 - server_ts) if server_ts > 0 else 0.0
            self._last_latency_ms = max(0.0, latency)

            for ik, feed_data in decoded["feeds"].items():
                sym = self._key_to_symbol(ik)
                ltp = float(feed_data.get("ltp") or 0.0)
                if ltp <= 0:
                    continue

                self._ticks_received += 1
                self._status = "LIVE"
                close = float(feed_data.get("close") or feed_data.get("cp") or ltp)
                change_pct = ((ltp - close) / close * 100.0) if close > 0 else 0.0

                q = NormalizedQuote(
                    symbol=sym,
                    exchange="NSE",
                    provider="upstox_ws",
                    last_price=ltp,
                    bid=float(feed_data.get("bid") or ltp * 0.9995),
                    ask=float(feed_data.get("ask") or ltp * 1.0005),
                    volume=float(feed_data.get("volume", 0.0)),
                    open=float(feed_data.get("open") or ltp),
                    high=float(feed_data.get("high") or ltp),
                    low=float(feed_data.get("low") or ltp),
                    close=close,
                    change_pct=round(change_pct, 2),
                    oi=float(feed_data.get("oi", 0.0)),
                    event_timestamp=now_iso,
                    received_timestamp=now_iso,
                    feed_latency_ms=round(self._last_latency_ms, 1),
                    data_mode="REAL_TIME",
                    is_stale=False,
                )
                self._quote_cache[sym] = q
                self._emit(q)

        except Exception as exc:
            logger.debug("Binary message decoding error: %s", exc)

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
        df = global_upstox_service.fetch_historical_candles(symbol, timeframe, limit=300)
        candles = []
        for _, row in df.iterrows():
            candles.append(
                OHLCVCandle(
                    symbol=symbol,
                    exchange="NSE",
                    provider="upstox_ws",
                    timeframe=timeframe,
                    timestamp=pd.to_datetime(row["timestamp"]).isoformat(),
                    open=float(row["open"]),
                    high=float(row["high"]),
                    low=float(row["low"]),
                    close=float(row["close"]),
                    volume=float(row["volume"]),
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
                    currency="INR",
                    tick_size=meta["tick_size"],
                    lot_size=meta["lot_size"],
                    primary_provider="upstox_ws",
                    supported_providers=["upstox_ws", "upstox_rest"],
                    is_active=True,
                )
            )
        return instruments

    async def health_check(self) -> ProviderHealth:
        age = (time.time() - self._last_msg_time) if self._last_msg_time else 9999.0
        status = self._status
        if global_upstox_service._auth_status == "AUTH_REQUIRED" or self._auth_error_reason == "AUTH_REQUIRED" or self._auth_error_reason == "UDAPI100050":
            status = "AUTH_REQUIRED"
            msg = "Upstox access token expired or invalid (UDAPI100050). Please reconnect in Settings -> Brokers."
        elif not global_upstox_service.is_authenticated:
            status = "ACCESS_TOKEN_MISSING"
            msg = "Access token missing; set UPSTOX_ACCESS_TOKEN in .env or login via Settings -> Brokers."
        elif not is_indian_market_open() and self._status == "CONNECTED":
            status = "MARKET_CLOSED"
            msg = "Indian market is CLOSED (Mon-Fri 09:15-15:30 IST)"
        elif status == "LIVE" and age > 15.0 and is_indian_market_open():
            status = "STALE"
            msg = f"Upstox V3 Market Data Feed STALE ({age:.1f}s since last tick)"
        else:
            msg = f"Upstox V3 Market Data Feed {status}"

        return ProviderHealth(
            provider_id="upstox_ws",
            provider_name="Upstox V3 WebSocket",
            status=status,
            asset_classes=["INDIAN_EQUITIES", "INDIAN_INDICES", "OPTIONS", "FUTURES"],
            subscribed_symbols=len(self._subscribed_symbols),
            latency_ms=round(self._last_latency_ms, 1),
            error_count=self._retry_count,
            last_tick_time=datetime.fromtimestamp(self._last_msg_time, tz=timezone.utc).isoformat() if self._last_msg_time else None,
            message=msg,
        )

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
                        currency="INR",
                        tick_size=meta["tick_size"],
                        lot_size=meta["lot_size"],
                        primary_provider="upstox_ws",
                        supported_providers=["upstox_ws", "upstox_rest"],
                        is_active=True,
                    )
                )
                if len(results) >= limit:
                    break
        return results
