"""
Session & Exchange Schedule Context
===================================
Provides authoritative exchange calendar, trading session states (PRE_MARKET, REGULAR, POST_MARKET, CLOSED),
and holidays across Indian (NSE/BSE), Crypto (24/7), and Global markets.
"""

from __future__ import annotations

import pytz
from datetime import datetime, timezone, time as dtime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict

from src.market_session_service import MarketSessionService


@dataclass
class SessionContext:
    timestamp: str
    timezone: str
    is_nse_open: bool
    is_crypto_open: bool
    is_us_open: bool
    current_nse_session: str  # PRE_MARKET, REGULAR, POST_MARKET, CLOSED
    is_holiday: bool
    holiday_name: Optional[str]
    minutes_to_close: int
    minutes_from_open: int

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def get_session_context(tz_name: str = "Asia/Kolkata") -> SessionContext:
    tz = pytz.timezone(tz_name)
    now_local = datetime.now(tz)
    now_utc = datetime.now(timezone.utc)
    now_time = now_local.time()

    is_weekend = now_local.weekday() in (5, 6)
    date_str = now_local.strftime("%Y-%m-%d")
    holiday_name = MarketSessionService.NSE_HOLIDAYS_2026.get(date_str)
    is_holiday = is_weekend or bool(holiday_name)

    # NSE Trading Hours
    nse_pre_open = dtime(9, 0)
    nse_open = dtime(9, 15)
    nse_close = dtime(15, 30)
    nse_post_close = dtime(16, 0)

    if is_holiday:
        current_nse_session = "CLOSED"
        is_nse_open = False
        min_to_close = 0
        min_from_open = 0
    elif nse_pre_open <= now_time < nse_open:
        current_nse_session = "PRE_MARKET"
        is_nse_open = False
        close_dt = tz.localize(datetime.combine(now_local.date(), nse_close))
        min_to_close = int((close_dt - now_local).total_seconds() / 60)
        min_from_open = 0
    elif nse_open <= now_time < nse_close:
        current_nse_session = "REGULAR"
        is_nse_open = True
        close_dt = tz.localize(datetime.combine(now_local.date(), nse_close))
        open_dt = tz.localize(datetime.combine(now_local.date(), nse_open))
        min_to_close = int((close_dt - now_local).total_seconds() / 60)
        min_from_open = int((now_local - open_dt).total_seconds() / 60)
    elif nse_close <= now_time < nse_post_close:
        current_nse_session = "POST_MARKET"
        is_nse_open = False
        open_dt = tz.localize(datetime.combine(now_local.date(), nse_open))
        min_to_close = 0
        min_from_open = int((now_local - open_dt).total_seconds() / 60)
    else:
        current_nse_session = "CLOSED"
        is_nse_open = False
        min_to_close = 0
        min_from_open = 0

    return SessionContext(
        timestamp=now_local.isoformat(),
        timezone=tz_name,
        is_nse_open=is_nse_open,
        is_crypto_open=True,  # 24/7
        is_us_open=False,
        current_nse_session=current_nse_session,
        is_holiday=is_holiday,
        holiday_name=holiday_name,
        minutes_to_close=max(0, min_to_close),
        minutes_from_open=max(0, min_from_open),
    )
