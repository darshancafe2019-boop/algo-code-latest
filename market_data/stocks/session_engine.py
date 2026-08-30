"""
Stock Market Session & Timezone Engine
======================================
Tracks exchange market sessions (Pre-Market, Regular Trading, Post-Market, Closed)
and handles market hours for Indian (NSE/BSE) and US (NYSE/NASDAQ) exchanges.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from market_data.stocks.enums import MarketSessionStatus


class StockSessionEngine:
    """Calculates active session status based on exchange local time."""

    @staticmethod
    def get_session_status(exchange: str) -> Dict[str, Any]:
        """Calculates current market session status and timezone for the exchange."""
        ex = exchange.upper()
        now_utc = datetime.now(timezone.utc)

        if ex in ["NSE", "BSE"]:
            # Indian Market Hours (IST = UTC + 5:30)
            ist_offset = timedelta(hours=5, minutes=30)
            local_time = now_utc + ist_offset
            weekday = local_time.weekday() # 0 = Monday, 6 = Sunday

            time_str = local_time.strftime("%H:%M")
            is_weekend = weekday >= 5

            if is_weekend:
                status = MarketSessionStatus.CLOSED.value
                desc = "Weekend (Market Closed)"
            elif "09:00" <= time_str < "09:15":
                status = MarketSessionStatus.PRE_MARKET.value
                desc = "Pre-Open Session (09:00 - 09:15 IST)"
            elif "09:15" <= time_str < "15:30":
                status = MarketSessionStatus.REGULAR.value
                desc = "Regular Trading Session (09:15 - 15:30 IST)"
            elif "15:30" <= time_str < "16:00":
                status = MarketSessionStatus.POST_MARKET.value
                desc = "Post-Market Closing (15:30 - 16:00 IST)"
            else:
                status = MarketSessionStatus.CLOSED.value
                desc = "Market Closed"

            return {
                "exchange": ex,
                "timezone": "Asia/Kolkata",
                "local_time": local_time.strftime("%Y-%m-%d %H:%M:%S IST"),
                "status": status,
                "description": desc,
                "is_open": status == MarketSessionStatus.REGULAR.value,
            }

        elif ex in ["NYSE", "NASDAQ", "AMEX"]:
            # US Market Hours (EST = UTC - 4 / -5)
            est_offset = timedelta(hours=-4) # EDT approximation
            local_time = now_utc + est_offset
            weekday = local_time.weekday()

            time_str = local_time.strftime("%H:%M")
            is_weekend = weekday >= 5

            if is_weekend:
                status = MarketSessionStatus.CLOSED.value
                desc = "Weekend (Market Closed)"
            elif "04:00" <= time_str < "09:30":
                status = MarketSessionStatus.PRE_MARKET.value
                desc = "US Pre-Market (04:00 - 09:30 EDT)"
            elif "09:30" <= time_str < "16:00":
                status = MarketSessionStatus.REGULAR.value
                desc = "US Regular Session (09:30 - 16:00 EDT)"
            elif "16:00" <= time_str < "20:00":
                status = MarketSessionStatus.POST_MARKET.value
                desc = "US After-Hours (16:00 - 20:00 EDT)"
            else:
                status = MarketSessionStatus.CLOSED.value
                desc = "Market Closed"

            return {
                "exchange": ex,
                "timezone": "America/New_York",
                "local_time": local_time.strftime("%Y-%m-%d %H:%M:%S EDT"),
                "status": status,
                "description": desc,
                "is_open": status == MarketSessionStatus.REGULAR.value,
            }

        else:
            return {
                "exchange": ex,
                "timezone": "UTC",
                "local_time": now_utc.strftime("%Y-%m-%d %H:%M:%S UTC"),
                "status": MarketSessionStatus.CLOSED.value,
                "description": "Standard Global Session",
                "is_open": False,
            }


global_stock_session_engine = StockSessionEngine()
