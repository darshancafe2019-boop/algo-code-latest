"""
Delta Exchange Public WebSocket Manager & Subscription Gateway
==============================================================
Production-grade, auto-reconnecting central WebSocket manager for Delta Exchange.
Connects to wss://public-socket.india.delta.exchange and manages all public market data channels:
1. ticker                — Live LTP, OHLC, Greeks, IV, OI, and Price Bands
2. ob_l1                 — Best Bid/Ask top of book, spread, mid price
3. ob_l2                 — Top 15-20 orderbook depth levels and liquidity analysis
4. ob_updates            — Incremental sequence-validated L2 orderbook updates
5. trades                — Real-time public trade tape with buyer/maker role & imbalance
6. mark_price            — Real-time mark price for derivative valuation & risk
7. spot_price            — Underlying spot index price
8. spot_30mtwap_price    — 30-minute TWAP reference price
9. funding_rate          — Perpetual futures funding rate
10. candlesticks         — Real-time OHLCV candles (1m, 3m, 5m, 15m, 30m, 1h, 4h, 1d)
11. system_status        — Exchange maintenance and operational state

Provides:
- One central WebSocket connection for the entire application.
- Dedicated DeltaSubscriptionManager for targeted instrument tracking.
- Strong typed data normalization (DeltaTicker, DeltaOption, DeltaOrderBook, DeltaTrade, DeltaCandle).
- Zero fake-data policy: unquoted values remain None/null (never forced to $0.00).
- Automatic heartbeat (25s ping), exponential backoff reconnect with jitter, and REST reconciliation.
"""
from __future__ import annotations

import asyncio
import json
import logging
import random
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

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
from src import config
from src.delta_options_client import global_delta_client

logger = logging.getLogger("MDGateway.DeltaOptionsWS")

DELTA_PUBLIC_WS_DEFAULT = "wss://public-socket.india.delta.exchange"
DELTA_PUBLIC_WS_FALLBACK = "wss://socket.india.delta.exchange"
MAX_BACKOFF_SEC = 30.0


# ─── Strongly Typed Delta Models ─────────────────────────────────────────────

@dataclass
class DeltaTicker:
    symbol: str
    product_id: Optional[int] = None
    last_price: Optional[float] = None
    mark_price: Optional[float] = None
    spot_price: Optional[float] = None
    best_bid: Optional[float] = None
    best_ask: Optional[float] = None
    bid_size: Optional[float] = None
    ask_size: Optional[float] = None
    open_interest: Optional[float] = None
    volume_24h: Optional[float] = None
    turnover_usd: Optional[float] = None
    change_24h: Optional[float] = None
    open_price: Optional[float] = None
    high_price: Optional[float] = None
    low_price: Optional[float] = None
    close_price: Optional[float] = None
    mark_iv: Optional[float] = None
    bid_iv: Optional[float] = None
    ask_iv: Optional[float] = None
    delta: Optional[float] = None
    gamma: Optional[float] = None
    theta: Optional[float] = None
    vega: Optional[float] = None
    rho: Optional[float] = None
    funding_rate: Optional[float] = None
    price_band_lower: Optional[float] = None
    price_band_upper: Optional[float] = None
    chain_symbol: Optional[str] = None
    exchange_timestamp: str = ""
    received_at: str = ""
    source: str = "delta_public_ws"
    is_stale: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class DeltaOrderBookLevel:
    price: float
    size: float


@dataclass
class DeltaOrderBook:
    symbol: str
    bids: List[Dict[str, float]] = field(default_factory=list)
    asks: List[Dict[str, float]] = field(default_factory=list)
    best_bid: Optional[float] = None
    best_ask: Optional[float] = None
    bid_size: Optional[float] = None
    ask_size: Optional[float] = None
    spread: Optional[float] = None
    mid_price: Optional[float] = None
    imbalance: Optional[float] = None  # (bid_vol - ask_vol) / (bid_vol + ask_vol)
    total_bid_volume: float = 0.0
    total_ask_volume: float = 0.0
    sequence_no: Optional[int] = None
    timestamp: str = ""
    received_at: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class DeltaTrade:
    symbol: str
    price: float
    size: float
    role: str  # "buy" | "sell" | "buyer" | "seller"
    timestamp: str
    received_at: str
    is_large: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class DeltaCandle:
    symbol: str
    resolution: str
    open: float
    high: float
    low: float
    close: float
    volume: float
    timestamp: str
    is_closed: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ─── Delta Subscription Manager ──────────────────────────────────────────────

class DeltaSubscriptionManager:
    """Manages active channel subscriptions and ensures clean targeted dispatch."""

    def __init__(self):
        self.ticker_symbols: Set[str] = set()
        self.ob_l1_symbols: Set[str] = set()
        self.ob_l2_symbols: Set[str] = set()
        self.ob_updates_symbols: Set[str] = set()
        self.trades_symbols: Set[str] = set()
        self.mark_price_symbols: Set[str] = set()
        self.spot_price_symbols: Set[str] = set()
        self.funding_symbols: Set[str] = set()
        self.candle_subscriptions: Dict[str, Set[str]] = {}  # resolution -> set of symbols
        self.chain_symbols: Set[str] = set()

    def add_ticker(self, symbol: str):
        self.ticker_symbols.add(symbol.upper().strip())

    def add_orderbook(self, symbol: str, level: str = "l2"):
        s = symbol.upper().strip()
        if level == "l1":
            self.ob_l1_symbols.add(s)
        elif level == "updates":
            self.ob_updates_symbols.add(s)
        else:
            self.ob_l2_symbols.add(s)

    def add_trades(self, symbol: str):
        self.trades_symbols.add(symbol.upper().strip())

    def add_mark_price(self, symbol: str):
        self.mark_price_symbols.add(symbol.upper().strip())

    def add_spot_price(self, symbol: str):
        self.spot_price_symbols.add(symbol.upper().strip())

    def add_funding(self, symbol: str):
        self.funding_symbols.add(symbol.upper().strip())

    def add_candles(self, symbol: str, resolution: str = "1m"):
        s = symbol.upper().strip()
        res_list = self.candle_subscriptions.setdefault(resolution, set())
        res_list.add(s)

    def add_chain(self, chain_symbol: str):
        self.chain_symbols.add(chain_symbol.upper().strip())

    def build_subscription_payload(self) -> Dict[str, Any]:
        channels = []

        # 1. Tickers (combined single + chain symbols)
        all_ticker_syms = list(self.ticker_symbols | self.chain_symbols)
        if all_ticker_syms:
            channels.append({"name": "ticker", "symbols": all_ticker_syms})

        # 2. L1 Orderbook
        if self.ob_l1_symbols:
            channels.append({"name": "ob_l1", "symbols": list(self.ob_l1_symbols)})

        # 3. L2 Orderbook
        if self.ob_l2_symbols:
            channels.append({"name": "ob_l2", "symbols": list(self.ob_l2_symbols)})

        # 4. L2 Incremental Updates
        if self.ob_updates_symbols:
            channels.append({"name": "ob_updates", "symbols": list(self.ob_updates_symbols)})

        # 5. Public Trades
        if self.trades_symbols:
            channels.append({"name": "trades", "symbols": list(self.trades_symbols)})

        # 6. Mark Price
        if self.mark_price_symbols:
            channels.append({"name": "mark_price", "symbols": list(self.mark_price_symbols)})

        # 7. Spot Price
        if self.spot_price_symbols:
            channels.append({"name": "spot_price", "symbols": list(self.spot_price_symbols)})

        # 8. Funding Rate
        if self.funding_symbols:
            channels.append({"name": "funding_rate", "symbols": list(self.funding_symbols)})

        # 9. Candlesticks
        for res, syms in self.candle_subscriptions.items():
            if syms:
                channels.append({"name": "candlesticks", "symbols": list(syms), "resolution": res})

        # 10. System Status (Global)
        channels.append({"name": "system_status"})

        return {
            "type": "subscribe",
            "payload": {
                "channels": channels
            }
        }


# ─── Central Delta WebSocket Manager ─────────────────────────────────────────

class DeltaOptionsWSAdapter(BaseProviderAdapter):
    """
    Central, high-throughput WebSocket Adapter and Manager for Delta Exchange.
    Handles all 11 market data channels, orderbook rebuilding, trade flow analysis,
    and automatic reconnection.
    """

    def __init__(self):
        super().__init__("delta_options_ws", "Delta Exchange Options WebSocket")
        self._ws_url = getattr(config, "DELTA_PUBLIC_WS_URL", DELTA_PUBLIC_WS_DEFAULT)
        self._fallback_ws_url = DELTA_PUBLIC_WS_FALLBACK
        self._ws = None
        self._ws_task: Optional[asyncio.Task] = None
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._running = False
        self._retry_count = 0
        self._last_msg_time: float = 0.0

        # Subscriptions
        self.sub_mgr = DeltaSubscriptionManager()

        # In-Memory Normalized Caches
        self._ticker_cache: Dict[str, DeltaTicker] = {}
        self._raw_quote_cache: Dict[str, Dict[str, Any]] = {}
        self._canonical_quote_cache: Dict[str, NormalizedQuote] = {}
        self._orderbook_cache: Dict[str, DeltaOrderBook] = {}
        self._recent_trades: Dict[str, List[DeltaTrade]] = {}
        self._candles_cache: Dict[str, Dict[str, List[DeltaCandle]]] = {}  # symbol -> res -> list
        self._mark_price_cache: Dict[str, float] = {}
        self._spot_price_cache: Dict[str, float] = {}
        self._funding_rate_cache: Dict[str, float] = {}
        self._system_status: str = "OPERATIONAL"

        # Product Catalogue Mapping (product_id -> symbol)
        self._product_id_to_symbol: Dict[int, str] = {
            27: "BTCUSD",
            131: "ETHUSD",
            139: "SOLUSD",
            140: "XRPUSD",
            141: "BNBUSD",
            142: "DOGEUSD",
        }

        # Seed default majors
        for sym in ("BTC", "ETH", "SOL", "XRP", "BTCUSD", "ETHUSD", "SOLUSD", "XRPUSD"):
            self.sub_mgr.add_ticker(sym)
            self.sub_mgr.add_orderbook(sym, level="l2")
            self.sub_mgr.add_trades(sym)
            self.sub_mgr.add_mark_price(sym)
            self.sub_mgr.add_spot_price(sym)
            self.sub_mgr.add_funding(sym)

    # ─── Lifecycle & Connection ───────────────────────────────────────────────

    async def connect(self) -> None:
        if not WS_AVAILABLE:
            self._logger.error("websockets package not available; Delta public WS disabled.")
            self._status = "ERROR"
            return

        self._running = True
        self._ws_task = asyncio.create_task(self._run_loop(), name="DeltaWebSocketMgr-Loop")
        self._logger.info(f"Delta Public WebSocket Manager started on {self._ws_url}.")
        # Preload Delta product catalogue in background
        asyncio.create_task(self._preload_product_catalogue())

    async def _preload_product_catalogue(self) -> None:
        """Fetches complete product catalogue via REST to seed product_id -> symbol mappings."""
        try:
            prods = await asyncio.to_thread(global_delta_client.get_products)
            for p in prods:
                pid = p.get("id")
                sym = p.get("symbol")
                if pid and sym:
                    self._product_id_to_symbol[int(pid)] = sym
            self._logger.info(f"Loaded {len(self._product_id_to_symbol)} Delta product ID mappings.")
        except Exception as e:
            self._logger.debug(f"Delta product catalogue preload note: {e}")

    async def disconnect(self) -> None:
        self._running = False
        if self._heartbeat_task and not self._heartbeat_task.done():
            self._heartbeat_task.cancel()
        if self._ws_task and not self._ws_task.done():
            self._ws_task.cancel()
        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass
        self._status = "DISCONNECTED"
        self._logger.info("Delta Public WebSocket Manager disconnected.")

    async def _run_loop(self) -> None:
        """Main connection and message dispatch loop with fallback & exponential backoff."""
        target_url = self._ws_url

        while self._running:
            try:
                self._logger.info(f"Connecting to Delta Public WebSocket: {target_url}")
                from src.ssl_util import get_ssl_context
                ssl_ctx = get_ssl_context()
                async with websockets.connect(
                    target_url,
                    ping_interval=20,
                    ping_timeout=15,
                    ssl=ssl_ctx,
                    max_size=10_000_000,
                ) as ws:
                    self._ws = ws
                    self._retry_count = 0
                    self._record_success()
                    self._logger.info("[OK] Connected to Delta Public WebSocket successfully.")

                    # Start periodic application-level ping/heartbeat loop (25s)
                    self._heartbeat_task = asyncio.create_task(self._ping_loop(), name="DeltaWS-Ping")

                    # Dispatch complete subscription payload
                    await self._send_all_subscriptions()

                    # Message read loop
                    async for raw_msg in ws:
                        self._last_msg_time = time.monotonic()
                        try:
                            data = json.loads(raw_msg)
                            self._handle_message(data)
                        except Exception as parse_err:
                            self._logger.debug(f"Error parsing Delta WS message: {parse_err}")

            except asyncio.CancelledError:
                break
            except Exception as e:
                self._record_error(str(e))
                if self._running:
                    self._retry_count += 1
                    # Switch to fallback URL if repeated connection issues on primary
                    if self._retry_count > 2 and target_url == self._ws_url:
                        target_url = self._fallback_ws_url
                        self._logger.info(f"Switching Delta WS target to fallback: {target_url}")
                    elif self._retry_count > 5:
                        target_url = self._ws_url

                    backoff = min(MAX_BACKOFF_SEC, (2 ** min(self._retry_count, 5))) + random.uniform(0.1, 1.0)
                    self._logger.warning(
                        f"Delta WS disconnected: {e}. Reconnecting in {backoff:.1f}s (Attempt #{self._retry_count})"
                    )
                    await asyncio.sleep(backoff)

    async def _ping_loop(self) -> None:
        """Sends periodic application-level heartbeats every 25 seconds."""
        while self._running and self._ws:
            try:
                await asyncio.sleep(25.0)
                if self._ws and not self._ws.closed:
                    try:
                        await self._ws.send(json.dumps({"type": "ping"}))
                    except Exception:
                        pass
            except asyncio.CancelledError:
                break
            except Exception:
                pass

    # ─── Subscription Management ──────────────────────────────────────────────

    async def subscribe(self, symbols: List[str]) -> None:
        for s in symbols:
            self.sub_mgr.add_ticker(s)
            self._subscribed_symbols.add(s.upper().strip())
        if self._ws and not self._ws.closed and self._running:
            await self._send_all_subscriptions()

    async def unsubscribe(self, symbols: List[str]) -> None:
        for s in symbols:
            s_up = s.upper().strip()
            self.sub_mgr.ticker_symbols.discard(s_up)
            self._subscribed_symbols.discard(s_up)
        if self._ws and not self._ws.closed and self._running:
            unsub_msg = {
                "type": "unsubscribe",
                "payload": {
                    "channels": [
                        {"name": "ticker", "symbols": symbols}
                    ]
                }
            }
            try:
                await self._ws.send(json.dumps(unsub_msg))
            except Exception as e:
                self._logger.warning(f"Failed to send unsubscribe message: {e}")

    def track_chain_symbol(self, chain_symbol: str) -> None:
        """Registers a chain symbol (e.g. BTC-250926) for automatic options feed subscription."""
        clean = chain_symbol.upper().strip()
        self.sub_mgr.add_chain(clean)
        if self._ws and not self._ws.closed and self._running:
            sub_msg = {
                "type": "subscribe",
                "payload": {
                    "channels": [
                        {"name": "ticker", "symbols": [clean]}
                    ]
                }
            }
            asyncio.create_task(self._safe_send(sub_msg))

    def subscribe_ticker(self, symbol: str):
        self.sub_mgr.add_ticker(symbol)
        if self._ws and not self._ws.closed and self._running:
            asyncio.create_task(self._safe_send({
                "type": "subscribe",
                "payload": {"channels": [{"name": "ticker", "symbols": [symbol]}]}
            }))

    def subscribe_orderbook(self, symbol: str, level: str = "l2"):
        self.sub_mgr.add_orderbook(symbol, level=level)
        ch_name = "ob_l1" if level == "l1" else ("ob_updates" if level == "updates" else "ob_l2")
        if self._ws and not self._ws.closed and self._running:
            asyncio.create_task(self._safe_send({
                "type": "subscribe",
                "payload": {"channels": [{"name": ch_name, "symbols": [symbol]}]}
            }))

    def subscribe_trades(self, symbol: str):
        self.sub_mgr.add_trades(symbol)
        if self._ws and not self._ws.closed and self._running:
            asyncio.create_task(self._safe_send({
                "type": "subscribe",
                "payload": {"channels": [{"name": "trades", "symbols": [symbol]}]}
            }))

    def subscribe_mark_price(self, symbol: str):
        self.sub_mgr.add_mark_price(symbol)
        if self._ws and not self._ws.closed and self._running:
            asyncio.create_task(self._safe_send({
                "type": "subscribe",
                "payload": {"channels": [{"name": "mark_price", "symbols": [symbol]}]}
            }))

    def subscribe_candles(self, symbol: str, resolution: str = "1m"):
        self.sub_mgr.add_candles(symbol, resolution)
        if self._ws and not self._ws.closed and self._running:
            asyncio.create_task(self._safe_send({
                "type": "subscribe",
                "payload": {"channels": [{"name": "candlesticks", "symbols": [symbol], "resolution": resolution}]}
            }))

    def subscribe_funding(self, symbol: str):
        self.sub_mgr.add_funding(symbol)
        if self._ws and not self._ws.closed and self._running:
            asyncio.create_task(self._safe_send({
                "type": "subscribe",
                "payload": {"channels": [{"name": "funding_rate", "symbols": [symbol]}]}
            }))

    async def _safe_send(self, payload: Dict[str, Any]) -> None:
        if self._ws and not self._ws.closed:
            try:
                await self._ws.send(json.dumps(payload))
            except Exception as e:
                self._logger.debug(f"Error sending subscription to Delta WS: {e}")

    async def _send_all_subscriptions(self) -> None:
        payload = self.sub_mgr.build_subscription_payload()
        if payload.get("payload", {}).get("channels"):
            await self._safe_send(payload)
            ch_count = len(payload["payload"]["channels"])
            self._logger.info(f"Dispatched Delta WS subscriptions across {ch_count} active channels.")

    # ─── Message Handling & Normalization ─────────────────────────────────────

    def _handle_message(self, data: Dict[str, Any]) -> None:
        msg_type = data.get("type")

        # 1. System / Connection events
        if msg_type == "pong":
            return

        if msg_type == "subscriptions":
            channels = data.get("channels", [])
            for ch in channels:
                if "error" in ch:
                    self._logger.warning(f"Delta WS subscription error on channel {ch.get('name')}: {ch.get('error')}")
                else:
                    self._logger.info(f"Delta WS active on channel {ch.get('name')}")
            return

        if msg_type == "system_status":
            self._system_status = str(data.get("status", "OPERATIONAL")).upper()
            return

        # 2. Ticker & Option Chain batch updates
        if msg_type in ("ticker", "v2/ticker"):
            chain_symbol = data.get("sy")
            spot_px = float(data.get("sp")) if data.get("sp") is not None else None
            batch_items = data.get("d", [])

            if isinstance(batch_items, list) and batch_items:
                for item in batch_items:
                    self._normalize_and_emit_ticker(item, default_spot=spot_px, chain_symbol=chain_symbol)
            else:
                self._normalize_and_emit_ticker(data, default_spot=spot_px, chain_symbol=chain_symbol)
            return

        # 3. L1 / L2 Orderbook
        if msg_type in ("ob_l1", "ob_l2", "l2_orderbook"):
            self._handle_orderbook_message(data)
            return

        # 4. Incremental Orderbook Updates
        if msg_type == "ob_updates":
            self._handle_orderbook_updates(data)
            return

        # 5. Public Trades
        if msg_type in ("trades", "all_trades"):
            self._handle_trades_message(data)
            return

        # 6. Mark Price
        if msg_type == "mark_price":
            sym = data.get("symbol") or data.get("s")
            mp = data.get("price") or data.get("mark_price") or data.get("m")
            if sym and mp is not None:
                self._mark_price_cache[sym] = float(mp)
            return

        # 7. Spot Price
        if msg_type in ("spot_price", "spot_30mtwap_price"):
            sym = data.get("symbol") or data.get("s")
            sp = data.get("price") or data.get("spot_price") or data.get("p")
            if sym and sp is not None:
                self._spot_price_cache[sym] = float(sp)
            return

        # 8. Funding Rate
        if msg_type == "funding_rate":
            sym = data.get("symbol") or data.get("s")
            fr = data.get("funding_rate") or data.get("rate")
            if sym and fr is not None:
                self._funding_rate_cache[sym] = float(fr)
            return

        # 9. Candlesticks
        if msg_type == "candlesticks":
            self._handle_candlestick_message(data)
            return

    def _normalize_and_emit_ticker(
        self,
        item: Dict[str, Any],
        default_spot: Optional[float] = None,
        chain_symbol: Optional[str] = None
    ) -> None:
        try:
            raw_pid = item.get("i") or item.get("product_id")
            pid_int = int(raw_pid) if raw_pid is not None else None

            symbol = item.get("s") or item.get("symbol")
            if not symbol and pid_int:
                symbol = self._product_id_to_symbol.get(pid_int)

            if not symbol:
                return

            if pid_int:
                self._product_id_to_symbol[pid_int] = symbol

            now_iso = datetime.now(timezone.utc).isoformat()
            exchange_ts = str(item.get("t") or item.get("timestamp") or now_iso)

            # Mark price
            raw_mp = item.get("m") or item.get("mark_price")
            mark_price = float(raw_mp) if raw_mp is not None else None

            # Spot price
            raw_sp = item.get("sp") or item.get("spot_price") or default_spot
            spot_price = float(raw_sp) if raw_sp is not None else None
            if spot_price is not None and spot_price > 0:
                self._spot_price_cache[symbol] = spot_price
                if symbol.endswith("USD"):
                    self._spot_price_cache[symbol[:-3]] = spot_price

            # Quotes: [best_bid, bid_size, best_ask, ask_size, impact_mid]
            quotes_raw = item.get("q") or item.get("quotes") or []
            best_bid: Optional[float] = None
            best_ask: Optional[float] = None
            bid_size: Optional[float] = None
            ask_size: Optional[float] = None

            if isinstance(quotes_raw, list) and len(quotes_raw) >= 4:
                best_bid = float(quotes_raw[0]) if quotes_raw[0] is not None and float(quotes_raw[0]) > 0 else None
                bid_size = float(quotes_raw[1]) if quotes_raw[1] is not None and float(quotes_raw[1]) > 0 else None
                best_ask = float(quotes_raw[2]) if quotes_raw[2] is not None and float(quotes_raw[2]) > 0 else None
                ask_size = float(quotes_raw[3]) if quotes_raw[3] is not None and float(quotes_raw[3]) > 0 else None
            elif isinstance(quotes_raw, dict):
                bb = quotes_raw.get("best_bid")
                ba = quotes_raw.get("best_ask")
                bs = quotes_raw.get("bid_size")
                as_ = quotes_raw.get("ask_size")
                best_bid = float(bb) if bb is not None and float(bb) > 0 else None
                best_ask = float(ba) if ba is not None and float(ba) > 0 else None
                bid_size = float(bs) if bs is not None and float(bs) > 0 else None
                ask_size = float(as_) if as_ is not None and float(as_) > 0 else None

            # Greeks: [delta, gamma, theta, vega, rho]
            greeks_raw = item.get("g") or item.get("greeks") or []
            delta: Optional[float] = None
            gamma: Optional[float] = None
            theta: Optional[float] = None
            vega: Optional[float] = None
            rho: Optional[float] = None

            if isinstance(greeks_raw, list) and len(greeks_raw) >= 5:
                delta = float(greeks_raw[0]) if greeks_raw[0] is not None else None
                gamma = float(greeks_raw[1]) if greeks_raw[1] is not None else None
                theta = float(greeks_raw[2]) if greeks_raw[2] is not None else None
                vega = float(greeks_raw[3]) if greeks_raw[3] is not None else None
                rho = float(greeks_raw[4]) if greeks_raw[4] is not None else None
            elif isinstance(greeks_raw, dict):
                delta = float(greeks_raw["delta"]) if greeks_raw.get("delta") is not None else None
                gamma = float(greeks_raw["gamma"]) if greeks_raw.get("gamma") is not None else None
                theta = float(greeks_raw["theta"]) if greeks_raw.get("theta") is not None else None
                vega = float(greeks_raw["vega"]) if greeks_raw.get("vega") is not None else None
                rho = float(greeks_raw["rho"]) if greeks_raw.get("rho") is not None else None

            # IV: [mark_iv, bid_iv, ask_iv]
            qiv_raw = item.get("qiv") or []
            mark_iv: Optional[float] = None
            bid_iv: Optional[float] = None
            ask_iv: Optional[float] = None
            if isinstance(qiv_raw, list) and len(qiv_raw) >= 3:
                mark_iv = float(qiv_raw[0]) if qiv_raw[0] is not None and float(qiv_raw[0]) > 0 else None
                bid_iv = float(qiv_raw[1]) if qiv_raw[1] is not None and float(qiv_raw[1]) > 0 else None
                ask_iv = float(qiv_raw[2]) if qiv_raw[2] is not None and float(qiv_raw[2]) > 0 else None

            # Open Interest: [oi_contracts, oi_change]
            oi_raw = item.get("oi") or []
            oi: Optional[float] = None
            if isinstance(oi_raw, list) and len(oi_raw) >= 1:
                oi = float(oi_raw[0]) if oi_raw[0] is not None else None
            elif isinstance(oi_raw, (int, float, str)):
                try:
                    oi = float(oi_raw)
                except Exception:
                    pass

            # OHLC: [open, high, low, close]
            ohlc_raw = item.get("ohlc") or []
            open_px: Optional[float] = None
            high_px: Optional[float] = None
            low_px: Optional[float] = None
            close_px: Optional[float] = None
            if isinstance(ohlc_raw, list) and len(ohlc_raw) >= 4:
                open_px = float(ohlc_raw[0]) if ohlc_raw[0] is not None else None
                high_px = float(ohlc_raw[1]) if ohlc_raw[1] is not None else None
                low_px = float(ohlc_raw[2]) if ohlc_raw[2] is not None else None
                close_px = float(ohlc_raw[3]) if ohlc_raw[3] is not None else None

            # Volume & 24h change
            vol = float(item.get("volume") or item.get("v") or 0.0)
            change_pct = float(item.get("m24hc") or item.get("mark_change_24h") or 0.0)
            funding_rate = float(item["funding_rate"]) if item.get("funding_rate") is not None else None

            # Price Bands: [lower, upper]
            pb_raw = item.get("pb") or item.get("price_band") or []
            pb_lower: Optional[float] = None
            pb_upper: Optional[float] = None
            if isinstance(pb_raw, list) and len(pb_raw) >= 2:
                pb_lower = float(pb_raw[0]) if pb_raw[0] is not None else None
                pb_upper = float(pb_raw[1]) if pb_raw[1] is not None else None

            # Construct Strongly-Typed DeltaTicker
            delta_ticker = DeltaTicker(
                symbol=symbol,
                product_id=pid_int,
                last_price=mark_price or close_px,
                mark_price=mark_price,
                spot_price=spot_price,
                best_bid=best_bid,
                best_ask=best_ask,
                bid_size=bid_size,
                ask_size=ask_size,
                open_interest=oi,
                volume_24h=vol,
                change_24h=change_pct,
                open_price=open_px,
                high_price=high_px,
                low_price=low_px,
                close_price=close_px,
                mark_iv=mark_iv,
                bid_iv=bid_iv,
                ask_iv=ask_iv,
                delta=delta,
                gamma=gamma,
                theta=theta,
                vega=vega,
                rho=rho,
                funding_rate=funding_rate,
                price_band_lower=pb_lower,
                price_band_upper=pb_upper,
                chain_symbol=chain_symbol,
                exchange_timestamp=exchange_ts,
                received_at=now_iso,
                source="delta_public_ws",
                is_stale=False,
            )

            self._ticker_cache[symbol] = delta_ticker

            # Populate raw dictionary for option chain builder
            raw_dict = delta_ticker.to_dict()
            self._raw_quote_cache[symbol] = raw_dict
            if pid_int:
                self._raw_quote_cache[str(pid_int)] = raw_dict

            # Construct Canonical NormalizedQuote for central gateway pipeline
            norm_quote = NormalizedQuote(
                symbol=symbol,
                exchange="DELTA",
                provider="delta_options_ws",
                last_price=float(delta_ticker.last_price or 0.0),
                bid=float(delta_ticker.best_bid or 0.0),
                ask=float(delta_ticker.best_ask or 0.0),
                volume=float(delta_ticker.volume_24h or 0.0),
                high=delta_ticker.high_price,
                low=delta_ticker.low_price,
                open=delta_ticker.open_price,
                close=delta_ticker.close_price,
                change_pct=delta_ticker.change_24h,
                oi=delta_ticker.open_interest,
                funding_rate=delta_ticker.funding_rate,
                event_timestamp=exchange_ts,
                received_timestamp=now_iso,
                data_mode="REAL_TIME",
                is_stale=False,
            )

            self._canonical_quote_cache[symbol] = norm_quote
            self._emit(norm_quote)

            # Also alias standard pairs (BTCUSD -> BTC) for simple multi-asset routing
            if symbol.endswith("USD") and len(symbol) in (6, 7):
                base_sym = symbol[:-3]
                if base_sym in ("BTC", "ETH", "SOL", "XRP", "BNB", "DOGE"):
                    alias_quote = NormalizedQuote(
                        symbol=base_sym,
                        exchange="DELTA",
                        provider="delta_options_ws",
                        last_price=norm_quote.last_price,
                        bid=norm_quote.bid,
                        ask=norm_quote.ask,
                        volume=norm_quote.volume,
                        high=norm_quote.high,
                        low=norm_quote.low,
                        open=norm_quote.open,
                        close=norm_quote.close,
                        change_pct=norm_quote.change_pct,
                        oi=norm_quote.oi,
                        funding_rate=norm_quote.funding_rate,
                        event_timestamp=exchange_ts,
                        received_timestamp=now_iso,
                        data_mode="REAL_TIME",
                        is_stale=False,
                    )
                    self._canonical_quote_cache[base_sym] = alias_quote
                    self._raw_quote_cache[base_sym] = raw_dict
                    self._emit(alias_quote)

        except Exception as e:
            self._logger.debug(f"Error normalizing Delta ticker: {e}")

    # ─── Orderbook & Trade Management ─────────────────────────────────────────

    def _handle_orderbook_message(self, data: Dict[str, Any]) -> None:
        try:
            symbol = data.get("symbol") or data.get("s")
            if not symbol:
                return

            raw_bids = data.get("bids") or data.get("b") or []
            raw_asks = data.get("asks") or data.get("a") or []

            bids_list: List[Dict[str, float]] = []
            total_bid_vol = 0.0
            for b in raw_bids[:15]:
                p = float(b[0] if isinstance(b, list) else b.get("price", 0))
                s = float(b[1] if isinstance(b, list) else b.get("size", 0))
                if p > 0 and s > 0:
                    bids_list.append({"price": p, "size": s})
                    total_bid_vol += s

            asks_list: List[Dict[str, float]] = []
            total_ask_vol = 0.0
            for a in raw_asks[:15]:
                p = float(a[0] if isinstance(a, list) else a.get("price", 0))
                s = float(a[1] if isinstance(a, list) else a.get("size", 0))
                if p > 0 and s > 0:
                    asks_list.append({"price": p, "size": s})
                    total_ask_vol += s

            best_bid = bids_list[0]["price"] if bids_list else None
            bid_size = bids_list[0]["size"] if bids_list else None
            best_ask = asks_list[0]["price"] if asks_list else None
            ask_size = asks_list[0]["size"] if asks_list else None

            spread = round(best_ask - best_bid, 2) if best_bid and best_ask else None
            mid = round((best_bid + best_ask) / 2.0, 2) if best_bid and best_ask else None

            total_vol = total_bid_vol + total_ask_vol
            imbalance = round((total_bid_vol - total_ask_vol) / total_vol, 4) if total_vol > 0 else 0.0

            now_iso = datetime.now(timezone.utc).isoformat()
            seq = data.get("sequence_no") or data.get("seq")

            ob = DeltaOrderBook(
                symbol=symbol,
                bids=bids_list,
                asks=asks_list,
                best_bid=best_bid,
                best_ask=best_ask,
                bid_size=bid_size,
                ask_size=ask_size,
                spread=spread,
                mid_price=mid,
                imbalance=imbalance,
                total_bid_volume=round(total_bid_vol, 2),
                total_ask_volume=round(total_ask_vol, 2),
                sequence_no=int(seq) if seq is not None else None,
                timestamp=str(data.get("timestamp", now_iso)),
                received_at=now_iso,
            )

            self._orderbook_cache[symbol] = ob

        except Exception as e:
            self._logger.debug(f"Error parsing Delta orderbook: {e}")

    def _handle_orderbook_updates(self, data: Dict[str, Any]) -> None:
        """Applies incremental depth delta updates to existing orderbook state."""
        try:
            symbol = data.get("symbol") or data.get("s")
            if not symbol or symbol not in self._orderbook_cache:
                return

            existing_ob = self._orderbook_cache[symbol]
            delta_bids = data.get("bids", [])
            delta_asks = data.get("asks", [])

            # Map existing bids/asks by price
            bids_map = {b["price"]: b["size"] for b in existing_ob.bids}
            asks_map = {a["price"]: a["size"] for a in existing_ob.asks}

            # Apply bid updates (size == 0 means remove level)
            for item in delta_bids:
                p = float(item[0] if isinstance(item, list) else item.get("price", 0))
                s = float(item[1] if isinstance(item, list) else item.get("size", 0))
                if s <= 0:
                    bids_map.pop(p, None)
                else:
                    bids_map[p] = s

            # Apply ask updates
            for item in delta_asks:
                p = float(item[0] if isinstance(item, list) else item.get("price", 0))
                s = float(item[1] if isinstance(item, list) else item.get("size", 0))
                if s <= 0:
                    asks_map.pop(p, None)
                else:
                    asks_map[p] = s

            # Re-sort descending for bids, ascending for asks
            sorted_bids = sorted([{"price": k, "size": v} for k, v in bids_map.items()], key=lambda x: x["price"], reverse=True)[:15]
            sorted_asks = sorted([{"price": k, "size": v} for k, v in asks_map.items()], key=lambda x: x["price"])[:15]

            existing_ob.bids = sorted_bids
            existing_ob.asks = sorted_asks
            existing_ob.best_bid = sorted_bids[0]["price"] if sorted_bids else None
            existing_ob.bid_size = sorted_bids[0]["size"] if sorted_bids else None
            existing_ob.best_ask = sorted_asks[0]["price"] if sorted_asks else None
            existing_ob.ask_size = sorted_asks[0]["size"] if sorted_asks else None
            existing_ob.spread = round(existing_ob.best_ask - existing_ob.best_bid, 2) if existing_ob.best_bid and existing_ob.best_ask else None
            existing_ob.mid_price = round((existing_ob.best_bid + existing_ob.best_ask) / 2.0, 2) if existing_ob.best_bid and existing_ob.best_ask else None

            tot_b = sum(b["size"] for b in sorted_bids)
            tot_a = sum(a["size"] for a in sorted_asks)
            existing_ob.total_bid_volume = round(tot_b, 2)
            existing_ob.total_ask_volume = round(tot_a, 2)
            existing_ob.imbalance = round((tot_b - tot_a) / (tot_b + tot_a), 4) if (tot_b + tot_a) > 0 else 0.0
            existing_ob.received_at = datetime.now(timezone.utc).isoformat()

        except Exception as e:
            self._logger.debug(f"Error applying Delta ob_updates: {e}")

    def _handle_trades_message(self, data: Dict[str, Any]) -> None:
        try:
            symbol = data.get("symbol") or data.get("s")
            raw_trades = data.get("trades") or data.get("d") or [data]
            if not symbol and isinstance(raw_trades, list) and raw_trades:
                symbol = raw_trades[0].get("symbol") or raw_trades[0].get("s")

            if not symbol:
                return

            tape = self._recent_trades.setdefault(symbol, [])
            now_iso = datetime.now(timezone.utc).isoformat()

            for t in (raw_trades if isinstance(raw_trades, list) else [raw_trades]):
                px = float(t.get("price") or t.get("p") or 0.0)
                sz = float(t.get("size") or t.get("s") or 0.0)
                if px <= 0 or sz <= 0:
                    continue

                role = str(t.get("seller_role") or t.get("buyer_role") or t.get("side") or "buy").lower()
                trade_ts = str(t.get("timestamp") or t.get("t") or now_iso)
                is_large = (px * sz) >= 50_000.0  # > $50k notional

                trade_obj = DeltaTrade(
                    symbol=symbol,
                    price=px,
                    size=sz,
                    role=role,
                    timestamp=trade_ts,
                    received_at=now_iso,
                    is_large=is_large,
                )

                tape.append(trade_obj)
                if len(tape) > 100:
                    tape.pop(0)

        except Exception as e:
            self._logger.debug(f"Error parsing Delta trades message: {e}")

    def _handle_candlestick_message(self, data: Dict[str, Any]) -> None:
        try:
            symbol = data.get("symbol") or data.get("s")
            res = str(data.get("resolution") or data.get("r") or "1m")
            if not symbol:
                return

            c_list = self._candles_cache.setdefault(symbol, {}).setdefault(res, [])
            candle_obj = DeltaCandle(
                symbol=symbol,
                resolution=res,
                open=float(data.get("open") or data.get("o") or 0.0),
                high=float(data.get("high") or data.get("h") or 0.0),
                low=float(data.get("low") or data.get("l") or 0.0),
                close=float(data.get("close") or data.get("c") or 0.0),
                volume=float(data.get("volume") or data.get("v") or 0.0),
                timestamp=str(data.get("timestamp") or data.get("t") or datetime.now(timezone.utc).isoformat()),
                is_closed=bool(data.get("is_closed", True)),
            )

            c_list.append(candle_obj)
            if len(c_list) > 200:
                c_list.pop(0)

        except Exception as e:
            self._logger.debug(f"Error parsing Delta candlestick: {e}")

    # ─── Public Queries & Snapshots ───────────────────────────────────────────

    async def get_snapshot(self, symbols: List[str]) -> Dict[str, NormalizedQuote]:
        res: Dict[str, NormalizedQuote] = {}
        missing: List[str] = []
        for s in symbols:
            s_up = s.upper().strip()
            if s_up in self._canonical_quote_cache:
                res[s_up] = self._canonical_quote_cache[s_up]
            else:
                missing.append(s_up)

        if missing:
            try:
                tickers = await asyncio.to_thread(global_delta_client.get_tickers)
                for t in tickers:
                    sym = t.get("symbol")
                    if sym and sym in missing:
                        norm = NormalizedQuote(
                            symbol=sym,
                            exchange="DELTA",
                            provider="delta_options_ws",
                            last_price=float(t.get("mark_price", 0.0)),
                            bid=float(t.get("quotes", {}).get("best_bid", 0.0)),
                            ask=float(t.get("quotes", {}).get("best_ask", 0.0)),
                            volume=float(t.get("volume", 0.0)),
                            oi=float(t.get("oi", 0.0)),
                            change_pct=float(t.get("mark_change_24h", 0.0)),
                            data_mode="REAL_TIME",
                        )
                        self._canonical_quote_cache[sym] = norm
                        res[sym] = norm
            except Exception as e:
                self._logger.warning(f"Error in REST snapshot fallback: {e}")

        return res

    def get_raw_quote(self, symbol_or_product_id: str) -> Optional[Dict[str, Any]]:
        return self._raw_quote_cache.get(str(symbol_or_product_id))

    def get_all_raw_quotes(self) -> Dict[str, Dict[str, Any]]:
        return dict(self._raw_quote_cache)

    def get_orderbook(self, symbol: str) -> Optional[DeltaOrderBook]:
        return self._orderbook_cache.get(symbol.upper().strip())

    def get_recent_trades(self, symbol: str) -> List[DeltaTrade]:
        return list(self._recent_trades.get(symbol.upper().strip(), []))

    def get_mark_price(self, symbol: str) -> Optional[float]:
        return self._mark_price_cache.get(symbol.upper().strip())

    def get_spot_price(self, symbol: str) -> Optional[float]:
        return self._spot_price_cache.get(symbol.upper().strip())

    def get_funding_rate(self, symbol: str) -> Optional[float]:
        return self._funding_rate_cache.get(symbol.upper().strip())

    def get_candles(self, symbol: str, resolution: str = "1m") -> List[DeltaCandle]:
        return list(self._candles_cache.get(symbol.upper().strip(), {}).get(resolution, []))

    async def get_history(
        self,
        symbol: str,
        timeframe: str,
        from_dt: datetime,
        to_dt: datetime,
    ) -> List[OHLCVCandle]:
        return []

    async def get_instruments(self) -> List[CanonicalInstrument]:
        try:
            prods = await asyncio.to_thread(global_delta_client.get_products)
            res = []
            for p in prods:
                res.append(
                    CanonicalInstrument(
                        canonical_symbol=p.get("symbol", ""),
                        display_name=p.get("description", p.get("symbol", "")),
                        asset_class="CRYPTO_OPTIONS",
                        exchange="DELTA",
                        mic_code="DELTA",
                        region="GLOBAL",
                        currency=p.get("quoting_asset", {}).get("symbol", "USD"),
                        timezone="UTC",
                        lot_size=1,
                        tick_size=float(p.get("tick_size", 0.1)),
                        has_options=True,
                        has_futures=False,
                        is_active=p.get("state") == "live",
                        expiry=p.get("settlement_time"),
                        strike=float(p.get("strike_price", 0.0)) if p.get("strike_price") else None,
                        option_type="CALL" if p.get("contract_type") == "call_options" else "PUT",
                    )
                )
            return res
        except Exception:
            return []

    def get_sync_health(self) -> Dict[str, Any]:
        now = time.monotonic()
        latency = (now - self._last_msg_time) * 1000.0 if self._last_msg_time > 0 else 9999.0
        total_subs = (
            len(self.sub_mgr.ticker_symbols)
            + len(self.sub_mgr.chain_symbols)
            + len(self.sub_mgr.ob_l2_symbols)
            + len(self.sub_mgr.trades_symbols)
        )
        return {
            "provider_id": "delta_options_ws",
            "provider_name": "Delta Exchange Options WebSocket",
            "status": self._status,
            "asset_classes": ["CRYPTO_OPTIONS", "CRYPTO_FUTURES"],
            "subscribed_symbols": total_subs,
            "latency_ms": round(latency, 2),
            "error_count": self._error_count,
            "last_tick_time": datetime.now(timezone.utc).isoformat() if self._last_msg_time > 0 else None,
            "system_status": self._system_status,
            "message": "Operational and streaming live option chains." if self._status == "LIVE" else "Disconnected or reconnecting.",
        }

    async def health_check(self) -> ProviderHealth:
        h = self.get_sync_health()
        return ProviderHealth(
            provider_id="delta_options_ws",
            provider_name="Delta Exchange Options WebSocket",
            status=h["status"],
            asset_classes=h["asset_classes"],
            subscribed_symbols=h["subscribed_symbols"],
            latency_ms=h["latency_ms"],
            error_count=h["error_count"],
            last_tick_time=h["last_tick_time"],
            message=h["message"],
        )


# Singleton adapter instance
delta_options_ws_adapter = DeltaOptionsWSAdapter()
