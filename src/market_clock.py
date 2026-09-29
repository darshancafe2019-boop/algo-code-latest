"""
Quant.OS Authoritative Market Clock & Exchange Timezone Engine
=============================================================
Provides precise, exchange-aware timestamp and calendar operations:
1. Indian Markets (NSE, BSE, MCX): Asia/Kolkata (IST, UTC+5:30)
   - Trading session: 09:15 - 15:30 IST
   - Derivative expiry cutoff: 15:30:00 IST (10:00:00 UTC)
2. Global Crypto Markets (Delta Exchange, Binance, Deribit): UTC
   - Continuous 24/7 trading
   - Delta Daily/Weekly Options settlement: 17:30:00 IST (12:00:00 UTC)
   - Deribit Options settlement: 08:00:00 UTC

Guarantees zero reliance on browser local time or ungrounded UTC date assumptions.
"""

from __future__ import annotations

import logging
from datetime import datetime, date, time as dtime, timezone, timedelta
from typing import Optional, Tuple, Union

try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo  # type: ignore

logger = logging.getLogger("MarketClock")

# Canonical Exchange Timezones
TIMEZONE_INDIA = ZoneInfo("Asia/Kolkata")
TIMEZONE_UTC = timezone.utc
TIMEZONE_US_EASTERN = ZoneInfo("America/New_York")


class MarketClock:
    """Exchange-aware authoritative market clock and settlement timer."""

    @classmethod
    def get_exchange_timezone(cls, exchange_or_provider: str = "NSE") -> Union[ZoneInfo, timezone]:
        """Resolves the authoritative timezone for a given exchange or broker provider."""
        ex = (exchange_or_provider or "NSE").upper().strip()
        if ex in (
            "NSE", "BSE", "MCX", "UPSTOX", "DHAN", "ZERODHA", "ANGELONE",
            "FYERS", "INDIAN_OPTIONS", "INDIAN_FUTURES", "INDIAN_STOCKS", "NSE_FO", "NSE_EQ"
        ):
            return TIMEZONE_INDIA
        elif ex in ("US_STOCKS", "NASDAQ", "NYSE", "ALPACA", "IEX"):
            return TIMEZONE_US_EASTERN
        else:
            # Default for Crypto / Global Forex
            return TIMEZONE_UTC

    @classmethod
    def now(cls, exchange_or_provider: str = "NSE") -> datetime:
        """Returns the current datetime in the exchange's authoritative timezone."""
        tz = cls.get_exchange_timezone(exchange_or_provider)
        return datetime.now(tz)

    @classmethod
    def now_utc(cls) -> datetime:
        """Returns the current UTC datetime."""
        return datetime.now(timezone.utc)

    @classmethod
    def trading_date(cls, exchange_or_provider: str = "NSE") -> str:
        """Returns the current trading date formatted as 'YYYY-MM-DD' in the exchange's timezone."""
        return cls.now(exchange_or_provider).strftime("%Y-%m-%d")

    @classmethod
    def trading_date_obj(cls, exchange_or_provider: str = "NSE") -> date:
        """Returns the current trading date as a date object in the exchange's timezone."""
        return cls.now(exchange_or_provider).date()

    @classmethod
    def is_trading_day(cls, date_val: Optional[Union[date, str]] = None, exchange_or_provider: str = "NSE") -> bool:
        """
        Determines if the given date (default: today) is a trading day (Monday-Friday for traditional exchanges).
        Crypto is always 24/7.
        """
        ex = (exchange_or_provider or "NSE").upper()
        if any(c in ex for c in ("CRYPTO", "DELTA", "BINANCE", "BYBIT", "OKX")):
            return True

        if date_val is None:
            d_obj = cls.trading_date_obj(exchange_or_provider)
        elif isinstance(date_val, str):
            d_obj = datetime.strptime(date_val.strip()[:10], "%Y-%m-%d").date()
        else:
            d_obj = date_val

        # Monday = 0, Sunday = 6
        return d_obj.weekday() < 5

    @classmethod
    def get_expiry_settlement_cutoff(
        cls,
        expiry_str: str,
        exchange_or_provider: str = "NSE",
        underlying: str = "NIFTY",
    ) -> datetime:
        """
        Calculates the exact UTC settlement datetime for a contract expiry date.
        
        Cutoff rules:
        - NSE / Indian Derivatives: 15:30:00 IST on expiry day (= 10:00:00 UTC)
        - Delta Crypto Options: 17:30:00 IST on expiry day (= 12:00:00 UTC)
        - Binance / Other Crypto: 08:00:00 UTC or 23:59:59 UTC
        """
        clean_exp = expiry_str.strip()[:10]
        year, month, day = [int(p) for p in clean_exp.split("-")]

        ex = (exchange_or_provider or "NSE").upper()
        und = (underlying or "").upper()

        if "DELTA" in ex or und in ("BTC", "ETH", "SOL", "XRP", "BNB"):
            # Delta settlement is 12:00:00 UTC (17:30 IST)
            return datetime(year, month, day, 12, 0, 0, tzinfo=timezone.utc)
        elif ex in ("NSE", "BSE", "UPSTOX", "DHAN", "ZERODHA", "ANGELONE", "FYERS", "NSE_FO") or "INDIAN" in ex:
            # NSE settlement is 15:30:00 IST = 10:00:00 UTC
            return datetime(year, month, day, 10, 0, 0, tzinfo=timezone.utc)
        elif ex in ("US_STOCKS", "NASDAQ", "NYSE"):
            # US 16:00 ET = 20:00 UTC (or 21:00 UTC depending on DST)
            local_dt = datetime(year, month, day, 16, 0, 0, tzinfo=TIMEZONE_US_EASTERN)
            return local_dt.astimezone(timezone.utc)
        else:
            # Default to end of day UTC
            return datetime(year, month, day, 23, 59, 59, tzinfo=timezone.utc)

    @classmethod
    def is_contract_expired(
        cls,
        expiry_str: Optional[str],
        exchange_or_provider: str = "NSE",
        underlying: str = "NIFTY",
        reference_time_utc: Optional[datetime] = None,
    ) -> bool:
        """
        Determines whether a contract is expired based on current market time.
        Perpetual / Spot contracts never expire.
        """
        if not expiry_str or expiry_str.upper() in ("PERPETUAL", "PERP", "SPOT", "NONE", ""):
            return False

        now_utc = reference_time_utc or cls.now_utc()
        try:
            cutoff_utc = cls.get_expiry_settlement_cutoff(
                expiry_str, exchange_or_provider=exchange_or_provider, underlying=underlying
            )
            return now_utc >= cutoff_utc
        except Exception as e:
            logger.warning("Error calculating contract expiration for '%s': %s", expiry_str, e)
            # Fail-safe: if date parsing fails, compare against YYYY-MM-DD
            try:
                today_str = cls.trading_date(exchange_or_provider)
                return expiry_str.strip()[:10] < today_str
            except Exception:
                return True

    @classmethod
    def get_days_and_seconds_to_expiry(
        cls,
        expiry_str: str,
        exchange_or_provider: str = "NSE",
        underlying: str = "NIFTY",
        reference_time_utc: Optional[datetime] = None,
    ) -> Tuple[int, float]:
        """
        Returns (days_to_expiry, seconds_to_expiry).
        If expired, seconds_to_expiry <= 0.
        """
        if not expiry_str or expiry_str.upper() in ("PERPETUAL", "PERP", "SPOT", "NONE", ""):
            return 9999, 999999999.0

        now_utc = reference_time_utc or cls.now_utc()
        cutoff_utc = cls.get_expiry_settlement_cutoff(
            expiry_str, exchange_or_provider=exchange_or_provider, underlying=underlying
        )
        seconds_diff = (cutoff_utc - now_utc).total_seconds()
        days_diff = max(0, int(seconds_diff // 86400))
        return days_diff, seconds_diff
