"""
Checkpoint Definitions & Configuration for Daily Automated Trading
===================================================================
Defines canonical market-session phases, default schedules, timezones, and lookup mappings.
Supports:
- PREMARKET_RESEARCH / PRE_MARKET_RESEARCH
- OPENING_SCAN / MARKET_OPEN_SCAN
- MID_SESSION_REVIEW / POSITION_REVIEW
- POSITION_MANAGEMENT / INTRADAY_MANAGEMENT
- FLATTEN_OR_EXIT / CLOSING_MANAGEMENT
- RECONCILIATION_AND_REPORT / END_OF_DAY_REPORT
"""

from __future__ import annotations

from enum import Enum
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict


class CheckpointType(str, Enum):
    # Canonical Phase 2 naming
    PREMARKET_RESEARCH = "PREMARKET_RESEARCH"
    OPENING_SCAN = "OPENING_SCAN"
    MID_SESSION_REVIEW = "MID_SESSION_REVIEW"
    POSITION_MANAGEMENT = "POSITION_MANAGEMENT"
    FLATTEN_OR_EXIT = "FLATTEN_OR_EXIT"
    RECONCILIATION_AND_REPORT = "RECONCILIATION_AND_REPORT"

    # Aliases
    PRE_MARKET_RESEARCH = "PRE_MARKET_RESEARCH"
    MARKET_OPEN_SCAN = "MARKET_OPEN_SCAN"
    POSITION_REVIEW = "POSITION_REVIEW"
    INTRADAY_MANAGEMENT = "INTRADAY_MANAGEMENT"
    CLOSING_MANAGEMENT = "CLOSING_MANAGEMENT"
    END_OF_DAY_REPORT = "END_OF_DAY_REPORT"


@dataclass
class CheckpointConfig:
    checkpoint_id: str
    name: str
    description: str
    scheduled_time: str  # Format: "HH:MM" 24-hr
    timezone: str = "Asia/Kolkata"
    is_enabled: bool = True
    last_run: Optional[str] = None
    next_run: Optional[str] = None
    last_status: str = "IDLE"  # IDLE, SUCCESS, FAILED, RUNNING, SKIPPED
    last_duration_sec: float = 0.0
    last_result_summary: str = ""

    @property
    def enabled(self) -> bool:
        return self.is_enabled

    @enabled.setter
    def enabled(self, value: bool) -> None:
        self.is_enabled = value

    @property
    def time_str(self) -> str:
        return self.scheduled_time

    @time_str.setter
    def time_str(self, value: str) -> None:
        self.scheduled_time = value

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# Canonical alias normalizer
ALIAS_MAP: Dict[str, str] = {
    "PRE_MARKET_RESEARCH": "PREMARKET_RESEARCH",
    "MARKET_OPEN_SCAN": "OPENING_SCAN",
    "POSITION_REVIEW": "MID_SESSION_REVIEW",
    "INTRADAY_MANAGEMENT": "POSITION_MANAGEMENT",
    "CLOSING_MANAGEMENT": "FLATTEN_OR_EXIT",
    "END_OF_DAY_REPORT": "RECONCILIATION_AND_REPORT",
    "PREMARKET_RESEARCH": "PREMARKET_RESEARCH",
    "OPENING_SCAN": "OPENING_SCAN",
    "MID_SESSION_REVIEW": "MID_SESSION_REVIEW",
    "POSITION_MANAGEMENT": "POSITION_MANAGEMENT",
    "FLATTEN_OR_EXIT": "FLATTEN_OR_EXIT",
    "RECONCILIATION_AND_REPORT": "RECONCILIATION_AND_REPORT",
}


def normalize_checkpoint_id(cp_id: Any) -> str:
    val = cp_id.value if hasattr(cp_id, "value") else str(cp_id)
    return ALIAS_MAP.get(val, val)


class _CheckpointsDict(dict):
    """Custom dictionary allowing lookup by CheckpointType enum, alias, or string."""
    def __getitem__(self, key):
        if hasattr(key, "value"):
            key = key.value
        canonical = ALIAS_MAP.get(str(key), str(key))
        if canonical in self:
            return super().__getitem__(canonical)
        return super().__getitem__(key)

    def __contains__(self, key):
        if hasattr(key, "value"):
            key = key.value
        canonical = ALIAS_MAP.get(str(key), str(key))
        return super().__contains__(canonical) or super().__contains__(key)

    def get(self, key, default=None):
        if hasattr(key, "value"):
            key = key.value
        canonical = ALIAS_MAP.get(str(key), str(key))
        if canonical in self:
            return super().get(canonical, default)
        return super().get(key, default)


# Default 6-checkpoint schedule per specification
DEFAULT_CHECKPOINTS: Dict[str, CheckpointConfig] = _CheckpointsDict({
    "PREMARKET_RESEARCH": CheckpointConfig(
        checkpoint_id="PREMARKET_RESEARCH",
        name="Pre-Market Research",
        description="Scans global indices, GIFT Nifty, macroeconomic calendars, earnings releases, and calculates key opening levels.",
        scheduled_time="06:00",
        timezone="Asia/Kolkata",
        is_enabled=True,
    ),
    "OPENING_SCAN": CheckpointConfig(
        checkpoint_id="OPENING_SCAN",
        name="Opening Scan",
        description="Assesses opening range breakout, volatility spikes, initial option chain Greeks, and formulates candidate setups.",
        scheduled_time="09:00",
        timezone="Asia/Kolkata",
        is_enabled=True,
    ),
    "MID_SESSION_REVIEW": CheckpointConfig(
        checkpoint_id="MID_SESSION_REVIEW",
        name="Mid-Session Review",
        description="Audits active paper/live positions, checks unrealized PnL, adjusts trailing stops, and verifies margin utilization.",
        scheduled_time="09:30",
        timezone="Asia/Kolkata",
        is_enabled=True,
    ),
    "POSITION_MANAGEMENT": CheckpointConfig(
        checkpoint_id="POSITION_MANAGEMENT",
        name="Position Management",
        description="Monitors momentum reversals, IV crush, Greeks decay, and scans for midday breakout or mean-reversion entries.",
        scheduled_time="10:00",
        timezone="Asia/Kolkata",
        is_enabled=True,
    ),
    "FLATTEN_OR_EXIT": CheckpointConfig(
        checkpoint_id="FLATTEN_OR_EXIT",
        name="Flatten or Exit",
        description="Automates intraday position square-offs, rolls decaying contracts, and secures profits ahead of market close.",
        scheduled_time="15:15",
        timezone="Asia/Kolkata",
        is_enabled=True,
    ),
    "RECONCILIATION_AND_REPORT": CheckpointConfig(
        checkpoint_id="RECONCILIATION_AND_REPORT",
        name="Reconciliation and Report",
        description="Generates daily PnL accounting, win/loss metrics, risk utilization summary, AI observations, and next-session watchlist.",
        scheduled_time="15:30",
        timezone="Asia/Kolkata",
        is_enabled=True,
    ),
})
