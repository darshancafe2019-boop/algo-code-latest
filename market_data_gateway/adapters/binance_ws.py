"""
Binance WebSocket Adapter
=========================
Persistent, auto-reconnecting WebSocket feed for Binance crypto spot.
Uses Binance combined-stream endpoint (public, no API key required for tickers).
"""
from __future__ import annotations

import asyncio
import json
import logging
import math
import random
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

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

logger = logging.getLogger("MDGateway.BinanceWS")

BINANCE_WS_BASE = "wss://stream.binance.com:9443/stream"
BINANCE_REST_BASE = "https://api.binance.com/api/v3"
MAX_STREAMS_PER_CONNECTION = 200
MAX_BACKOFF_SEC = 60.0


def _canonical_to_binance(symbol: str) -> Optional[str]:
    """Convert 'BTC/USDT' -> 'btcusdt' for Binance stream naming."""
    if "/" in symbol:
        parts = symbol.split("/")
        if len(parts) == 2:
            return (parts[0] + parts[1]).lower()
    # Already concatenated format e.g. "BTCUSDT"
    return symbol.lower()


def _binance_to_canonical(raw_symbol: str) -> str:
    """Convert 'BTCUSDT' -> 'BTC/USDT' (best-effort)."""
    s = raw_symbol.upper()
    for quote in ["USDT", "USDC", "BTC", "ETH", "BNB", "BUSD"]:
        if s.endswith(quote) and len(s) > len(quote):
            return f"{s[:-len(quote)]}/{quote}"
    return s


class BinanceWSAdapter(BaseProviderAdapter):
    """
    Persistent Binance WebSocket ticker adapter.
    Subscribes to combined @ticker streams. Reconnects with exponential backoff + jitter.
    No API key required — uses public market data endpoints.
    """

    def __init__(self):
        super().__init__("binance_ws", "Binance WebSocket")
        self._ws = None
        self._ws_task: Optional[asyncio.Task] = None
        self._running = False
        self._retry_count = 0
        self._last_msg_time: float = 0.0
        # Cache of latest quotes for REST snapshot fallback
        self._quote_cache: Dict[str, NormalizedQuote] = {}

    # ─── Connection lifecycle ─────────────────────────────────────────────────

    async def connect(self) -> None:
        if not WS_AVAILABLE:
            logger.error("websockets package not installed. Run: pip install websockets")
            self._status = "DISCONNECTED"
            return
        self._running = True
        self._status = "LIVE"
        logger.info("BinanceWSAdapter initialized (lazy WS connection on first subscribe)")

    async def disconnect(self) -> None:
        self._running = False
        if self._ws_task and not self._ws_task.done():
            self._ws_task.cancel()
            try:
                await self._ws_task
            except asyncio.CancelledError:
                pass
        self._status = "DISCONNECTED"
        logger.info("BinanceWSAdapter disconnected")

    # ─── Subscription management ──────────────────────────────────────────────

    async def subscribe(self, symbols: List[str]) -> None:
        new_syms = [s for s in symbols if s not in self._subscribed_symbols]
        if not new_syms:
            return
        for s in new_syms:
            self._subscribed_symbols.add(s)
        logger.info("Subscribed %d new symbols. Total: %d", len(new_syms), len(self._subscribed_symbols))
        # Restart WS task with updated subscription set
        await self._restart_ws()

    async def unsubscribe(self, symbols: List[str]) -> None:
        for s in symbols:
            self._subscribed_symbols.discard(s)
            self._quote_cache.pop(s, None)
        logger.info("Unsubscribed %d symbols. Remaining: %d", len(symbols), len(self._subscribed_symbols))
        if not self._subscribed_symbols:
            await self._stop_ws()
        else:
            await self._restart_ws()

    # ─── Data fetching ────────────────────────────────────────────────────────

    async def get_snapshot(self, symbols: List[str]) -> Dict[str, NormalizedQuote]:
        """Return cached quotes when available; fall back to REST for uncached."""
        result: Dict[str, NormalizedQuote] = {}
        need_rest: List[str] = []

        for sym in symbols:
            if sym in self._quote_cache:
                result[sym] = self._quote_cache[sym]
            else:
                need_rest.append(sym)

        if need_rest:
            rest_quotes = await self._rest_snapshot(need_rest)
            result.update(rest_quotes)

        return result

    async def get_history(
        self,
        symbol: str,
        timeframe: str,
        from_dt: datetime,
        to_dt: datetime,
    ) -> List[OHLCVCandle]:
        """Fetch OHLCV candles via Binance REST klines endpoint."""
        import aiohttp

        interval_map = {
            "1m": "1m", "3m": "3m", "5m": "5m", "15m": "15m",
            "30m": "30m", "1h": "1h", "4h": "4h", "1d": "1d", "1w": "1w",
        }
        interval = interval_map.get(timeframe, "1h")
        raw_sym = _canonical_to_binance(symbol).upper()
        start_ms = int(from_dt.timestamp() * 1000)
        end_ms = int(to_dt.timestamp() * 1000)

        candles: List[OHLCVCandle] = []
        url = f"{BINANCE_REST_BASE}/klines"
        params = {"symbol": raw_sym, "interval": interval, "startTime": start_ms, "endTime": end_ms, "limit": 1000}

        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                async with session.get(url, params=params) as resp:
                    data = await resp.json()
                    for row in data:
                        ts = datetime.fromtimestamp(row[0] / 1000, tz=timezone.utc).isoformat()
                        candles.append(OHLCVCandle(
                            symbol=symbol, exchange="BINANCE", provider="binance_ws",
                            timeframe=timeframe, timestamp=ts,
                            open=float(row[1]), high=float(row[2]), low=float(row[3]),
                            close=float(row[4]), volume=float(row[5]),
                            is_closed=True,
                        ))
        except Exception as exc:
            logger.error("Binance history fetch error for %s: %s", symbol, exc)

        return candles

    async def get_instruments(self) -> List[CanonicalInstrument]:
        """Return a subset of popular crypto instruments traded on Binance."""
        # The canonical registry provides the full catalog; this is just validation
        return []

    async def health_check(self) -> ProviderHealth:
        age = time.time() - self._last_msg_time if self._last_msg_time else 9999.0
        is_stale = age > 15.0
        status = self._status
        if status == "LIVE" and is_stale and self._subscribed_symbols:
            status = "STALE"
        return ProviderHealth(
            provider_id="binance_ws",
            provider_name="Binance WebSocket",
            status=status,
            asset_classes=["CRYPTO"],
            subscribed_symbols=len(self._subscribed_symbols),
            latency_ms=round(self._last_latency_ms, 1) if hasattr(self, "_last_latency_ms") else 0.0,
            error_count=self._error_count,
            last_tick_time=datetime.fromtimestamp(self._last_msg_time, tz=timezone.utc).isoformat() if self._last_msg_time else None,
            message="Public WebSocket stream — no API key required",
        )

    # ─── WebSocket management ─────────────────────────────────────────────────

    async def _restart_ws(self) -> None:
        await self._stop_ws()
        if self._subscribed_symbols and self._running:
            self._ws_task = asyncio.create_task(self._ws_loop())

    async def _stop_ws(self) -> None:
        if self._ws_task and not self._ws_task.done():
            self._ws_task.cancel()
            try:
                await asyncio.wait_for(self._ws_task, timeout=3.0)
            except (asyncio.CancelledError, asyncio.TimeoutError):
                pass

    async def _ws_loop(self) -> None:
        """Main WebSocket reconnection loop with exponential backoff."""
        self._retry_count = 0
        while self._running and self._subscribed_symbols:
            stream_names = [
                f"{_canonical_to_binance(s)}@ticker"
                for s in list(self._subscribed_symbols)[:MAX_STREAMS_PER_CONNECTION]
            ]
            ws_url = f"{BINANCE_WS_BASE}?streams={'/'.join(stream_names)}"
            logger.info("Connecting to Binance WS with %d streams (attempt %d)",
                        len(stream_names), self._retry_count + 1)
            try:
                async with websockets.connect(
                    ws_url,
                    ping_interval=20,
                    ping_timeout=10,
                    close_timeout=5,
                ) as ws:
                    self._ws = ws
                    self._retry_count = 0
                    self._status = "LIVE"
                    logger.info("Binance WS connected — %d streams active", len(stream_names))
                    async for raw_msg in ws:
                        if not self._running:
                            break
                        self._process_message(raw_msg)

            except asyncio.CancelledError:
                break
            except Exception as exc:
                self._record_error(str(exc))
                if not self._running:
                    break
                backoff = min(MAX_BACKOFF_SEC, (2 ** self._retry_count) + random.uniform(0, 1))
                self._retry_count += 1
                logger.warning("Binance WS error (%s). Retrying in %.1fs", exc, backoff)
                await asyncio.sleep(backoff)

        self._ws = None
        logger.info("Binance WS loop exited")

    def _process_message(self, raw: str) -> None:
        """Parse a combined stream message and emit a NormalizedQuote."""
        try:
            msg = json.loads(raw)
            data = msg.get("data", msg)
            if data.get("e") != "24hrTicker":
                return

            recv_ts = datetime.now(timezone.utc)
            recv_iso = recv_ts.isoformat()
            event_ts_ms = data.get("E", 0)
            event_iso = datetime.fromtimestamp(event_ts_ms / 1000, tz=timezone.utc).isoformat() if event_ts_ms else recv_iso

            latency_ms = (recv_ts.timestamp() * 1000 - event_ts_ms) if event_ts_ms else 0.0

            raw_sym = data.get("s", "")
            canon_sym = _binance_to_canonical(raw_sym)

            quote = NormalizedQuote(
                symbol=canon_sym,
                exchange="BINANCE",
                provider="binance_ws",
                last_price=float(data.get("c", 0)),
                bid=float(data.get("b", 0)),
                ask=float(data.get("a", 0)),
                volume=float(data.get("v", 0)),
                high=float(data.get("h", 0)) or None,
                low=float(data.get("l", 0)) or None,
                open=float(data.get("o", 0)) or None,
                close=float(data.get("c", 0)) or None,
                change_pct=float(data.get("P", 0)) or None,
                event_timestamp=event_iso,
                received_timestamp=recv_iso,
                feed_latency_ms=round(latency_ms, 2),
                data_mode="REAL_TIME",
            )
            self._quote_cache[canon_sym] = quote
            self._last_msg_time = time.time()
            self._last_latency_ms = latency_ms
            self._emit(quote)
        except Exception as exc:
            logger.debug("Binance message parse error: %s | raw: %.80s", exc, raw)

    async def _rest_snapshot(self, symbols: List[str]) -> Dict[str, NormalizedQuote]:
        """Fetch 24hr ticker via REST for symbols not in WS cache."""
        import aiohttp

        result: Dict[str, NormalizedQuote] = {}
        if not symbols:
            return result

        url = f"{BINANCE_REST_BASE}/ticker/24hr"
        recv_ts = datetime.now(timezone.utc).isoformat()

        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                for sym in symbols:
                    raw_sym = _canonical_to_binance(sym).upper()
                    try:
                        async with session.get(url, params={"symbol": raw_sym}) as resp:
                            if resp.status == 200:
                                data = await resp.json()
                                quote = NormalizedQuote(
                                    symbol=sym,
                                    exchange="BINANCE",
                                    provider="binance_ws",
                                    last_price=float(data.get("lastPrice", 0)),
                                    bid=float(data.get("bidPrice", 0)),
                                    ask=float(data.get("askPrice", 0)),
                                    volume=float(data.get("volume", 0)),
                                    high=float(data.get("highPrice", 0)) or None,
                                    low=float(data.get("lowPrice", 0)) or None,
                                    open=float(data.get("openPrice", 0)) or None,
                                    change_pct=float(data.get("priceChangePercent", 0)) or None,
                                    event_timestamp=recv_ts,
                                    received_timestamp=recv_ts,
                                    data_mode="REAL_TIME",
                                )
                                self._quote_cache[sym] = quote
                                result[sym] = quote
                    except Exception:
                        pass
        except Exception as exc:
            logger.error("Binance REST snapshot error: %s", exc)

        return result
