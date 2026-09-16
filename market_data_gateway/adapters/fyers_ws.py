"""
FYERS API v3 Market Data WebSocket Adapter
==========================================
Authoritative WebSocket stream adapter for FYERS API v3.
Features:
- Connects to official FYERS Data WebSocket (wss://socket.fyers.in/service/v3/data/feed).
- Real-time token authentication ("{app_id}:{access_token}").
- Supports dynamic subscription / unsubscription up to 5000 symbols.
- Dual Feed Modes: LITE (LTP-only) and SYMBOL_UPDATE (Full OHLCV, Depth, OI).
- Bounded exponential backoff reconnection and ping-pong heartbeat.
- Strict token-expiry detection (AUTH_EXPIRED vs DISCONNECTED).
- Fully normalized to canonical MarketTick & NormalizedQuote contracts.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import ssl
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

try:
    import certifi
    SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except Exception:
    SSL_CONTEXT = ssl.create_default_context()

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
from market_data_gateway.models.tick import MarketTick
from market_data_gateway.models.feed_status import FeedState
from market_data_gateway.normalizers.fyers_normalizer import FyersNormalizer
from market_data_gateway.core.reconnect import ReconnectPolicy
from market_data_gateway.core.metrics import global_metrics
from market_data_gateway.subscriptions.resolver import global_instrument_resolver

logger = logging.getLogger("MDGateway.FyersWS")


class FyersWSAdapter(BaseProviderAdapter):
    """Official FYERS API v3 Market Data WebSocket Adapter."""

    def __init__(self, app_id: Optional[str] = None, access_token: Optional[str] = None):
        super().__init__("fyers_ws", "FYERS API v3 WebSocket")
        self._ws = None
        self._ws_task: Optional[asyncio.Task] = None
        self._running = False
        self._reconnect_policy = ReconnectPolicy(initial_backoff_sec=1.0, max_backoff_sec=30.0)

        # Credentials & Configuration
        self._app_id = (app_id or os.getenv("FYERS_APP_ID") or os.getenv("FYERS_CLIENT_ID") or "").strip()
        self._access_token = (access_token or os.getenv("FYERS_ACCESS_TOKEN") or "").strip()
        self._ws_url = os.getenv("FYERS_WS_URL", "wss://socket.fyers.in/service/v3/data/feed")

        # Subscription State Tracking
        self._active_subscriptions: Set[str] = set()
        self._requested_subscriptions: Set[str] = set()
        self._pending_subscriptions: Set[str] = set()
        self._failed_subscriptions: Set[str] = set()
        self._symbol_modes: Dict[str, str] = {}  # symbol -> "LTP" or "FULL"

        # Diagnostic & Metric Trackers
        self._last_tick_time: Optional[float] = None
        self._last_latency_ms: float = 0.0
        self._quote_cache: Dict[str, NormalizedQuote] = {}
        self._raw_debug = os.getenv("RAW_FEED_DEBUG", "false").lower() == "true"

    @property
    def is_configured(self) -> bool:
        return bool(self._app_id and self._access_token)

    def _get_auth_token(self) -> str:
        """Returns the FYERS API v3 auth string format: '{app_id}:{access_token}'."""
        if ":" in self._access_token:
            return self._access_token
        return f"{self._app_id}:{self._access_token}"

    # ─── Lifecycle Methods ───────────────────────────────────────────────────

    async def connect(self) -> None:
        if not WS_AVAILABLE:
            self._status = "NOT_CONFIGURED"
            logger.warning("websockets library not available. FYERS feed disabled.")
            return

        if not self.is_configured:
            self._status = "NOT_CONFIGURED"
            logger.info("FYERS credentials not configured (Set FYERS_APP_ID and FYERS_ACCESS_TOKEN).")
            return

        if self._running and self._ws is not None:
            return

        self._running = True
        self._status = "CONNECTING"
        if self._ws_task is None or self._ws_task.done():
            self._ws_task = asyncio.create_task(self._connection_loop())

    async def disconnect(self) -> None:
        self._running = False
        self._status = "DISCONNECTED"
        if self._ws is not None:
            try:
                await self._ws.close()
            except Exception:
                pass
            self._ws = None

        if self._ws_task and not self._ws_task.done():
            self._ws_task.cancel()
            try:
                await self._ws_task
            except asyncio.CancelledError:
                pass

    # ─── Connection Loop & Ingestion ─────────────────────────────────────────

    async def _connection_loop(self) -> None:
        """Manages lifecycle, ping-pong heartbeat, reconnection backoff, and subscriptions."""
        metrics = global_metrics.get_provider("fyers")

        while self._running:
            try:
                auth_str = self._get_auth_token()
                headers = {"Authorization": auth_str}

                logger.info("Connecting to FYERS Data WebSocket: %s", self._ws_url)

                async with websockets.connect(
                    self._ws_url,
                    extra_headers=headers,
                    ssl=SSL_CONTEXT,
                    ping_interval=20,
                    ping_timeout=10,
                    close_timeout=5,
                ) as ws:
                    self._ws = ws
                    self._status = "LIVE"
                    self._reconnect_policy.reset()
                    logger.info("[OK] Connected to FYERS Data WebSocket.")

                    # Resubscribe to active symbols
                    await self._resubscribe_all()

                    # Message Ingestion Loop
                    async for message in ws:
                        if not self._running:
                            break

                        await self._handle_raw_message(message)

            except ConnectionClosed as cc:
                metrics.record_connection_error()
                logger.warning("FYERS WS connection closed (code: %s, reason: %s)", cc.code, cc.reason)
                if cc.code in (4001, 4002, 4003, 401, 403):
                    self._status = "AUTH_EXPIRED"
                    logger.error("FYERS authentication rejected / token expired. Please refresh FYERS_ACCESS_TOKEN.")
                    await asyncio.sleep(10.0)
                else:
                    self._status = "DISCONNECTED"

            except Exception as exc:
                metrics.record_connection_error()
                logger.error("FYERS WS connection error: %s", exc)
                self._status = "DISCONNECTED"

            finally:
                self._ws = None

            if self._running and self._status != "AUTH_EXPIRED":
                metrics.record_reconnect()
                await self._reconnect_policy.wait_before_reconnect("FYERS")

    # ─── Message Parsing & Normalization ─────────────────────────────────────

    async def _handle_raw_message(self, message: Any) -> None:
        metrics = global_metrics.get_provider("fyers")
        received_at = datetime.now(timezone.utc).isoformat()

        try:
            if isinstance(message, str):
                data = json.loads(message)
                if self._raw_debug:
                    logger.debug("FYERS WS Raw JSON: %s", data)

                # Process single tick or list of ticks
                if isinstance(data, list):
                    for item in data:
                        self._process_single_payload(item, received_at)
                elif isinstance(data, dict):
                    # Check for FYERS system / response messages
                    if data.get("s") == "ok" or data.get("type") == "sub":
                        logger.debug("FYERS subscription ack: %s", data)
                    elif "symbol" in data or "n" in data or "d" in data:
                        payload = data.get("d") if "d" in data and isinstance(data["d"], dict) else data
                        self._process_single_payload(payload, received_at)

            elif isinstance(message, bytes):
                # Binary frame processing: Parse standard FYERS 72-byte or packed frame if binary mode
                metrics.record_tick_received()
                logger.debug("FYERS binary frame received: %d bytes", len(message))

        except Exception as e:
            metrics.record_parse_error()
            logger.error("FYERS message processing error: %s", e)

    def _process_single_payload(self, raw_item: Dict[str, Any], received_at: str) -> None:
        metrics = global_metrics.get_provider("fyers")
        tick = FyersNormalizer.normalize_tick(raw_item, received_at=received_at)
        if not tick or not tick.symbol:
            metrics.record_tick_dropped()
            return

        metrics.record_tick_received(latency_ms=tick.feedLatencyMs)
        metrics.record_tick_processed()

        quote = FyersNormalizer.to_normalized_quote(tick)
        sym = tick.symbol
        self._last_tick_time = time.monotonic()
        self._status = "LIVE"

        # Cache quotes under canonical name and provider symbol
        self._quote_cache[sym] = quote
        self._quote_cache[sym.upper()] = quote
        self._quote_cache[f"NSE:{sym}"] = quote
        if tick.providerInstrumentId:
            self._quote_cache[tick.providerInstrumentId] = quote

        self._emit(quote)

    # ─── Subscription Management ─────────────────────────────────────────────

    async def subscribe(self, symbols: List[str], mode: str = "LTP") -> None:
        """
        Dynamically subscribes to symbols without disconnecting.
        Maps canonical symbols to FYERS symbols (e.g. 'NIFTY' -> 'NSE:NIFTY50-INDEX').
        """
        if not symbols:
            return

        fyers_symbols = []
        for s in symbols:
            f_sym = global_instrument_resolver.get_provider_symbol(s, "fyers")
            fyers_symbols.append(f_sym)
            self._requested_subscriptions.add(f_sym)
            self._symbol_modes[f_sym] = mode

        if self._ws is not None and self._status == "LIVE":
            payload = {
                "T": "SUB_DATA",
                "SUB_T": 1 if mode == "LTP" else 0, # 1: Lite/LTP, 0: Full/SymbolUpdate
                "symbols": fyers_symbols,
            }
            try:
                await self._ws.send(json.dumps(payload))
                self._active_subscriptions.update(fyers_symbols)
                self._subscribed_symbols.update(symbols)
                logger.info("Subscribed %d instruments on FYERS WebSocket (%s mode)", len(fyers_symbols), mode)
            except Exception as e:
                self._failed_subscriptions.update(fyers_symbols)
                logger.error("Failed to send FYERS subscription: %s", e)
        else:
            self._pending_subscriptions.update(fyers_symbols)

    async def unsubscribe(self, symbols: List[str]) -> None:
        if not symbols:
            return

        fyers_symbols = [global_instrument_resolver.get_provider_symbol(s, "fyers") for s in symbols]
        for s in fyers_symbols:
            self._active_subscriptions.discard(s)
            self._requested_subscriptions.discard(s)
            self._pending_subscriptions.discard(s)

        for s in symbols:
            self._subscribed_symbols.discard(s)

        if self._ws is not None and self._status == "LIVE":
            payload = {
                "T": "UNSUB_DATA",
                "symbols": fyers_symbols,
            }
            try:
                await self._ws.send(json.dumps(payload))
                logger.info("Unsubscribed %d instruments from FYERS WebSocket", len(fyers_symbols))
            except Exception as e:
                logger.error("Failed to send FYERS unsubscription: %s", e)

    async def _resubscribe_all(self) -> None:
        """Restores all active and requested subscriptions upon reconnection."""
        all_syms = list(self._active_subscriptions | self._requested_subscriptions | self._pending_subscriptions)
        if all_syms and self._ws is not None:
            # Group by mode
            ltp_syms = [s for s in all_syms if self._symbol_modes.get(s, "LTP") == "LTP"]
            full_syms = [s for s in all_syms if self._symbol_modes.get(s) == "FULL"]

            if ltp_syms:
                await self._ws.send(json.dumps({"T": "SUB_DATA", "SUB_T": 1, "symbols": ltp_syms}))
            if full_syms:
                await self._ws.send(json.dumps({"T": "SUB_DATA", "SUB_T": 0, "symbols": full_syms}))

            self._active_subscriptions.update(all_syms)
            self._pending_subscriptions.clear()
            logger.info("Restored %d subscriptions on FYERS WebSocket", len(all_syms))

    # ─── Data Access & Historical Retrieval ──────────────────────────────────

    async def get_snapshot(self, symbols: List[str]) -> Dict[str, NormalizedQuote]:
        result = {}
        for s in symbols:
            clean = s.strip()
            clean_u = clean.upper()
            if clean in self._quote_cache:
                result[s] = self._quote_cache[clean]
            elif clean_u in self._quote_cache:
                result[s] = self._quote_cache[clean_u]
            else:
                f_sym = global_instrument_resolver.get_provider_symbol(clean, "fyers")
                if f_sym in self._quote_cache:
                    result[s] = self._quote_cache[f_sym]
        return result

    async def get_instruments(self) -> List[CanonicalInstrument]:
        instruments = []
        try:
            from market_data_gateway.subscriptions.resolver import MASTER_INSTRUMENTS
            for sym, meta in MASTER_INSTRUMENTS.items():
                if meta.get("fyers_symbol"):
                    instruments.append(
                        CanonicalInstrument(
                            canonical_symbol=sym,
                            display_name=meta.get("display_name", sym),
                            asset_class=meta.get("asset_class", "INDIAN_EQUITIES"),
                            exchange="NSE",
                            mic_code="XNSE",
                            region="IN",
                            currency="INR",
                            timezone="Asia/Kolkata",
                            lot_size=meta.get("lot_size", 1),
                            tick_size=meta.get("tick_size", 0.05),
                            provider_symbols={"fyers": meta["fyers_symbol"]},
                            is_active=True,
                        )
                    )
        except Exception:
            pass
        return instruments

    async def health_check(self) -> ProviderHealth:
        now_iso = datetime.now(timezone.utc).isoformat()
        metrics = global_metrics.get_provider("fyers")

        return ProviderHealth(
            provider_id="fyers_ws",
            provider_name="FYERS API v3 WebSocket",
            status=self._status,
            asset_classes=["INDIAN_EQUITIES", "INDIAN_INDICES", "OPTIONS", "FUTURES"],
            subscribed_symbols=len(self._active_subscriptions),
            latency_ms=round(self._last_latency_ms, 1),
            error_count=self._error_count,
            last_tick_time=datetime.fromtimestamp(self._last_tick_time, timezone.utc).isoformat() if self._last_tick_time else None,
            message="Operational and streaming real-time market data" if self._status == "LIVE" else ("Authentication required — set FYERS_ACCESS_TOKEN in .env" if self._status == "NOT_CONFIGURED" else f"Status: {self._status}"),
            auth_status="HEALTHY" if self.is_configured and self._status != "AUTH_EXPIRED" else ("EXPIRED" if self._status == "AUTH_EXPIRED" else "NOT_CONFIGURED"),
            rest_status="HEALTHY" if self.is_configured else "NOT_CONFIGURED",
            stream_status="CONNECTED" if self._status == "LIVE" else "DISCONNECTED",
            capabilities={"live_quotes": True, "orderbook_depth": True, "derivatives": True, "greeks": False},
        )
