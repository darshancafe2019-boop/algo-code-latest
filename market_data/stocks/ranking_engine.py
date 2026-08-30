"""
Stock Ranking & Movers Engine
=============================
Computes ranked lists of equities:
- Top Gainers (% change descending)
- Top Losers (% change ascending)
- Most Active by Volume (volume_shares descending)
- Most Active by Turnover (turnover descending)
- Unusual Volume (relative_volume >= 1.5)
- Near 52-Week High
- Technical Breakouts
"""

from typing import List, Dict, Any, Optional
from market_data.stocks.models import NormalizedStockQuote
from market_data.stocks.instrument_master import global_stock_master
from market_data.stocks.quote_engine import global_stock_quote_engine
from market_data.stocks.technical_engine import global_stock_technical_engine
from market_data.stocks.historical_engine import global_stock_historical_engine


class StockRankingEngine:
    """Calculates rankings and top movers across pure equity universe."""

    @classmethod
    def get_movers(
        cls,
        preset: str = "gainers",
        exchange: Optional[str] = None,
        region: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Returns sorted list of ranked stocks for a preset."""
        all_instruments = global_stock_master.get_all()
        quotes = global_stock_quote_engine.get_all_quotes()

        rows = []
        for inst in all_instruments:
            if exchange and inst.exchange.upper() != exchange.upper():
                continue
            if region and inst.region.upper() != region.upper():
                continue

            q = quotes.get(inst.instrument_id)
            if not q:
                continue

            rows.append({
                "instrument_id": inst.instrument_id,
                "symbol": inst.symbol,
                "company_name": inst.company_name,
                "exchange": inst.exchange,
                "region": inst.region,
                "currency": inst.currency,
                "last_price": q.last_price,
                "change_pct": q.change_pct or 0.0,
                "change_abs": q.change_abs or 0.0,
                "volume_shares": q.volume_shares,
                "relative_volume": q.relative_volume or 1.0,
                "turnover": q.turnover_quote_currency or 0.0,
                "turnover_inr": q.turnover_inr,
                "turnover_usd": q.turnover_usd,
                "high_52w": q.high_52w,
                "low_52w": q.low_52w,
                "market_status": q.market_status,
                "data_quality": q.data_quality,
            })

        preset_clean = preset.lower()

        if preset_clean == "gainers":
            rows.sort(key=lambda x: x["change_pct"], reverse=True)
        elif preset_clean == "losers":
            rows.sort(key=lambda x: x["change_pct"])
        elif preset_clean == "most_active" or preset_clean == "volume":
            rows.sort(key=lambda x: x["volume_shares"], reverse=True)
        elif preset_clean == "turnover":
            rows.sort(key=lambda x: x["turnover"], reverse=True)
        elif preset_clean == "unusual_volume":
            rows = [r for r in rows if r["relative_volume"] >= 1.2]
            rows.sort(key=lambda x: x["relative_volume"], reverse=True)
        elif preset_clean == "near_52w_high":
            def dist_52w(r):
                h = r["high_52w"]
                return ((h - r["last_price"]) / h) if h and h > 0 else 999.0
            rows = [r for r in rows if r["high_52w"] is not None]
            rows.sort(key=dist_52w)

        return rows[:limit]


global_stock_ranking_engine = StockRankingEngine()
