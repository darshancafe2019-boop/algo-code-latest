"""
Spot-Futures Basis & Cash-and-Carry Arbitrage Engine
=====================================================
Calculates real-time price differential between Spot and Futures markets,
annualized basis yield, and contango/backwardation classification.
"""

from __future__ import annotations
from typing import Dict, Any, Optional
from market_data.futures.models import BasisData


class BasisEngine:
    """Evaluates spot-futures basis spreads and basis arbitrage returns."""

    @staticmethod
    def calculate_basis(
        symbol: str,
        spot_symbol: str,
        spot_price: float,
        futures_price: float,
        days_to_expiry: Optional[int] = None,
    ) -> BasisData:
        """
        Calculates absolute spread, percentage spread, and annualized basis.
        Basis % = (Futures - Spot) / Spot * 100
        """
        if spot_price <= 0:
            spot_price = 1.0

        basis_abs = round(futures_price - spot_price, 4)
        basis_pct = round((basis_abs / spot_price) * 100, 3)

        # Contango / Backwardation regime
        if basis_pct > 0.05:
            regime = "CONTANGO"
        elif basis_pct < -0.05:
            regime = "BACKWARDATION"
        else:
            regime = "PARITY"

        # Annualized basis for cash-and-carry
        days = days_to_expiry if days_to_expiry and days_to_expiry > 0 else 30
        annualized = round((basis_pct / days) * 365, 2)

        return BasisData(
            symbol=symbol,
            spot_symbol=spot_symbol,
            spot_price=spot_price,
            futures_price=futures_price,
            basis_absolute=basis_abs,
            basis_percentage=basis_pct,
            annualized_basis=annualized,
            regime=regime,
        )
