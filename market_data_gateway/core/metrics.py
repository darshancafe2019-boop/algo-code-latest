"""
Market Data Feed Metrics
========================
Tracks real-time telemetry, latency, throughput, error counters, and dropped frames per provider.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field, asdict
from typing import Dict, Any


@dataclass
class ProviderMetrics:
    provider_id: str
    ticks_received: int = 0
    ticks_processed: int = 0
    ticks_dropped: int = 0
    ticks_duplicated: int = 0
    parse_errors: int = 0
    connection_errors: int = 0
    reconnects: int = 0
    subscription_errors: int = 0
    stale_ticks: int = 0
    last_latency_ms: float = 0.0
    last_tick_time: float = 0.0
    start_time: float = field(default_factory=time.time)

    def record_tick_received(self, latency_ms: float = 0.0) -> None:
        self.ticks_received += 1
        self.last_tick_time = time.time()
        self.last_latency_ms = latency_ms

    def record_tick_processed(self) -> None:
        self.ticks_processed += 1

    def record_tick_dropped(self) -> None:
        self.ticks_dropped += 1

    def record_duplicate(self) -> None:
        self.ticks_duplicated += 1

    def record_parse_error(self) -> None:
        self.parse_errors += 1

    def record_connection_error(self) -> None:
        self.connection_errors += 1

    def record_reconnect(self) -> None:
        self.reconnects += 1

    def record_stale_tick(self) -> None:
        self.stale_ticks += 1

    @property
    def messages_per_sec(self) -> float:
        elapsed = max(1.0, time.time() - self.start_time)
        return round(self.ticks_received / elapsed, 2)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["messages_per_sec"] = self.messages_per_sec
        return d


class MetricsCollector:
    def __init__(self):
        self._providers: Dict[str, ProviderMetrics] = {}

    def get_provider(self, provider_id: str) -> ProviderMetrics:
        if provider_id not in self._providers:
            self._providers[provider_id] = ProviderMetrics(provider_id=provider_id)
        return self._providers[provider_id]

    def to_dict(self) -> Dict[str, Any]:
        return {k: v.to_dict() for k, v in self._providers.items()}


FeedMetricsTracker = MetricsCollector
global_metrics = MetricsCollector()
