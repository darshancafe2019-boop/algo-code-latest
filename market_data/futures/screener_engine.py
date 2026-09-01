"""
Futures Screener & Arbitrage Ranking Engine
============================================
Screens and filters futures contracts by 24h volume, funding rate APR,
open interest, and cash-and-carry basis arbitrage yields.
"""

from __future__ import annotations
from typing import Dict, Any, List, Optional
from market_data.futures.models import CanonicalFuturesContract


class FuturesScreenerEngine:
    """Provides high-performance filtering and ranking across all futures contracts."""

    @staticmethod
    def filter_contracts(
        contracts: List[CanonicalFuturesContract],
        search: str = "",
        contract_type: Optional[str] = None,
        venue: Optional[str] = None,
        min_volume_usd: float = 0.0,
        sort_by: str = "volume_24h_usd",
        sort_desc: bool = True,
    ) -> List[CanonicalFuturesContract]:
        results = contracts

        # 1. Search Query
        if search:
            q = search.lower().strip()
            results = [
                c for c in results
                if q in c.symbol.lower() or q in c.underlying.lower() or q in c.displayName.lower()
            ]

        # 2. Contract Type Filter
        if contract_type and contract_type != "ALL":
            results = [c for c in results if c.contract_type.value == contract_type]

        # 3. Venue Filter
        if venue and venue != "ALL":
            results = [c for c in results if c.venue.value == venue]

        # 4. Minimum Volume Filter
        if min_volume_usd > 0:
            results = [c for c in results if c.volume_24h_usd >= min_volume_usd]

        # 5. Sorting
        def get_sort_key(c: CanonicalFuturesContract):
            if sort_by == "funding_rate_annualized" and c.funding_rate:
                return c.funding_rate.funding_rate_annualized
            elif sort_by == "basis_percentage" and c.basis:
                return c.basis.basis_percentage
            elif sort_by == "change_24h_pct":
                return c.change_24h_pct
            elif sort_by == "open_interest_usd":
                return c.open_interest_usd
            return c.volume_24h_usd

        results.sort(key=get_sort_key, reverse=sort_desc)
        return results

    @staticmethod
    def get_funding_heatmap(contracts: List[CanonicalFuturesContract]) -> List[Dict[str, Any]]:
        """Returns contracts with active funding rates sorted by highest APR yield."""
        perps = [c for c in contracts if c.funding_rate is not None]
        perps.sort(key=lambda c: abs(c.funding_rate.funding_rate_annualized), reverse=True)
        return [
            {
                "symbol": c.symbol,
                "underlying": c.underlying,
                "markPrice": c.mark_price,
                "change24h": c.change_24h_pct,
                "rate8h": c.funding_rate.funding_rate_8h,
                "apr": c.funding_rate.funding_rate_annualized,
                "countdown": c.funding_rate.next_funding_time,
                "openInterestUsd": c.open_interest_usd,
            }
            for c in perps
        ]
