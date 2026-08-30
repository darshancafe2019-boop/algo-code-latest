"""
Stock Quote Engine
==================
Maintains the latest validated live quote snapshots for all registered stocks.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from market_data.stocks.models import NormalizedStockQuote
from market_data.stocks.instrument_master import global_stock_master
from market_data.stocks.normalization import StockQuoteNormalizer


class StockQuoteEngine:
    """Central Live Quote Repository & Dispatcher."""

    def __init__(self):
        self._quotes: Dict[str, NormalizedStockQuote] = {}
        self._seed_baseline_quotes()

    def _seed_baseline_quotes(self) -> None:
        """Seeds realistic baseline live prices for all registered stocks."""
        now_utc = datetime.now(timezone.utc).isoformat()
        
        # Standard realistic baseline prices for top global & Indian equities
        sample_quotes = {
            "RELIANCE": {"last": 2845.50, "open": 2825.0, "high": 2865.0, "low": 2820.0, "prev": 2810.0, "vol": 4500000.0, "avg_vol": 4200000.0, "high_52w": 3217.0, "low_52w": 2220.0, "mcap": 19200000000000.0},
            "TCS": {"last": 3890.0, "open": 3910.0, "high": 3920.0, "low": 3870.0, "prev": 3908.0, "vol": 2100000.0, "avg_vol": 2300000.0, "high_52w": 4585.0, "low_52w": 3315.0, "mcap": 14100000000000.0},
            "HDFCBANK": {"last": 1640.0, "open": 1635.0, "high": 1655.0, "low": 1630.0, "prev": 1635.0, "vol": 6200000.0, "avg_vol": 7000000.0, "high_52w": 1794.0, "low_52w": 1363.0, "mcap": 12500000000000.0},
            "INFY": {"last": 1780.0, "open": 1770.0, "high": 1795.0, "low": 1765.0, "prev": 1765.0, "vol": 3800000.0, "avg_vol": 4100000.0, "high_52w": 1991.0, "low_52w": 1358.0, "mcap": 7400000000000.0},
            "ICICIBANK": {"last": 1220.0, "open": 1210.0, "high": 1232.0, "low": 1208.0, "prev": 1212.0, "vol": 5100000.0, "avg_vol": 5500000.0, "high_52w": 1310.0, "low_52w": 915.0, "mcap": 8600000000000.0},
            "BHARTIARTL": {"last": 1580.0, "open": 1565.0, "high": 1595.0, "low": 1560.0, "prev": 1555.0, "vol": 3400000.0, "avg_vol": 3100000.0, "high_52w": 1712.0, "low_52w": 845.0, "mcap": 9400000000000.0},
            "SBIN": {"last": 815.0, "open": 810.0, "high": 822.0, "low": 808.0, "prev": 809.0, "vol": 9500000.0, "avg_vol": 11000000.0, "high_52w": 912.0, "low_52w": 555.0, "mcap": 7250000000000.0},
            "ITC": {"last": 485.0, "open": 482.0, "high": 489.0, "low": 481.0, "prev": 482.5, "vol": 8200000.0, "avg_vol": 9000000.0, "high_52w": 528.0, "low_52w": 399.0, "mcap": 6050000000000.0},
            "LT": {"last": 3650.0, "open": 3620.0, "high": 3680.0, "low": 3610.0, "prev": 3600.0, "vol": 1800000.0, "avg_vol": 1950000.0, "high_52w": 3919.0, "low_52w": 2865.0, "mcap": 5010000000000.0},
            "TATAMOTORS": {"last": 980.0, "open": 975.0, "high": 995.0, "low": 970.0, "prev": 968.0, "vol": 7200000.0, "avg_vol": 8000000.0, "high_52w": 1179.0, "low_52w": 593.0, "mcap": 3600000000000.0},
            "ZOMATO": {"last": 245.0, "open": 240.0, "high": 252.0, "low": 239.0, "prev": 238.0, "vol": 25000000.0, "avg_vol": 22000000.0, "high_52w": 298.0, "low_52w": 88.0, "mcap": 2200000000000.0},
            "TRENT": {"last": 6850.0, "open": 6780.0, "high": 6920.0, "low": 6750.0, "prev": 6720.0, "vol": 1200000.0, "avg_vol": 950000.0, "high_52w": 8345.0, "low_52w": 1950.0, "mcap": 2430000000000.0},

            # US Equities
            "AAPL": {"last": 228.50, "open": 226.0, "high": 230.0, "low": 225.5, "prev": 226.5, "vol": 48000000.0, "avg_vol": 52000000.0, "high_52w": 237.23, "low_52w": 164.08, "mcap": 3500000000000.0},
            "MSFT": {"last": 445.00, "open": 442.0, "high": 448.0, "low": 441.0, "prev": 441.5, "vol": 18000000.0, "avg_vol": 21000000.0, "high_52w": 468.35, "low_52w": 309.45, "mcap": 3300000000000.0},
            "NVDA": {"last": 124.80, "open": 122.0, "high": 127.5, "low": 121.0, "prev": 121.5, "vol": 75000000.0, "avg_vol": 82000000.0, "high_52w": 140.76, "low_52w": 39.23, "mcap": 3080000000000.0},
            "GOOGL": {"last": 168.20, "open": 166.5, "high": 170.0, "low": 166.0, "prev": 167.0, "vol": 22000000.0, "avg_vol": 24000000.0, "high_52w": 191.75, "low_52w": 120.21, "mcap": 2100000000000.0},
            "AMZN": {"last": 182.50, "open": 180.0, "high": 184.0, "low": 179.5, "prev": 180.2, "vol": 32000000.0, "avg_vol": 35000000.0, "high_52w": 201.20, "low_52w": 118.35, "mcap": 1920000000000.0},
            "META": {"last": 520.00, "open": 512.0, "high": 525.0, "low": 510.0, "prev": 510.0, "vol": 14000000.0, "avg_vol": 16000000.0, "high_52w": 544.23, "low_52w": 274.38, "mcap": 1320000000000.0},
            "TSLA": {"last": 215.00, "open": 210.0, "high": 218.0, "low": 208.0, "prev": 209.0, "vol": 58000000.0, "avg_vol": 65000000.0, "high_52w": 271.00, "low_52w": 138.80, "mcap": 685000000000.0},
            "PLTR": {"last": 31.40, "open": 30.5, "high": 32.2, "low": 30.2, "prev": 30.1, "vol": 42000000.0, "avg_vol": 35000000.0, "high_52w": 33.12, "low_52w": 14.48, "mcap": 69000000000.0},
        }

        for sym, q in sample_quotes.items():
            ex = "NSE" if q["last"] > 300 and sym not in ["MSFT", "META"] else "NASDAQ"
            if sym in ["JPM", "V", "WMT", "PLTR"]:
                ex = "NYSE"
            curr = "INR" if ex == "NSE" else "USD"
            inst_id = f"{ex.lower()}:{ex}:{sym}"

            norm = StockQuoteNormalizer.normalize_quote(
                raw={
                    "last_price": q["last"],
                    "open": q["open"],
                    "high": q["high"],
                    "low": q["low"],
                    "previous_close": q["prev"],
                    "volume": q["vol"],
                    "high_52w": q["high_52w"],
                    "low_52w": q["low_52w"],
                    "market_cap": q["mcap"],
                },
                instrument_id=inst_id,
                symbol=sym,
                exchange=ex,
                currency=curr,
                provider="upstox" if curr == "INR" else "yahoo",
                avg_volume_30d=q["avg_vol"]
            )
            self._quotes[inst_id] = norm

    def update_quote(self, quote: NormalizedStockQuote) -> None:
        self._quotes[quote.instrument_id] = quote

    def get_quote(self, instrument_id: str) -> Optional[NormalizedStockQuote]:
        return self._quotes.get(instrument_id)

    def get_quotes_batch(self, instrument_ids: List[str]) -> Dict[str, NormalizedStockQuote]:
        return {iid: self._quotes[iid] for iid in instrument_ids if iid in self._quotes}

    def get_all_quotes(self) -> Dict[str, NormalizedStockQuote]:
        return dict(self._quotes)


global_stock_quote_engine = StockQuoteEngine()
