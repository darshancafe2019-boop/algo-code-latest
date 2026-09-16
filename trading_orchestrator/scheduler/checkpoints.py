"""
Checkpoint Definitions & Configuration for Daily Automated Trading
===================================================================
"""

from __future__ import annotations

from enum import Enum
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict


class CheckpointType(str, Enum):
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


class _CheckpointsDict(dict):
    """Custom dictionary allowing lookup by CheckpointType enum as well as string."""
    def __getitem__(self, key):
        if hasattr(key, "value"):
            key = key.value
        return super().__getitem__(key)

    def __contains__(self, key):
        if hasattr(key, "value"):
            key = key.value
        return super().__contains__(key)

    def get(self, key, default=None):
        if hasattr(key, "value"):
            key = key.value
        return super().get(key, default)


# Default schedule per specification
DEFAULT_CHECKPOINTS: Dict[str, CheckpointConfig] = _CheckpointsDict({
    CheckpointType.PRE_MARKET_RESEARCH.value: CheckpointConfig(
        checkpoint_id=CheckpointType.PRE_MARKET_RESEARCH.value,
        name="Pre-Market Research",
        description="Scans global indices, GIFT Nifty, macroeconomic calendars, earnings releases, and calculates key opening levels.",
        scheduled_time="06:00",
        timezone="Asia/Kolkata",
        is_enabled=True,
    ),
    CheckpointType.MARKET_OPEN_SCAN.value: CheckpointConfig(
        checkpoint_id=CheckpointType.MARKET_OPEN_SCAN.value,
        name="Market Open Scan",
        description="Assesses opening range breakout, volatility spikes, initial option chain Greeks, and formulates candidate setups.",
        scheduled_time="09:00",
        timezone="Asia/Kolkata",
        is_enabled=True,
    ),
    CheckpointType.POSITION_REVIEW.value: CheckpointConfig(
        checkpoint_id=CheckpointType.POSITION_REVIEW.value,
        name="Position Review",
        description="Audits active paper/live positions, checks unrealized PnL, adjusts trailing stops, and verifies margin utilization.",
        scheduled_time="09:30",
        timezone="Asia/Kolkata",
        is_enabled=True,
    ),
    CheckpointType.INTRADAY_MANAGEMENT.value: CheckpointConfig(
        checkpoint_id=CheckpointType.INTRADAY_MANAGEMENT.value,
        name="Intraday Management",
        description="Monitors momentum reversals, IV crush, Greeks decay, and scans for midday breakout or mean-reversion entries.",
        scheduled_time="10:00",
        timezone="Asia/Kolkata",
        is_enabled=True,
    ),
    CheckpointType.CLOSING_MANAGEMENT.value: CheckpointConfig(
        checkpoint_id=CheckpointType.CLOSING_MANAGEMENT.value,
        name="Closing Management",
        description="Automates intraday position square-offs, rolls decaying contracts, and secures profits ahead of market close.",
        scheduled_time="15:15",
        timezone="Asia/Kolkata",
        is_enabled=True,
    ),
    CheckpointType.END_OF_DAY_REPORT.value: CheckpointConfig(
        checkpoint_id=CheckpointType.END_OF_DAY_REPORT.value,
        name="End of Day Report",
        description="Generates daily PnL accounting, win/loss metrics, risk utilization summary, AI observations, and next-session watchlist.",
        scheduled_time="15:30",
        timezone="Asia/Kolkata",
        is_enabled=True,
    ),
})

