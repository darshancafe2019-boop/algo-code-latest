"""
Feed Status and Health Models
=============================
Authoritative data models for provider diagnostics and connection health.
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any, Dict, List, Optional


class FeedState(str, Enum):
    LIVE = "LIVE"
    FRESH = "FRESH"
    STALE = "STALE"
    DISCONNECTED = "DISCONNECTED"
    AUTH_REQUIRED = "AUTH_REQUIRED"
    AUTH_EXPIRED = "AUTH_EXPIRED"
    CONNECTING = "CONNECTING"
    RATE_LIMITED = "RATE_LIMITED"
    SUBSCRIPTION_LIMIT_REACHED = "SUBSCRIPTION_LIMIT_REACHED"


@dataclass
class ProviderHealthReport:
    provider_id: str
    provider_name: str
    status: str                         # "LIVE", "STALE", "DISCONNECTED", "AUTH_EXPIRED", "NOT_CONFIGURED"
    asset_classes: List[str] = field(default_factory=list)
    subscribed_symbols: int = 0
    max_subscriptions: int = 5000
    latency_ms: float = 0.0
    data_age_ms: float = 0.0
    error_count: int = 0
    reconnect_count: int = 0
    last_tick_time: Optional[str] = None
    messages_per_sec: float = 0.0
    message: str = ""
    auth_status: str = "HEALTHY"
    rest_status: str = "HEALTHY"
    stream_status: str = "CONNECTED"
    capabilities: Dict[str, bool] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
