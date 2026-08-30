"""
Timezone, Session & Timestamp Utilities
=======================================
Enforces strict UTC ISO-8601 timestamps and market session conversions.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional


def now_utc_iso() -> str:
    """Returns current UTC ISO-8601 timestamp."""
    return datetime.now(timezone.utc).isoformat()


def parse_iso_timestamp(ts_str: Optional[str]) -> Optional[datetime]:
    """Safely parses ISO timestamp string into timezone-aware datetime."""
    if not ts_str:
        return None
    try:
        dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def is_timestamp_stale(ts_str: Optional[str], max_age_seconds: float = 60.0) -> bool:
    """Checks if a timestamp is older than max_age_seconds."""
    dt = parse_iso_timestamp(ts_str)
    if not dt:
        return True
    age = (datetime.now(timezone.utc) - dt).total_seconds()
    return age > max_age_seconds


def format_session_time(dt: Optional[datetime], tz_offset_hours: float = 5.5) -> str:
    """Formats datetime in local market session time (default IST +5:30)."""
    if not dt:
        dt = datetime.now(timezone.utc)
    local_dt = dt + timedelta(hours=tz_offset_hours)
    return local_dt.strftime("%H:%M:%S")
