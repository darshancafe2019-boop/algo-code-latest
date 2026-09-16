"""
Market Depth Models
===================
Canonical representations of Order Book L2 / L3 Market Depth.
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional


@dataclass
class DepthLevel:
    price: float
    quantity: float
    orders: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class MarketDepth:
    symbol: str
    exchange: str
    provider: str
    bids: List[DepthLevel] = field(default_factory=list)
    asks: List[DepthLevel] = field(default_factory=list)
    timestamp: str = ""
    totalBuyQty: Optional[float] = None
    totalSellQty: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol": self.symbol,
            "exchange": self.exchange,
            "provider": self.provider,
            "bids": [b.to_dict() for b in self.bids],
            "asks": [a.to_dict() for a in self.asks],
            "timestamp": self.timestamp,
            "totalBuyQty": self.totalBuyQty,
            "totalSellQty": self.totalSellQty,
        }
