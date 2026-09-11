"""
Quant.OS Multi-Market Session and Instrument Status Engine
==========================================================
Authoritative real-time session evaluator and status manager across:
- Indian Equities & Derivatives (NSE / BSE)
- Crypto Spot & Derivatives (Delta Exchange, Binance 24/7)
- Global Markets (US Equities, CME)
"""

from __future__ import annotations

import logging
from datetime import datetime, time, timezone, timedelta
from typing import Dict, Any, Optional

logger = logging.getLogger("MarketStatusEngine")

# Canonical Market Statuses
STATUS_LIVE = "LIVE"
STATUS_PRE_OPEN = "PRE_OPEN"
STATUS_OPEN = "OPEN"
STATUS_CLOSED = "CLOSED"
STATUS_AFTER_HOURS = "AFTER_HOURS"
STATUS_HALTED = "HALTED"
STATUS_STALE = "STALE"
STATUS_DISCONNECTED = "DISCONNECTED"
STATUS_UNAVAILABLE = "UNAVAILABLE"

# IST Timezone (UTC + 5:30)
IST = timezone(timedelta(hours=5, minutes=30))
EST = timezone(timedelta(hours=-5))  # Standard US Eastern


class MarketStatusEngine:
    """Evaluates exchange trading sessions and instrument states deterministically."""

    @staticmethod
    def get_indian_market_session(dt: Optional[datetime] = None) -> Dict[str, Any]:
        """
        Calculates authoritative NSE/BSE equity & derivative market session.
        NSE Schedule (IST):
          09:00 - 09:08: Pre-Open
          09:08 - 09:15: Pre-Open matching
          09:15 - 15:30: Normal Trading Hours (OPEN)
          15:30 - 15:40: Closing Price Calculation
          15:40 - 16:00: Post-Close (AFTER_HOURS)
          16:00 - 09:00: CLOSED
        Weekend: CLOSED
        """
        now_ist = dt.astimezone(IST) if dt else datetime.now(IST)
        weekday = now_ist.weekday()  # Monday = 0, Sunday = 6

        if weekday in (5, 6):
            return {
                "market": "NSE_BSE",
                "session": STATUS_CLOSED,
                "is_trading_open": False,
                "reason": "Weekend Closed",
                "current_time_ist": now_ist.strftime("%Y-%m-%d %H:%M:%S IST"),
            }

        t = now_ist.time()

        if time(9, 0) <= t < time(9, 15):
            return {
                "market": "NSE_BSE",
                "session": STATUS_PRE_OPEN,
                "is_trading_open": False,
                "reason": "Pre-Market Discovery / Order Collection",
                "current_time_ist": now_ist.strftime("%Y-%m-%d %H:%M:%S IST"),
            }
        elif time(9, 15) <= t < time(15, 30):
            return {
                "market": "NSE_BSE",
                "session": STATUS_OPEN,
                "is_trading_open": True,
                "reason": "Regular Trading Session",
                "current_time_ist": now_ist.strftime("%Y-%m-%d %H:%M:%S IST"),
            }
        elif time(15, 30) <= t < time(16, 0):
            return {
                "market": "NSE_BSE",
                "session": STATUS_AFTER_HOURS,
                "is_trading_open": False,
                "reason": "Post-Market Closing Session",
                "current_time_ist": now_ist.strftime("%Y-%m-%d %H:%M:%S IST"),
            }
        else:
            return {
                "market": "NSE_BSE",
                "session": STATUS_CLOSED,
                "is_trading_open": False,
                "reason": "Market Closed",
                "current_time_ist": now_ist.strftime("%Y-%m-%d %H:%M:%S IST"),
            }

    @staticmethod
    def get_crypto_session(dt: Optional[datetime] = None) -> Dict[str, Any]:
        """Crypto markets operate 24/7/365 continuously."""
        now_utc = dt.astimezone(timezone.utc) if dt else datetime.now(timezone.utc)
        return {
            "market": "CRYPTO_24_7",
            "session": STATUS_OPEN,
            "is_trading_open": True,
            "reason": "Continuous 24/7 Global Trading",
            "current_time_utc": now_utc.strftime("%Y-%m-%d %H:%M:%S UTC"),
        }

    @classmethod
    def evaluate_instrument_status(
        cls,
        market: str,
        last_tick_timestamp: Optional[str] = None,
        provider_status: str = "LIVE",
        is_halted: bool = False,
        stale_threshold_sec: float = 15.0,
    ) -> str:
        """
        Determines the authoritative instrument status combining exchange session,
        provider connectivity, and data freshness.
        """
        if is_halted:
            return STATUS_HALTED

        if provider_status in ("DISCONNECTED", "AUTH_FAILED", "ERROR"):
            return STATUS_DISCONNECTED

        if not last_tick_timestamp:
            return STATUS_UNAVAILABLE

        # Check data freshness
        try:
            ts = datetime.fromisoformat(last_tick_timestamp.replace("Z", "+00:00"))
            age = (datetime.now(timezone.utc) - ts).total_seconds()
            if age > stale_threshold_sec:
                return STATUS_STALE
        except Exception:
            return STATUS_STALE

        # Check exchange session
        market_upper = market.upper()
        if "CRYPTO" in market_upper:
            return STATUS_LIVE

        if market_upper in ("STOCKS", "STOCK_FUTURES", "STOCK_OPTIONS", "INDICES", "NSE", "BSE", "INDIA"):
            session_info = cls.get_indian_market_session()
            if session_info["session"] == STATUS_OPEN:
                return STATUS_LIVE
            elif session_info["session"] == STATUS_PRE_OPEN:
                return STATUS_PRE_OPEN
            elif session_info["session"] == STATUS_AFTER_HOURS:
                return STATUS_AFTER_HOURS
            else:
                return STATUS_CLOSED

        return STATUS_LIVE


global_market_status_engine = MarketStatusEngine()
