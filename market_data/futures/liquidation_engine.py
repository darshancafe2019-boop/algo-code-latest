"""
Futures Liquidation & Margin Tier Engine
=========================================
Calculates estimated liquidation prices, maintenance margin requirements,
and leverage risk brackets across Cross and Isolated margin modes.
"""

from __future__ import annotations
from typing import Dict, Any, List, Optional
from market_data.futures.models import LiquidationTier, MarginMode


class LiquidationEngine:
    """Calculates liquidation prices and maintenance margins."""

    DEFAULT_TIERS = [
        LiquidationTier(tier=1, min_notional=0, max_notional=50000, max_leverage=125, maintenance_margin_rate=0.004, maint_amount=0),
        LiquidationTier(tier=2, min_notional=50000, max_notional=250000, max_leverage=100, maintenance_margin_rate=0.005, maint_amount=50),
        LiquidationTier(tier=3, min_notional=250000, max_notional=1000000, max_leverage=50, maintenance_margin_rate=0.010, maint_amount=1300),
        LiquidationTier(tier=4, min_notional=1000000, max_notional=5000000, max_leverage=20, maintenance_margin_rate=0.025, maint_amount=16300),
    ]

    @classmethod
    def calculate_liquidation_price(
        cls,
        side: str,  # "LONG" | "BUY" or "SHORT" | "SELL"
        entry_price: float,
        leverage: int,
        margin_mode: MarginMode = MarginMode.ISOLATED,
        maintenance_margin_rate: float = 0.005,
    ) -> float:
        """
        Calculates estimated liquidation price for a position:
        For Long: Entry * (1 - (1 / Leverage) + MMR)
        For Short: Entry * (1 + (1 / Leverage) - MMR)
        """
        if leverage <= 0:
            leverage = 1

        is_long = side.upper() in ("LONG", "BUY")
        initial_margin_rate = 1.0 / leverage

        if is_long:
            liq_price = entry_price * (1.0 - initial_margin_rate + maintenance_margin_rate)
            return max(0.0, round(liq_price, 2))
        else:
            liq_price = entry_price * (1.0 + initial_margin_rate - maintenance_margin_rate)
            return round(liq_price, 2)

    @classmethod
    def get_tiers(cls) -> List[Dict[str, Any]]:
        return [t.to_dict() for t in cls.DEFAULT_TIERS]
