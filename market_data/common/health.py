"""
Provider Health & Latency Tracker
=================================
Continuously tracks provider latency, request failure counts, and uptime status.
"""

import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from dataclasses import dataclass, field


@dataclass
class HealthRecord:
    provider_id: str
    status: str = "CONNECTED"          # CONNECTED | DEGRADED | DISCONNECTED | AUTH_REQUIRED
    latency_ms: float = 10.0
    consecutive_failures: int = 0
    total_requests: int = 0
    total_errors: int = 0
    last_success_at: Optional[str] = None
    last_error_at: Optional[str] = None
    last_error_message: Optional[str] = None


class ProviderHealthTracker:
    def __init__(self):
        self._records: Dict[str, HealthRecord] = {}

    def get_or_create(self, provider_id: str) -> HealthRecord:
        p_id = provider_id.lower()
        if p_id not in self._records:
            self._records[p_id] = HealthRecord(provider_id=p_id)
        return self._records[p_id]

    def record_success(self, provider_id: str, latency_ms: float) -> None:
        rec = self.get_or_create(provider_id)
        rec.consecutive_failures = 0
        rec.latency_ms = round(latency_ms, 2)
        rec.total_requests += 1
        rec.status = "CONNECTED"
        rec.last_success_at = datetime.now(timezone.utc).isoformat()

    def record_failure(self, provider_id: str, error_message: str) -> None:
        rec = self.get_or_create(provider_id)
        rec.consecutive_failures += 1
        rec.total_requests += 1
        rec.total_errors += 1
        rec.last_error_at = datetime.now(timezone.utc).isoformat()
        rec.last_error_message = error_message
        if rec.consecutive_failures >= 3:
            rec.status = "DISCONNECTED"
        elif rec.consecutive_failures >= 1:
            rec.status = "DEGRADED"

    def get_status_summary(self) -> Dict[str, Dict[str, Any]]:
        summary = {}
        for p_id, rec in self._records.items():
            summary[p_id] = {
                "status": rec.status,
                "latency_ms": rec.latency_ms,
                "consecutive_failures": rec.consecutive_failures,
                "error_rate_pct": round((rec.total_errors / max(1, rec.total_requests)) * 100, 2),
                "last_success_at": rec.last_success_at,
                "last_error_at": rec.last_error_at,
            }
        return summary


global_health_tracker = ProviderHealthTracker()
