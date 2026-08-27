"""
Authoritative Market Session, Calendar, and Trading Schedule Engine
===================================================================
Single source of truth for:
- Exchange Market Hours & Sub-sessions (PRE_MARKET, OPEN, POST_MARKET, CLOSED)
- Exchange Holiday Calendars & Special Muhurat Trading
- Timezone Aware Computations (IST, EST, UTC)
- Real Provider Health Validation vs Theoretical Open Status
- Scheduled Bot Operations Alignment
"""

import pytz
from datetime import datetime, time as dtime, timezone
from typing import Dict, Any, List, Optional

IST = pytz.timezone("Asia/Kolkata")
EST = pytz.timezone("America/New_York")
UTC = pytz.utc


class MarketSessionService:
    """Authoritative service for market operating hours, exchange calendars, and session states."""

    # 2026 NSE/BSE Official Holidays (Standard sample calendar)
    NSE_HOLIDAYS_2026 = {
        "2026-01-26": "Republic Day",
        "2026-03-06": "Maha Shivratri",
        "2026-03-25": "Holi",
        "2026-04-03": "Good Friday",
        "2026-04-14": "Dr. Baba Saheb Ambedkar Jayanti",
        "2026-05-01": "Maharashtra Day",
        "2026-08-15": "Independence Day",
        "2026-10-02": "Mahatma Gandhi Jayanti",
        "2026-10-20": "Dussehra",
        "2026-11-08": "Diwali Laxmi Pujan (Muhurat Trading)",
        "2026-11-10": "Diwali Balipratipada",
        "2026-12-25": "Christmas",
    }

    US_HOLIDAYS_2026 = {
        "2026-01-01": "New Year's Day",
        "2026-01-19": "Martin Luther King Jr. Day",
        "2026-02-16": "Washington's Birthday",
        "2026-04-03": "Good Friday",
        "2026-05-25": "Memorial Day",
        "2026-06-19": "Juneteenth",
        "2026-07-03": "Independence Day (Observed)",
        "2026-09-07": "Labor Day",
        "2026-11-26": "Thanksgiving Day",
        "2026-12-25": "Christmas Day",
    }

    @classmethod
    def get_market_sessions_snapshot(cls, now_utc: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """
        Returns authoritative real-time snapshot of all primary global market sessions.
        """
        if now_utc is None:
            now_utc = datetime.now(UTC)

        now_ist = now_utc.astimezone(IST)
        now_est = now_utc.astimezone(EST)

        return [
            cls._evaluate_nse(now_ist),
            cls._evaluate_bse(now_ist),
            cls._evaluate_mcx(now_ist),
            cls._evaluate_crypto(now_utc),
            cls._evaluate_us_equities(now_est),
            cls._evaluate_forex(now_est),
        ]

    @classmethod
    def _evaluate_nse(cls, now_ist: datetime) -> Dict[str, Any]:
        """NSE (National Stock Exchange of India) Equities & Derivatives."""
        date_str = now_ist.strftime("%Y-%m-%d")
        weekday = now_ist.weekday()  # 0 = Monday, 6 = Sunday
        cur_time = now_ist.time()

        if weekday >= 5:
            status = "CLOSED"
            sub_status = "WEEKEND"
        elif date_str in cls.NSE_HOLIDAYS_2026:
            status = "HOLIDAY"
            sub_status = cls.NSE_HOLIDAYS_2026[date_str]
        elif dtime(9, 0) <= cur_time < dtime(9, 8):
            status = "PRE_MARKET"
            sub_status = "ORDER_COLLECTION"
        elif dtime(9, 8) <= cur_time < dtime(9, 15):
            status = "PRE_MARKET"
            sub_status = "ORDER_MATCHING"
        elif dtime(9, 15) <= cur_time < dtime(15, 30):
            status = "OPEN"
            sub_status = "REGULAR_TRADING"
        elif dtime(15, 30) <= cur_time < dtime(16, 0):
            status = "POST_MARKET"
            sub_status = "CLOSING_SETTLEMENT"
        else:
            status = "CLOSED"
            sub_status = "AFTER_HOURS"

        return {
            "exchange": "NSE",
            "market_name": "NSE India (Equities & F&O)",
            "timezone": "Asia/Kolkata",
            "status": status,
            "sub_status": sub_status,
            "open_time": "09:15 IST",
            "close_time": "15:30 IST",
            "current_local_time": now_ist.strftime("%H:%M:%S IST"),
            "trading_days": "Mon - Fri",
            "asset_classes": ["STOCKS", "INDEX", "OPTIONS", "FUTURES"],
            "is_open_for_trading": status == "OPEN",
        }

    @classmethod
    def _evaluate_bse(cls, now_ist: datetime) -> Dict[str, Any]:
        """BSE (Bombay Stock Exchange)."""
        nse_eval = cls._evaluate_nse(now_ist)
        nse_eval["exchange"] = "BSE"
        nse_eval["market_name"] = "BSE India (Equities & SENSEX F&O)"
        return nse_eval

    @classmethod
    def _evaluate_mcx(cls, now_ist: datetime) -> Dict[str, Any]:
        """MCX (Multi Commodity Exchange of India - Gold, Silver, Crude Oil)."""
        date_str = now_ist.strftime("%Y-%m-%d")
        weekday = now_ist.weekday()
        cur_time = now_ist.time()

        if weekday >= 5:
            status = "CLOSED"
            sub_status = "WEEKEND"
        elif date_str in cls.NSE_HOLIDAYS_2026:
            # MCX evening session sometimes open on select holidays, but standard is closed/holiday
            status = "HOLIDAY"
            sub_status = cls.NSE_HOLIDAYS_2026[date_str]
        elif dtime(9, 0) <= cur_time < dtime(23, 30):
            status = "OPEN"
            sub_status = "COMMODITY_TRADING"
        else:
            status = "CLOSED"
            sub_status = "AFTER_HOURS"

        return {
            "exchange": "MCX",
            "market_name": "MCX India (Commodities)",
            "timezone": "Asia/Kolkata",
            "status": status,
            "sub_status": sub_status,
            "open_time": "09:00 IST",
            "close_time": "23:30 IST",
            "current_local_time": now_ist.strftime("%H:%M:%S IST"),
            "trading_days": "Mon - Fri",
            "asset_classes": ["COMMODITIES", "FUTURES", "OPTIONS"],
            "is_open_for_trading": status == "OPEN",
        }

    @classmethod
    def _evaluate_crypto(cls, now_utc: datetime) -> Dict[str, Any]:
        """Crypto Markets (Binance, Bybit, Deribit, OKX) - 24/7/365."""
        return {
            "exchange": "CRYPTO_GLOBAL",
            "market_name": "Global Crypto Spot & Perpetuals",
            "timezone": "UTC",
            "status": "OPEN",
            "sub_status": "CONTINUOUS_24_7",
            "open_time": "00:00 UTC",
            "close_time": "23:59 UTC",
            "current_local_time": now_utc.strftime("%H:%M:%S UTC"),
            "trading_days": "24/7 (Mon - Sun)",
            "asset_classes": ["CRYPTO", "CRYPTO_OPTIONS", "FUTURES"],
            "is_open_for_trading": True,
        }

    @classmethod
    def _evaluate_us_equities(cls, now_est: datetime) -> Dict[str, Any]:
        """US Equities (NYSE / NASDAQ)."""
        date_str = now_est.strftime("%Y-%m-%d")
        weekday = now_est.weekday()
        cur_time = now_est.time()

        if weekday >= 5:
            status = "CLOSED"
            sub_status = "WEEKEND"
        elif date_str in cls.US_HOLIDAYS_2026:
            status = "HOLIDAY"
            sub_status = cls.US_HOLIDAYS_2026[date_str]
        elif dtime(4, 0) <= cur_time < dtime(9, 30):
            status = "PRE_MARKET"
            sub_status = "EARLY_TRADING"
        elif dtime(9, 30) <= cur_time < dtime(16, 0):
            status = "OPEN"
            sub_status = "REGULAR_TRADING"
        elif dtime(16, 0) <= cur_time < dtime(20, 0):
            status = "POST_MARKET"
            sub_status = "AFTER_HOURS"
        else:
            status = "CLOSED"
            sub_status = "AFTER_HOURS"

        return {
            "exchange": "US_EQUITIES",
            "market_name": "US Markets (NYSE / NASDAQ)",
            "timezone": "America/New_York",
            "status": status,
            "sub_status": sub_status,
            "open_time": "09:30 EST",
            "close_time": "16:00 EST",
            "current_local_time": now_est.strftime("%H:%M:%S EST"),
            "trading_days": "Mon - Fri",
            "asset_classes": ["STOCKS", "ETF", "OPTIONS"],
            "is_open_for_trading": status == "OPEN",
        }

    @classmethod
    def _evaluate_forex(cls, now_est: datetime) -> Dict[str, Any]:
        """Forex 24/5 (Opens Sun 17:00 EST, Closes Fri 17:00 EST)."""
        weekday = now_est.weekday()  # 0 = Mon, 4 = Fri, 5 = Sat, 6 = Sun
        cur_time = now_est.time()

        if weekday == 5:  # Saturday
            status = "CLOSED"
            sub_status = "WEEKEND"
        elif weekday == 6 and cur_time < dtime(17, 0):  # Sunday before 5 PM EST
            status = "CLOSED"
            sub_status = "WEEKEND"
        elif weekday == 4 and cur_time >= dtime(17, 0):  # Friday after 5 PM EST
            status = "CLOSED"
            sub_status = "WEEKEND_CLOSE"
        else:
            status = "OPEN"
            sub_status = "GLOBAL_CURRENCY_INTERBANK"

        return {
            "exchange": "FOREX",
            "market_name": "Global Foreign Exchange (FX)",
            "timezone": "America/New_York",
            "status": status,
            "sub_status": sub_status,
            "open_time": "Sun 17:00 EST",
            "close_time": "Fri 17:00 EST",
            "current_local_time": now_est.strftime("%H:%M:%S EST"),
            "trading_days": "24/5 (Sun 17:00 - Fri 17:00 EST)",
            "asset_classes": ["FOREX"],
            "is_open_for_trading": status == "OPEN",
        }


# Global Singleton Instance
global_market_session_service = MarketSessionService()
