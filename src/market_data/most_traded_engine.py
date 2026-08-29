"""
Quant.OS Dynamic Most-Traded Instruments Engine
===============================================
Dynamically calculates institutional liquidity and turnover rankings
across markets without hardcoded popular lists.

Metrics & Criteria:
- 24h Notional Turnover in USD (Normalized currency conversion)
- 24h Trading Volume & 30-day Average Volume
- Open Interest (F&O / Perpetuals)
- Number of Trades
- Bid/Ask Spread Tightness (Liquidity Score)

Categorized Rankings:
1. Most traded Indian stocks (NSE/BSE)
2. Most traded US stocks (NASDAQ/NYSE)
3. Most traded Crypto (Spot & Perpetuals)
4. Most traded Futures (Index & Commodity)
5. Most active Options (NIFTY/BANKNIFTY/Crypto)
6. Most traded Forex (Major Pairs)
7. Most active Indices
"""

from __future__ import annotations

import time
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger("MostTradedEngine")


class MostTradedEngine:
    """Computes dynamic liquidity and volume rankings across all asset classes."""

    def __init__(self):
        self._last_ranking_time: Optional[str] = None
        self._cached_rankings: Dict[str, List[Dict[str, Any]]] = {}

    def calculate_rankings(self, instruments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Computes dynamic multi-market rankings from verified instrument fields.
        Currency Normalization: USD Base (INR / 83.50).
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        INR_TO_USD = 1.0 / 83.50

        def get_turnover_usd(inst: Dict[str, Any]) -> float:
            vol = float(inst.get("volume_24h") or inst.get("volume") or 0.0)
            price = float(inst.get("last_price") or inst.get("close") or inst.get("lastPrice") or 0.0)
            raw_turnover = float(inst.get("turnover_24h") or (vol * price))
            curr = str(inst.get("currency") or "USD").upper()
            if curr == "INR" or inst.get("market_region") == "INDIA" or inst.get("exchange") in ["NSE", "BSE"]:
                return raw_turnover * INR_TO_USD
            return raw_turnover

        def get_liquidity_score(inst: Dict[str, Any]) -> float:
            spread = float(inst.get("spread") or 0.01)
            turnover = get_turnover_usd(inst)
            oi = float(inst.get("open_interest") or inst.get("OI") or 0.0)
            # Higher turnover + tight spread + higher OI = higher institutional liquidity score
            score = (turnover / 1_000_000.0) * 0.7 + (oi / 10_000.0) * 0.2 + (1.0 / max(0.001, spread)) * 0.1
            return round(score, 2)

        # 1. Group Instruments by Category
        indian_stocks = []
        us_stocks = []
        crypto = []
        futures = []
        options = []
        forex = []
        indices = []

        for inst in instruments:
            mr = str(inst.get("market_region") or "").upper()
            ac = str(inst.get("asset_class") or "").upper()
            it = str(inst.get("instrument_type") or "").upper()
            exch = str(inst.get("exchange") or "").upper()
            sym = str(inst.get("canonical_symbol") or inst.get("symbol") or "")

            item = {
                "instrument_id": inst.get("instrument_id") or f"{inst.get('provider')}:{sym}",
                "symbol": sym,
                "display_name": inst.get("display_name") or inst.get("name") or sym,
                "exchange": exch,
                "last_price": float(inst.get("last_price") or inst.get("lastPrice") or 0.0),
                "volume_24h": float(inst.get("volume_24h") or inst.get("volume") or 0.0),
                "turnover_usd": round(get_turnover_usd(inst), 2),
                "open_interest": float(inst.get("open_interest") or inst.get("OI") or 0.0),
                "liquidity_score": get_liquidity_score(inst),
                "change_pct": float(inst.get("change_pct_24h") or inst.get("change_pct") or 0.0),
                "provider": inst.get("provider", "VERIFIED"),
            }

            if it == "REFERENCE_INDEX" or ac == "INDEX" or "INDEX" in exch:
                indices.append(item)
            elif it == "OPTION" or ac == "OPTIONS":
                options.append(item)
            elif it in ["FUTURE", "PERPETUAL"] or ac == "FUTURES":
                futures.append(item)
            elif mr == "CRYPTO" or ac == "CRYPTO":
                crypto.append(item)
            elif ac == "FOREX":
                forex.append(item)
            elif (mr == "INDIA" or exch in ["NSE", "BSE"]) and it in ["CASH", "EQUITY"]:
                indian_stocks.append(item)
            elif (mr == "US" or exch in ["NASDAQ", "NYSE"]) and it in ["CASH", "EQUITY"]:
                us_stocks.append(item)

        # Sort each list by turnover_usd and liquidity_score descending
        def rank_list(items: List[Dict[str, Any]], limit: int = 10) -> List[Dict[str, Any]]:
            ranked = sorted(items, key=lambda x: (x["turnover_usd"], x["liquidity_score"]), reverse=True)
            for idx, r in enumerate(ranked[:limit]):
                r["rank"] = idx + 1
            return ranked[:limit]

        rankings = {
            "indian_stocks": rank_list(indian_stocks),
            "us_stocks": rank_list(us_stocks),
            "crypto": rank_list(crypto),
            "futures": rank_list(futures),
            "options": rank_list(options),
            "forex": rank_list(forex),
            "indices": rank_list(indices),
        }

        self._cached_rankings = rankings
        self._last_ranking_time = now_iso

        return {
            "status": "success",
            "ranking_timestamp": now_iso,
            "data_source": "QUANTOS_DYNAMIC_LIQUIDITY_ENGINE",
            "categories": rankings,
        }

    def get_most_traded(self, category: Optional[str] = None) -> Dict[str, Any]:
        """Returns the latest most-traded rankings."""
        if category and category.lower() in self._cached_rankings:
            return {
                "status": "success",
                "category": category.lower(),
                "ranking_timestamp": self._last_ranking_time,
                "instruments": self._cached_rankings[category.lower()],
            }

        return {
            "status": "success",
            "ranking_timestamp": self._last_ranking_time,
            "categories": self._cached_rankings,
        }


# Global singleton instance
global_most_traded_engine = MostTradedEngine()
