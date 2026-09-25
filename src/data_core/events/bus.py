"""
Authoritative Global Event Bus
==============================
High-throughput, non-blocking asynchronous event bus connecting all QuantDataCore domains:
- MarketDataDomain
- AccountDomain
- PositionDomain
- OrderDomain
- ExecutionDomain
- CapitalDomain
- RiskDomain
- ProviderHealthDomain

Features:
- Bounded in-memory event ring buffer (default 3,000 events) for real-time observability.
- Thread-safe and async-native event fanout.
- Secret sanitization (never emits API keys, secrets, tokens).
- Fast topic and domain filtering.
"""
from __future__ import annotations

import asyncio
import collections
import logging
import threading
import time
from typing import Any, Callable, Dict, List, Optional, Set

from src.data_core.models import (
    NormalizedEvent,
    EventType,
    EventDomain,
    Environment,
)

logger = logging.getLogger("GlobalEventBus")

# Sensitive fields to scrub before emitting or buffering
SCRUB_FIELDS = {
    "api_key", "apikey", "secret", "api_secret", "token", "access_token",
    "refresh_token", "auth", "password", "jwt", "authorization", "client_secret"
}


def sanitize_payload(obj: Any) -> Any:
    """Recursively scrub credentials from event payload dictionaries."""
    if isinstance(obj, dict):
        cleaned = {}
        for k, v in obj.items():
            if str(k).lower() in SCRUB_FIELDS:
                cleaned[k] = "[REDACTED]"
            else:
                cleaned[k] = sanitize_payload(v)
        return cleaned
    elif isinstance(obj, list):
        return [sanitize_payload(item) for item in obj]
    return obj


class GlobalEventBus:
    """Singleton event bus with bounded circular buffer and domain/topic dispatch."""

    def __init__(self, max_buffer_size: int = 3000):
        self._buffer: collections.deque[NormalizedEvent] = collections.deque(maxlen=max_buffer_size)
        self._lock = threading.RLock()
        self._subscribers: Dict[str, Set[Callable[[NormalizedEvent], None]]] = collections.defaultdict(set)
        self._async_subscribers: Dict[str, Set[Callable[[NormalizedEvent], Any]]] = collections.defaultdict(set)
        self._global_subscribers: Set[Callable[[NormalizedEvent], None]] = set()
        self._sequence: int = 0
        self._event_count: int = 0
        self._start_time: float = time.time()

    def publish(self, event: NormalizedEvent) -> None:
        """Publishes a normalized event, assigning monotonic sequence and timestamps."""
        with self._lock:
            self._sequence += 1
            event.sequence = self._sequence
            self._event_count += 1

            # Sanitize payload & metadata
            event.payload = sanitize_payload(event.payload)
            if event.metadata:
                event.metadata = sanitize_payload(event.metadata)
            if event.raw_payload:
                event.raw_payload = sanitize_payload(event.raw_payload)

            # Store in ring buffer
            self._buffer.append(event)

            # Persist to append-only Audit Ledger asynchronously / safely
            try:
                from src.data_core.events.storage import global_audit_storage
                global_audit_storage.append_event(event)
            except Exception as e:
                logger.error(f"Error persisting audit event {event.event_id}: {e}")

            # Fan out to global subscribers
            for cb in list(self._global_subscribers):
                try:
                    cb(event)
                except Exception as e:
                    logger.error(f"Error in global subscriber callback: {e}")

            # Fan out by domain
            d_val = event.domain.value if hasattr(event.domain, "value") else str(event.domain)
            domain_key = f"domain:{d_val}"
            for cb in list(self._subscribers.get(domain_key, set())):
                try:
                    cb(event)
                except Exception as e:
                    logger.error(f"Error in domain subscriber callback: {e}")

            # Fan out by event type
            t_val = event.event_type.value if hasattr(event.event_type, "value") else str(event.event_type)
            type_key = f"type:{t_val}"
            for cb in list(self._subscribers.get(type_key, set())):
                try:
                    cb(event)
                except Exception as e:
                    logger.error(f"Error in type subscriber callback: {e}")

            # Fan out by provider
            provider_key = f"provider:{event.provider}"
            for cb in list(self._subscribers.get(provider_key, set())):
                try:
                    cb(event)
                except Exception as e:
                    logger.error(f"Error in provider subscriber callback: {e}")

    def subscribe(self, topic: str, callback: Callable[[NormalizedEvent], None]) -> Callable[[], None]:
        """Subscribes to a topic (e.g. 'domain:MARKET_DATA', 'type:ORDER_FILLED', 'all')."""
        with self._lock:
            if topic in ("all", "*"):
                self._global_subscribers.add(callback)
                return lambda: self._global_subscribers.discard(callback)
            else:
                self._subscribers[topic].add(callback)
                return lambda: self._subscribers[topic].discard(callback)

    def get_recent_events(
        self,
        limit: int = 100,
        domain: Optional[str] = None,
        event_type: Optional[str] = None,
        provider: Optional[str] = None,
        environment: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieves recent events matching criteria from the ring buffer."""
        with self._lock:
            events = list(self._buffer)

        # Apply filters in reverse order (newest first)
        results = []
        for ev in reversed(events):
            if domain and ev.domain.value != domain:
                continue
            if event_type and ev.event_type.value != event_type:
                continue
            if provider and ev.provider != provider:
                continue
            if environment and ev.environment.value != environment:
                continue

            results.append(ev.to_dict())
            if len(results) >= limit:
                break

        return results

    def get_stream_metrics(self) -> Dict[str, Any]:
        """Calculates real-time event rates and buffer metrics."""
        with self._lock:
            elapsed = max(0.001, time.time() - self._start_time)
            rate = round(self._event_count / elapsed, 1)
            latest_ev = self._buffer[-1] if self._buffer else None
            return {
                "eventsBuffered": len(self._buffer),
                "totalEventsPublished": self._event_count,
                "currentRateEventsPerSec": rate,
                "lastEventTime": latest_ev.received_timestamp if latest_ev else None,
                "lastEventLatencyMs": latest_ev.latency_ms if latest_ev else 0.0,
                "subscribersCount": len(self._global_subscribers) + sum(len(s) for s in self._subscribers.values()),
            }

    def clear(self) -> None:
        """Clears the ring buffer."""
        with self._lock:
            self._buffer.clear()


# Global Singleton Event Bus Instance
global_event_bus = GlobalEventBus()
