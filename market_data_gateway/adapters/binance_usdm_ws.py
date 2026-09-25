"""
Binance USD-M Futures WebSocket Adapter
========================================
Dedicated, auto-reconnecting WebSocket adapter for Binance USD-Margined Futures.
Connects to wss://fstream.binance.com/stream for public market data:
- <symbol>@ticker (24hr rolling window ticker statistics)
- <symbol>@markPrice@1s (Mark price and funding rate)
- <symbol>@depth20@100ms (Top 20 bids and asks)
- <symbol>@aggTrade (Aggregated real-time trades)

All quotes are strictly labeled with:
  provider = "binance_usdm"
  exchange = "BINANCE"
  segment  = "CRYPTO_PERPETUAL"
  margin   = "USDT"
"""
from __future__ import annotations

import asyncio
import json
import logging
import math
import random
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
    ProviderHealth,
)

logger = logging.getLogger("MDGateway.BinanceUSDM")

BINANCE_USDM_WS_BASE = "wss://fstream.binance.com/stream"
BINANCE_USDM_REST_BASE = "https://fapi.binance.com/fapi/v1"
MAX_STREAMS_PER_CONNECTION = 200
MAX_BACKOFF_SEC = 60.0

DEFAULT_USDM_SYMBOLS = [
    "BTCUSDT",
    "ETHUSDT",
    "SOLUSDT",
    "BNBUSDT",
    "XRPUSDT",
    "DOGEUSDT",
    "ADAUSDT",
    "AVAXUSDT",
    "LINKUSDT",
    "NEARUSDT",
    "SUIUSDT",
    "PEPEUSDT",
]


def _canonical_to_usdm(symbol: str) -> str:
    """Convert 'BTC/USDT' or 'BINANCE:BTCUSDT' or 'BTCUSDT' -> 'btcusdt' for stream naming."""
    clean = symbol.strip().upper()
    if clean.startswith("BINANCE:"):
        clean = clean[len("BINANCE:"):]
    if clean.endswith(":PERPETUAL") or clean.endswith(":PERP") or clean.endswith(":USDT"):
        clean = clean.split(":")[0]
    return clean.replace("/", "").replace("-", "").lower()


def _usdm_to_canonical(raw_symbol: str) -> str:
    """Convert 'BTCUSDT' -> 'BTC/USDT:USDT'."""
    s = raw_symbol.upper()
    if s.endswith("USDT") and len(s) > 4:
        return f"{s[:-4]}/USDT:USDT"
    return f"{s}:USDT"


class BinanceUSDMWSAdapter(BaseProviderAdapter):
    """
    Persistent Binance USD-M Futures WebSocket ticker adapter.
    """

    def __init__(self):
        super().__init__("binance_usdm", "Binance USD-M Futures")
        self._ws = None
        self._ws_task: Optional[asyncio.Task] = None
        self._running = False
        self._retry_count = 0
        self._last_msg_time: float = 0.0
        self._quote_cache: Dict[str, NormalizedQuote] = {}
        self._depth_cache: Dict[str, Dict[str, Any]] = {}
        self._recent_trades: List[Dict[str, Any]] = []

    async def connect(self) -> None:
        if not WS_AVAILABLE:
            logger.error("websockets package not installed. Run: pip install websockets")
            self._status = "DISCONNECTED"
            return
        self._running = True
        self._status = "LIVE"
        logger.info("BinanceUSDMWSAdapter initialized.")

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
        self._status = "DISCONNECTED"
        logger.info("BinanceUSDMWSAdapter disconnected.")

    async def subscribe(self, symbols: List[str]) -> None:
        new_streams = set()
        for s in symbols:
            clean = _canonical_to_usdm(s)
            if clean:
                self._subscribed_symbols.add(s)
                new_streams.add(f"{clean}@ticker")
                new_streams.add(f"{clean}@markPrice@1s")
                new_streams.add(f"{clean}@depth20@100ms")
                new_streams.add(f"{clean}@aggTrade")

        if self._ws and not self._ws.closed and new_streams:
            sub_msg = {
                "method": "SUBSCRIBE",
                "params": list(new_streams),
                "id": int(time.time() * 1000),
            }
            try:
                await self._ws.send(json.dumps(sub_msg))
            except Exception as e:
                logger.warning(f"Error subscribing on active USD-M WS: {e}")

        if self._running and (self._ws_task is None or self._ws_task.done()):
            self._ws_task = asyncio.create_task(self._run_ws_loop())

    async def unsubscribe(self, symbols: List[str]) -> None:
        unsub_streams = set()
        for s in symbols:
            clean = _canonical_to_usdm(s)
            if clean:
                self._subscribed_symbols.discard(s)
                unsub_streams.add(f"{clean}@ticker")
                unsub_streams.add(f"{clean}@markPrice@1s")
                unsub_streams.add(f"{clean}@depth20@100ms")
                unsub_streams.add(f"{clean}@aggTrade")

        if self._ws and not self._ws.closed and unsub_streams:
            unsub_msg = {
                "method": "UNSUBSCRIBE",
                "params": list(unsub_streams),
                "id": int(time.time() * 1000),
            }
            try:
                await self._ws.send(json.dumps(unsub_msg))
            except Exception as e:
                logger.warning(f"Error unsubscribing on USD-M WS: {e}")

    async def get_snapshot(self, symbols: List[str]) -> Dict[str, NormalizedQuote]:
        result = {}
        for s in symbols:
            clean = _canonical_to_usdm(s).upper()
            canonical_id = _usdm_to_canonical(clean)
            if canonical_id in self._quote_cache:
                result[s] = self._quote_cache[canonical_id]
            elif s in self._quote_cache:
                result[s] = self._quote_cache[s]
            elif clean in self._quote_cache:
                result[s] = self._quote_cache[clean]
        return result

    async def get_instruments(self) -> List[CanonicalInstrument]:
        instruments = []
        for sym in DEFAULT_USDM_SYMBOLS:
            base = sym.replace("USDT", "")
            canonical_sym = _usdm_to_canonical(sym)
            instruments.append(
                CanonicalInstrument(
                    canonical_symbol=canonical_sym,
                    display_name=f"{base}/USDT Perpetual",
                    asset_class="Crypto_Perpetual",
                    exchange="BINANCE",
                    mic_code="BNCF",
                    region="GLOBAL",
                    currency="USDT",
                    timezone="UTC",
                    tick_size=0.1 if "BTC" in sym or "ETH" in sym else 0.001,
                    lot_size=0.001 if "BTC" in sym or "ETH" in sym else 1.0,
                )
            )
        return instruments

    async def health_check(self) -> ProviderHealth:
        age_ms = (time.time() - self._last_msg_time) * 1000.0 if self._last_msg_time > 0 else 0.0
        is_live = self._running and self._last_msg_time > 0 and age_ms < 10000
        now_iso = datetime.now(timezone.utc).isoformat()
        return ProviderHealth(
            provider_id="binance_usdm",
            provider_name="Binance USD-M Futures",
            status="LIVE" if is_live else ("CONNECTING" if self._running else "DISCONNECTED"),
            last_tick_time=datetime.fromtimestamp(self._last_msg_time, timezone.utc).isoformat() if self._last_msg_time > 0 else None,
            last_heartbeat=now_iso,
            error_count=self._retry_count,
            latency_ms=round(age_ms, 1),
            subscribed_symbols=len(self._subscribed_symbols),
            asset_classes=["Crypto_Perpetual"],
        )

    # ─── Internal WebSocket Runner ────────────────────────────────────────────

    async def _run_ws_loop(self) -> None:
        while self._running:
            try:
                # Build combined stream path
                streams = set()
                targets = self._subscribed_symbols if self._subscribed_symbols else DEFAULT_USDM_SYMBOLS
                for s in targets:
                    clean = _canonical_to_usdm(s)
                    if clean:
                        streams.add(f"{clean}@ticker")
                        streams.add(f"{clean}@markPrice@1s")
                        streams.add(f"{clean}@depth20@100ms")
                        streams.add(f"{clean}@aggTrade")

                stream_path = "/".join(list(streams)[:MAX_STREAMS_PER_CONNECTION])
                uri = f"{BINANCE_USDM_WS_BASE}?streams={stream_path}"

                logger.info(f"Connecting to Binance USD-M WS: {len(streams)} streams")
                async with websockets.connect(uri, ping_interval=20, ping_timeout=10) as ws:
                    self._ws = ws
                    self._status = "LIVE"
                    self._retry_count = 0
                    logger.info("Binance USD-M WebSocket connected.")

                    async for raw_msg in ws:
                        if not self._running:
                            break
                        self._last_msg_time = time.time()
                        try:
                            msg = json.loads(raw_msg)
                            self._handle_stream_message(msg)
                        except Exception as e:
                            logger.debug(f"Error handling USD-M stream payload: {e}")

            except asyncio.CancelledError:
                break
            except Exception as e:
                self._retry_count += 1
                self._status = "RECONNECTING"
                backoff = min(MAX_BACKOFF_SEC, (2 ** min(self._retry_count, 6)) + random.uniform(0.5, 2.0))
                logger.warning(f"Binance USD-M WS error: {e}. Reconnecting in {backoff:.1f}s...")
                await asyncio.sleep(backoff)

    def _handle_stream_message(self, msg: Dict[str, Any]) -> None:
        stream = msg.get("stream", "")
        data = msg.get("data", {})
        if not data:
            return

        e_type = data.get("e", "")

        # 1. 24hr Rolling Ticker
        if e_type == "24hrTicker" or "@ticker" in stream:
            raw_sym = data.get("s", "")
            if not raw_sym:
                return

            canonical_sym = _usdm_to_canonical(raw_sym)
            now_iso = datetime.now(timezone.utc).isoformat()
            evt_time_ms = data.get("E", 0)
            evt_iso = datetime.fromtimestamp(evt_time_ms / 1000.0, timezone.utc).isoformat() if evt_time_ms else now_iso

            ltp = float(data["c"]) if "c" in data and data["c"] is not None else None
            bid = float(data["b"]) if "b" in data and data["b"] is not None else None
            ask = float(data["a"]) if "a" in data and data["a"] is not None else None
            bid_qty = float(data["B"]) if "B" in data and data["B"] is not None else None
            ask_qty = float(data["A"]) if "A" in data and data["A"] is not None else None
            high = float(data["h"]) if "h" in data and data["h"] is not None else None
            low = float(data["l"]) if "l" in data and data["l"] is not None else None
            open_p = float(data["o"]) if "o" in data and data["o"] is not None else None
            volume = float(data["v"]) if "v" in data and data["v"] is not None else None
            quote_vol = float(data["q"]) if "q" in data and data["q"] is not None else None
            change = float(data["p"]) if "p" in data and data["p"] is not None else None
            change_pct = float(data["P"]) if "P" in data and data["P"] is not None else None

            existing = self._quote_cache.get(canonical_sym)
            mark_p = existing.mark_price if existing else None
            idx_p = existing.index_price if existing else None
            funding_r = existing.funding_rate if existing else None
            next_fund_t = existing.next_funding_time if existing else None
            depth_data = self._depth_cache.get(raw_sym)

            quote = NormalizedQuote(
                symbol=canonical_sym,
                exchange="BINANCE",
                provider="binance_usdm",
                segment="CRYPTO_PERPETUAL",
                last_price=ltp,
                bid=bid,
                ask=ask,
                bid_quantity=bid_qty,
                ask_quantity=ask_qty,
                open=open_p,
                high=high,
                low=low,
                volume=volume,
                turnover=quote_vol,
                change=change,
                change_pct=change_pct,
                mark_price=mark_p,
                index_price=idx_p,
                funding_rate=funding_r,
                next_funding_time=next_fund_t,
                event_type="TICK",
                event_timestamp=evt_iso,
                received_timestamp=now_iso,
                data_mode="REAL_TIME",
                status="LIVE",
                depth=depth_data,
            )

            self._quote_cache[canonical_sym] = quote
            self._quote_cache[raw_sym] = quote
            self._emit(quote)

        # 2. Mark Price and Funding Rate
        elif e_type == "markPriceUpdate" or "@markPrice" in stream:
            raw_sym = data.get("s", "")
            if not raw_sym:
                return

            canonical_sym = _usdm_to_canonical(raw_sym)
            mark_p = float(data["p"]) if "p" in data and data["p"] is not None else None
            idx_p = float(data["i"]) if "i" in data and data["i"] is not None else None
            funding_r = float(data["r"]) if "r" in data and data["r"] is not None else None
            next_fund_ms = data.get("T", 0)
            next_fund_iso = datetime.fromtimestamp(next_fund_ms / 1000.0, timezone.utc).isoformat() if next_fund_ms else None

            if canonical_sym in self._quote_cache:
                q = self._quote_cache[canonical_sym]
                q.mark_price = mark_p
                q.index_price = idx_p
                q.funding_rate = funding_r
                q.next_funding_time = next_fund_iso
                if mark_p and idx_p and idx_p > 0:
                    q.basis = round(mark_p - idx_p, 4)
                    q.basis_pct = round((q.basis / idx_p) * 100.0, 4)
                self._emit(q)

        # 3. Order Book Depth L20
        elif "@depth20" in stream:
            raw_sym = stream.split("@")[0].upper()
            canonical_sym = _usdm_to_canonical(raw_sym)
            bids = [{"price": float(b[0]), "quantity": float(b[1])} for b in data.get("bids", [])]
            asks = [{"price": float(a[0]), "quantity": float(a[1])} for a in data.get("asks", [])]
            depth_dict = {"bids": bids, "asks": asks, "timestamp": datetime.now(timezone.utc).isoformat()}
            self._depth_cache[raw_sym] = depth_dict

            if canonical_sym in self._quote_cache:
                q = self._quote_cache[canonical_sym]
                q.depth = depth_dict
                if bids:
                    q.bid = bids[0]["price"]
                    q.bid_quantity = bids[0]["quantity"]
                if asks:
                    q.ask = asks[0]["price"]
                    q.ask_quantity = asks[0]["quantity"]
                self._emit(q)
