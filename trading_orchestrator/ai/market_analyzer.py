"""
AI Market Analyzer
==================
Analyzes market regime, trend direction, support/resistance breakout signals,
and options volatility skew using quantitative rules and indicators.
"""

from __future__ import annotations

from typing import Dict, Any, List, Optional


class MarketAnalyzer:
    """Quantitative analyzer providing regime classification and setup scoring."""

    @classmethod
    def analyze_symbol(
        cls,
        symbol: str,
        snapshot: Dict[str, Any],
        key_levels: Dict[str, Any],
        regime: Dict[str, Any]
    ) -> Dict[str, Any]:
        ltp = float(snapshot.get("ltp", 0.0))
        chg = float(snapshot.get("change_pct", 0.0))
        pivot = float(key_levels.get("pivot", ltp))
        r1 = float(key_levels.get("r1", ltp * 1.01))
        s1 = float(key_levels.get("s1", ltp * 0.99))
        iv = float(snapshot.get("iv", 15.0))

        # Determine structural bias
        if ltp > r1 or chg > 0.6:
            bias = "BULLISH_BREAKOUT"
            setup = "MOMENTUM_LONG"
            confidence = min(0.92, 0.70 + abs(chg) * 0.15)
        elif ltp < s1 or chg < -0.6:
            bias = "BEARISH_BREAKDOWN"
            setup = "MOMENTUM_SHORT"
            confidence = min(0.92, 0.70 + abs(chg) * 0.15)
        elif abs(ltp - pivot) / (pivot or 1.0) < 0.003:
            bias = "CONSOLIDATION_AT_PIVOT"
            setup = "IRON_CONDOR_OR_STRADDLE" if iv > 18.0 else "RANGE_SCALP"
            confidence = 0.68
        else:
            bias = "RANGE_BOUND"
            setup = "MEAN_REVERSION"
            confidence = 0.60

        return {
            "symbol": symbol,
            "ltp": ltp,
            "bias": bias,
            "candidate_setup": setup,
            "confidence": round(confidence, 2),
            "iv": iv,
            "pivot": pivot,
            "support": s1,
            "resistance": r1,
        }
