"""
Order Flow Engine & Top Order Monitor
=====================================
Calculates real-time Level 2 order book metrics, Bid/Ask Imbalance, Microprice,
Liquidity Walls, Aggressive Flows, Trade Velocity, and Top Order Books.
"""
from __future__ import annotations

import heapq
import logging
import time
from collections import deque
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

logger = logging.getLogger("MDGateway.OrderFlowEngine")


@dataclass
class TopOrderEntry:
    rank: int
    provider: str
    exchange: str
    symbol: str
    instrument: str
    expiry: Optional[str] = None
    strike: Optional[float] = None
    option_type: Optional[str] = None  # CE | PE | CALL | PUT | None
    side: str = "BUY"  # BUY | SELL
    price: float = 0.0
    quantity: float = 0.0
    notional: float = 0.0
    depth_level: int = 1
    oi: Optional[float] = None
    volume: Optional[float] = None
    timestamp: str = ""


@dataclass
class SymbolOrderFlowMetrics:
    symbol: str
    provider: str
    exchange: str
    ltp: float = 0.0
    
    # Imbalance & Spread
    bid_volume: float = 0.0
    ask_volume: float = 0.0
    buy_imbalance_pct: float = 50.0   # e.g. 64%
    sell_imbalance_pct: float = 50.0  # e.g. 36%
    best_bid: float = 0.0
    best_ask: float = 0.0
    spread: float = 0.0
    spread_bps: float = 0.0
    microprice: float = 0.0
    
    # Liquidity Walls
    largest_bid_price: float = 0.0
    largest_bid_qty: float = 0.0
    largest_ask_price: float = 0.0
    largest_ask_qty: float = 0.0
    
    # Trade Velocity & Aggressive Flows
    aggressive_buys_qty: float = 0.0
    aggressive_sells_qty: float = 0.0
    trade_velocity_tps: float = 0.0
    volume_delta: float = 0.0
    oi_delta: float = 0.0
    
    depth_bids: List[Dict[str, Any]] = field(default_factory=list)
    depth_asks: List[Dict[str, Any]] = field(default_factory=list)
    updated_at: str = ""

    def calculate_metrics(self) -> None:
        tot_vol = self.bid_volume + self.ask_volume
        if tot_vol > 0:
            self.buy_imbalance_pct = round((self.bid_volume / tot_vol) * 100.0, 1)
            self.sell_imbalance_pct = round(100.0 - self.buy_imbalance_pct, 1)
        else:
            self.buy_imbalance_pct = 50.0
            self.sell_imbalance_pct = 50.0

        if self.best_bid > 0 and self.best_ask > 0:
            self.spread = round(max(0.0, self.best_ask - self.best_bid), 4)
            mid = (self.best_bid + self.best_ask) / 2.0
            if mid > 0:
                self.spread_bps = round((self.spread / mid) * 10000.0, 2)
            # Microprice = (Bid * AskQty + Ask * BidQty) / (BidQty + AskQty)
            tot_top_qty = self.bid_volume + self.ask_volume
            if tot_top_qty > 0:
                self.microprice = round(
                    ((self.best_bid * self.ask_volume) + (self.best_ask * self.bid_volume)) / tot_top_qty,
                    4
                )
            else:
                self.microprice = mid
        elif self.ltp > 0:
            self.microprice = self.ltp

        self.updated_at = datetime.now(timezone.utc).isoformat()


class OrderFlowEngine:
    """Calculates order book depth statistics, imbalances, and manages Top Order Monitor."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(OrderFlowEngine, cls).__new__(cls)
            cls._instance._init_engine()
        return cls._instance

    def _init_engine(self):
        self._metrics_map: Dict[str, SymbolOrderFlowMetrics] = {}
        self._recent_trades: deque = deque(maxlen=1000)
        self._top_orders_pool: List[TopOrderEntry] = []

    def update_from_depth(
        self,
        symbol: str,
        provider: str,
        exchange: str,
        bids: List[Dict[str, Any]],
        asks: List[Dict[str, Any]],
        ltp: Optional[float] = None,
        oi: Optional[float] = None,
        volume: Optional[float] = None,
        expiry: Optional[str] = None,
        strike: Optional[float] = None,
        option_type: Optional[str] = None,
        instrument_type: str = "SPOT"
    ) -> SymbolOrderFlowMetrics:
        """Processes an L2 depth update for a symbol and computes flow metrics."""
        clean_sym = symbol.upper().strip()
        if clean_sym not in self._metrics_map:
            self._metrics_map[clean_sym] = SymbolOrderFlowMetrics(
                symbol=clean_sym,
                provider=provider,
                exchange=exchange
            )

        m = self._metrics_map[clean_sym]
        m.provider = provider
        m.exchange = exchange
        if ltp is not None and ltp > 0:
            m.ltp = ltp

        m.depth_bids = bids[:20] if bids else []
        m.depth_asks = asks[:20] if asks else []

        bid_vol = sum(float(b.get("quantity") or b.get("size") or b.get("qty") or 0.0) for b in m.depth_bids)
        ask_vol = sum(float(a.get("quantity") or a.get("size") or a.get("qty") or 0.0) for a in m.depth_asks)

        m.bid_volume = round(bid_vol, 4)
        m.ask_volume = round(ask_vol, 4)

        if m.depth_bids:
            m.best_bid = float(m.depth_bids[0].get("price") or 0.0)
            max_bid = max(m.depth_bids, key=lambda b: float(b.get("quantity") or b.get("size") or b.get("qty") or 0.0))
            m.largest_bid_price = float(max_bid.get("price") or 0.0)
            m.largest_bid_qty = float(max_bid.get("quantity") or max_bid.get("size") or max_bid.get("qty") or 0.0)

        if m.depth_asks:
            m.best_ask = float(m.depth_asks[0].get("price") or 0.0)
            max_ask = max(m.depth_asks, key=lambda a: float(a.get("quantity") or a.get("size") or a.get("qty") or 0.0))
            m.largest_ask_price = float(max_ask.get("price") or 0.0)
            m.largest_ask_qty = float(max_ask.get("quantity") or max_ask.get("size") or max_ask.get("qty") or 0.0)

        m.calculate_metrics()

        # Update Top Orders pool
        self._refresh_top_orders(clean_sym, provider, exchange, m.depth_bids, m.depth_asks, expiry, strike, option_type, instrument_type, oi, volume)

        return m

    def _refresh_top_orders(
        self,
        symbol: str,
        provider: str,
        exchange: str,
        bids: List[Dict[str, Any]],
        asks: List[Dict[str, Any]],
        expiry: Optional[str],
        strike: Optional[float],
        option_type: Optional[str],
        instrument: str,
        oi: Optional[float],
        volume: Optional[float]
    ):
        now_iso = datetime.now(timezone.utc).isoformat()
        # Filter existing entries for this symbol
        self._top_orders_pool = [e for e in self._top_orders_pool if e.symbol != symbol]

        for lvl, b in enumerate(bids[:5], start=1):
            p = float(b.get("price") or 0.0)
            q = float(b.get("quantity") or b.get("size") or b.get("qty") or 0.0)
            if p > 0 and q > 0:
                self._top_orders_pool.append(TopOrderEntry(
                    rank=1,
                    provider=provider,
                    exchange=exchange,
                    symbol=symbol,
                    instrument=instrument,
                    expiry=expiry,
                    strike=strike,
                    option_type=option_type,
                    side="BUY",
                    price=p,
                    quantity=q,
                    notional=round(p * q, 2),
                    depth_level=lvl,
                    oi=oi,
                    volume=volume,
                    timestamp=now_iso
                ))

        for lvl, a in enumerate(asks[:5], start=1):
            p = float(a.get("price") or 0.0)
            q = float(a.get("quantity") or a.get("size") or a.get("qty") or 0.0)
            if p > 0 and q > 0:
                self._top_orders_pool.append(TopOrderEntry(
                    rank=1,
                    provider=provider,
                    exchange=exchange,
                    symbol=symbol,
                    instrument=instrument,
                    expiry=expiry,
                    strike=strike,
                    option_type=option_type,
                    side="SELL",
                    price=p,
                    quantity=q,
                    notional=round(p * q, 2),
                    depth_level=lvl,
                    oi=oi,
                    volume=volume,
                    timestamp=now_iso
                ))

        # Re-rank by notional descending
        self._top_orders_pool.sort(key=lambda x: x.notional, reverse=True)
        for idx, entry in enumerate(self._top_orders_pool, start=1):
            entry.rank = idx

        # Cap pool size
        self._top_orders_pool = self._top_orders_pool[:500]

    def get_order_flow_metrics(self, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        if symbol:
            clean = symbol.upper().strip()
            m = self._metrics_map.get(clean)
            return [asdict(m)] if m else []
        return [asdict(m) for m in self._metrics_map.values()]

    def get_top_orders(
        self,
        provider: Optional[str] = None,
        exchange: Optional[str] = None,
        symbol: Optional[str] = None,
        instrument: Optional[str] = None,
        side: Optional[str] = None,
        min_notional: float = 0.0,
        min_qty: float = 0.0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        filtered = self._top_orders_pool

        if provider:
            filtered = [e for e in filtered if provider.lower() in e.provider.lower()]
        if exchange:
            filtered = [e for e in filtered if exchange.upper() in e.exchange.upper()]
        if symbol:
            filtered = [e for e in filtered if symbol.upper() in e.symbol.upper()]
        if instrument:
            filtered = [e for e in filtered if instrument.upper() in (e.instrument or "").upper()]
        if side:
            filtered = [e for e in filtered if side.upper() == e.side.upper()]
        if min_notional > 0:
            filtered = [e for e in filtered if e.notional >= min_notional]
        if min_qty > 0:
            filtered = [e for e in filtered if e.quantity >= min_qty]

        return [asdict(e) for e in filtered[:limit]]


global_order_flow_engine = OrderFlowEngine()
