"""
Quant.OS Subscription Orchestrator
Reference-counted adaptive subscriptions with bot tick callbacks.
"""

from typing import Dict, Set, Optional, List, Any, Callable
import time
import logging
import threading
from dataclasses import dataclass, field

logger = logging.getLogger("QuantDataCore.Subscriptions")


@dataclass
class SubscriptionEntry:
    instrument_id: str
    provider: str
    symbol: str
    depth_level: str
    ref_count: int = 1
    subscribers: Set[str] = field(default_factory=set)
    created_at: float = field(default_factory=time.time)
    last_requested_at: float = field(default_factory=time.time)


class SubscriptionOrchestrator:
    """Process-wide subscription registry used by UI, bots and provider adapters."""

    DEPTH_HIERARCHY = {"LTPC": 1, "FULL_D5": 2, "FULL_D20": 3, "L200": 4}
    _instance = None
    _instance_guard = threading.Lock()

    def __new__(cls):
        with cls._instance_guard:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return
        self._lock = threading.RLock()
        self._subscriptions: Dict[str, SubscriptionEntry] = {}
        self._callbacks: Dict[str, Dict[str, Callable[[Dict[str, Any]], None]]] = {}
        self._initialized = True

    @staticmethod
    def _key(provider: str, instrument_id: str) -> str:
        return f"{provider.lower()}:{instrument_id.lower()}"

    def subscribe(
        self,
        instrument_id: str,
        provider: str,
        symbol: str,
        depth_level: str = "LTPC",
        subscriber_id: str = "ui_client",
        on_tick: Optional[Callable[[Dict[str, Any]], None]] = None,
    ) -> Dict[str, Any]:
        if not instrument_id:
            raise ValueError("instrument_id is required")
        if not provider:
            raise ValueError("provider is required")

        depth_level = depth_level if depth_level in self.DEPTH_HIERARCHY else "LTPC"
        key = self._key(provider, instrument_id)
        escalation_needed = False
        new_subscription = False

        with self._lock:
            if key not in self._subscriptions:
                self._subscriptions[key] = SubscriptionEntry(
                    instrument_id=instrument_id,
                    provider=provider,
                    symbol=symbol or instrument_id,
                    depth_level=depth_level,
                    ref_count=1,
                    subscribers={subscriber_id},
                )
                new_subscription = True
                logger.info("Subscribed to %s at depth %s by %s", key, depth_level, subscriber_id)
            else:
                entry = self._subscriptions[key]
                entry.last_requested_at = time.time()
                entry.symbol = symbol or entry.symbol
                if subscriber_id not in entry.subscribers:
                    entry.subscribers.add(subscriber_id)
                    entry.ref_count = len(entry.subscribers)
                curr_rank = self.DEPTH_HIERARCHY.get(entry.depth_level, 1)
                req_rank = self.DEPTH_HIERARCHY.get(depth_level, 1)
                if req_rank > curr_rank:
                    entry.depth_level = depth_level
                    escalation_needed = True
                    logger.info("Escalated subscription %s to depth %s", key, depth_level)

            if on_tick is not None:
                self._callbacks.setdefault(key, {})[subscriber_id] = on_tick

            entry = self._subscriptions[key]

        # Trigger real-time provider feed subscription
        if provider.upper() == "UPSTOX":
            try:
                from src.data_core.subscriptions.upstox_feed_bridge import global_upstox_feed_bridge
                global_upstox_feed_bridge.subscribe(instrument_id, depth_level=depth_level)
            except Exception as exc:
                logger.warning("Failed to trigger Upstox live feed subscription for %s: %s", instrument_id, exc)

        return {
            "key": key,
            "instrument_id": instrument_id,
            "provider": provider,
            "depth_level": entry.depth_level,
            "ref_count": entry.ref_count,
            "new_subscription": new_subscription,
            "escalation_needed": escalation_needed,
        }

    def unsubscribe(self, instrument_id: str, provider: str, subscriber_id: str = "ui_client") -> Dict[str, Any]:
        key = self._key(provider, instrument_id)
        with self._lock:
            if key not in self._subscriptions:
                return {"key": key, "unsubscribed": False, "remaining_refs": 0}

            entry = self._subscriptions[key]
            entry.subscribers.discard(subscriber_id)
            entry.ref_count = len(entry.subscribers)
            callbacks = self._callbacks.get(key)
            if callbacks is not None:
                callbacks.pop(subscriber_id, None)
                if not callbacks:
                    self._callbacks.pop(key, None)

            should_cancel = entry.ref_count <= 0
            if should_cancel:
                del self._subscriptions[key]
                self._callbacks.pop(key, None)
                logger.info("Unsubscribed all listeners for %s. Feed can be cancelled.", key)

        if should_cancel and provider.upper() == "UPSTOX":
            try:
                from src.data_core.subscriptions.upstox_feed_bridge import global_upstox_feed_bridge
                global_upstox_feed_bridge.unsubscribe(instrument_id)
            except Exception as exc:
                logger.warning("Failed to trigger Upstox live feed unsubscription for %s: %s", instrument_id, exc)

        return {
            "key": key,
            "unsubscribed": should_cancel,
            "remaining_refs": 0 if should_cancel else entry.ref_count,
        }

    def publish_tick(self, provider: str, instrument_id: str, tick: Dict[str, Any]) -> Dict[str, Any]:
        """Provider adapters call this once per normalized tick."""
        key = self._key(provider, instrument_id)
        with self._lock:
            callbacks = list(self._callbacks.get(key, {}).items())
        delivered = 0
        failures: List[str] = []
        for subscriber_id, callback in callbacks:
            try:
                callback(dict(tick))
                delivered += 1
            except Exception as exc:  # isolate one bot from the rest
                failures.append(subscriber_id)
                logger.exception("Tick callback failed for %s subscriber=%s: %s", key, subscriber_id, exc)
        return {"key": key, "delivered": delivered, "failed_subscribers": failures}

    def get_active_subscriptions(self) -> List[Dict[str, Any]]:
        now = time.time()
        with self._lock:
            values = list(self._subscriptions.values())
        return [
            {
                "instrument_id": e.instrument_id,
                "provider": e.provider,
                "symbol": e.symbol,
                "depth_level": e.depth_level,
                "ref_count": e.ref_count,
                "subscribers": sorted(e.subscribers),
                "uptime_seconds": round(now - e.created_at, 1),
            }
            for e in values
        ]

    def has_subscription(self, provider: str, instrument_id: str) -> bool:
        key = self._key(provider, instrument_id)
        with self._lock:
            return key in self._subscriptions


global_subscription_orchestrator = SubscriptionOrchestrator()
