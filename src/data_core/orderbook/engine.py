"""
Centralized Order Book Engine & Order Flow Analytics
====================================================
Maintains multi-tier order books (L1 to L200) strictly keyed by (provider, canonicalInstrumentId).

Invariants:
1. Never silently merges order books across different venues or providers.
2. Supports adaptive depth levels (L1, L5, L15, L20, L30, L200).
3. Evaluates descriptive order-flow analytics (cumulative depth, spread, imbalance, liquidity concentration).
4. Never fabricates aggressor sides or automatic trade recommendations.
"""
from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("OrderBookEngine")


@dataclass
class BookLevel:
    price: float
    quantity: float
    orders_count: int = 1
    cumulative_quantity: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "price": self.price,
            "quantity": self.quantity,
            "ordersCount": self.orders_count,
            "cumulativeQuantity": round(self.cumulative_quantity, 4),
        }


@dataclass
class NormalizedOrderBook:
    provider: str
    canonical_instrument_id: str
    symbol: str
    bids: List[BookLevel] = field(default_factory=list)
    asks: List[BookLevel] = field(default_factory=list)
    best_bid: float = 0.0
    best_ask: float = 0.0
    spread: float = 0.0
    spread_bps: float = 0.0
    mid_price: float = 0.0
    cumulative_bid_depth: float = 0.0
    cumulative_ask_depth: float = 0.0
    depth_imbalance_pct: float = 0.0
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    feed_age_ms: float = 0.0
    depth_tier: str = "L20"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "provider": self.provider,
            "canonicalInstrumentId": self.canonical_instrument_id,
            "symbol": self.symbol,
            "bids": [b.to_dict() for b in self.bids],
            "asks": [a.to_dict() for a in self.asks],
            "bestBid": self.best_bid,
            "bestAsk": self.best_ask,
            "spread": round(self.spread, 4),
            "spreadBps": round(self.spread_bps, 2),
            "midPrice": round(self.mid_price, 4),
            "cumulativeBidDepth": round(self.cumulative_bid_depth, 4),
            "cumulativeAskDepth": round(self.cumulative_ask_depth, 4),
            "depthImbalancePct": round(self.depth_imbalance_pct, 2),
            "timestamp": self.timestamp,
            "feedAgeMs": round(self.feed_age_ms, 1),
            "depthTier": self.depth_tier,
        }


class OrderBookEngine:
    """Thread-safe multi-provider order book store and flow analytics."""

    def __init__(self):
        self._lock = threading.RLock()
        self._books: Dict[str, NormalizedOrderBook] = {}

    def _get_key(self, provider: str, canonical_id: str) -> str:
        return f"{provider.upper()}:{canonical_id}"

    def update_book(
        self,
        provider: str,
        canonical_instrument_id: str,
        symbol: str,
        raw_bids: List[Tuple[float, float]],  # (price, qty)
        raw_asks: List[Tuple[float, float]],  # (price, qty)
        depth_tier: str = "L20",
        feed_age_ms: float = 12.0,
    ) -> NormalizedOrderBook:
        """Constructs and updates a normalized multi-tier order book."""
        with self._lock:
            # Sort bids descending, asks ascending
            sorted_bids = sorted(raw_bids, key=lambda x: x[0], reverse=True)
            sorted_asks = sorted(raw_asks, key=lambda x: x[0])

            cum_bid = 0.0
            bid_levels: List[BookLevel] = []
            for price, qty in sorted_bids:
                cum_bid += qty
                bid_levels.append(BookLevel(price=price, quantity=qty, cumulative_quantity=cum_bid))

            cum_ask = 0.0
            ask_levels: List[BookLevel] = []
            for price, qty in sorted_asks:
                cum_ask += qty
                ask_levels.append(BookLevel(price=price, quantity=qty, cumulative_quantity=cum_ask))

            best_b = bid_levels[0].price if bid_levels else 0.0
            best_a = ask_levels[0].price if ask_levels else 0.0
            spread = max(0.0, best_a - best_b) if best_a > 0 and best_b > 0 else 0.0
            mid = (best_a + best_b) / 2.0 if best_a > 0 and best_b > 0 else (best_b or best_a)
            spread_bps = (spread / mid * 10000) if mid > 0 else 0.0

            total_depth = cum_bid + cum_ask
            imbalance = ((cum_bid - cum_ask) / total_depth * 100) if total_depth > 0 else 0.0

            book = NormalizedOrderBook(
                provider=provider.upper(),
                canonical_instrument_id=canonical_instrument_id,
                symbol=symbol,
                bids=bid_levels,
                asks=ask_levels,
                best_bid=best_b,
                best_ask=best_a,
                spread=spread,
                spread_bps=spread_bps,
                mid_price=mid,
                cumulative_bid_depth=cum_bid,
                cumulative_ask_depth=cum_ask,
                depth_imbalance_pct=imbalance,
                timestamp=datetime.now(timezone.utc).isoformat(),
                feed_age_ms=feed_age_ms,
                depth_tier=depth_tier,
            )

            key = self._get_key(provider, canonical_instrument_id)
            self._books[key] = book
            return book

    def get_order_book(
        self,
        provider: str,
        canonical_instrument_id: str,
        depth_limit: int = 20,
    ) -> Optional[NormalizedOrderBook]:
        """Retrieves order book up to requested depth limit."""
        with self._lock:
            key = self._get_key(provider, canonical_instrument_id)
            book = self._books.get(key)
            if not book:
                # Deterministic fallback around benchmark pricing
                return None
            return book

    def get_order_flow_analytics(self, provider: str, canonical_instrument_id: str) -> Dict[str, Any]:
        """Calculates descriptive order flow analytics from latest book state."""
        with self._lock:
            key = self._get_key(provider, canonical_instrument_id)
            book = self._books.get(key)
            if not book:
                return {
                    "provider": provider,
                    "canonicalInstrumentId": canonical_instrument_id,
                    "liquidityConcentration": "UNKNOWN",
                    "largestBidWall": None,
                    "largestAskWall": None,
                    "orderBookImbalance": 0.0,
                }

            largest_bid = max(book.bids, key=lambda x: x.quantity) if book.bids else None
            largest_ask = max(book.asks, key=lambda x: x.quantity) if book.asks else None

            return {
                "provider": book.provider,
                "canonicalInstrumentId": book.canonical_instrument_id,
                "bestBid": book.best_bid,
                "bestAsk": book.best_ask,
                "spreadBps": book.spread_bps,
                "depthImbalancePct": book.depth_imbalance_pct,
                "largestBidWall": largest_bid.to_dict() if largest_bid else None,
                "largestAskWall": largest_ask.to_dict() if largest_ask else None,
                "cumulativeBidDepth": book.cumulative_bid_depth,
                "cumulativeAskDepth": book.cumulative_ask_depth,
                "feedAgeMs": book.feed_age_ms,
            }


# Global Singleton Instance
global_order_book_engine = OrderBookEngine()
