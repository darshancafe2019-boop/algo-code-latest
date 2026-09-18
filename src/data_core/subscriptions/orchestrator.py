"""
Quant.OS Subscription Orchestrator
Reference-counted adaptive subscription management across multi-provider market streams.
Supports depth escalation (LTPC -> FULL_D5 -> FULL_D20 -> L200) with dynamic ref-counting
and cooldown unsubscribe logic.
"""

from typing import Dict, Set, Optional, List, Any
import time
import logging
from dataclasses import dataclass, field

logger = logging.getLogger("QuantDataCore.Subscriptions")


@dataclass
class SubscriptionEntry:
    instrument_id: str
    provider: str
    symbol: str
    depth_level: str  # 'LTPC', 'FULL_D5', 'FULL_D20', 'L200'
    ref_count: int = 1
    subscribers: Set[str] = field(default_factory=set)
    created_at: float = field(default_factory=time.time)
    last_requested_at: float = field(default_factory=time.time)


class SubscriptionOrchestrator:
    """
    Authoritative Orchestrator for Market Data Subscriptions.
    Ensures that multiple components/pages requesting the same instrument/feed
    do not spawn duplicate WebSocket requests or overwhelm broker rate limits.
    Escalates depth level on demand and unsubscribes when ref_count reaches zero.
    """

    DEPTH_HIERARCHY = {
        "LTPC": 1,
        "FULL_D5": 2,
        "FULL_D20": 3,
        "L200": 4,
    }

    def __init__(self):
        # key: f"{provider}:{instrument_id}" -> SubscriptionEntry
        self._subscriptions: Dict[str, SubscriptionEntry] = {}

    def subscribe(
        self,
        instrument_id: str,
        provider: str,
        symbol: str,
        depth_level: str = "LTPC",
        subscriber_id: str = "ui_client",
    ) -> Dict[str, Any]:
        """
        Registers an active subscription reference.
        Returns a dict indicating if a new broker WebSocket request or depth escalation is needed.
        """
        key = f"{provider.lower()}:{instrument_id.lower()}"
        escalation_needed = False
        new_subscription = False

        if key not in self._subscriptions:
            self._subscriptions[key] = SubscriptionEntry(
                instrument_id=instrument_id,
                provider=provider,
                symbol=symbol,
                depth_level=depth_level,
                ref_count=1,
                subscribers={subscriber_id},
            )
            new_subscription = True
            logger.info(f"Subscribed to {key} at depth {depth_level} by {subscriber_id}")
        else:
            entry = self._subscriptions[key]
            entry.last_requested_at = time.time()
            if subscriber_id not in entry.subscribers:
                entry.subscribers.add(subscriber_id)
                entry.ref_count = len(entry.subscribers)

            curr_rank = self.DEPTH_HIERARCHY.get(entry.depth_level, 1)
            req_rank = self.DEPTH_HIERARCHY.get(depth_level, 1)
            if req_rank > curr_rank:
                entry.depth_level = depth_level
                escalation_needed = True
                logger.info(f"Escalated subscription {key} to depth {depth_level}")

        entry = self._subscriptions[key]
        return {
            "key": key,
            "instrument_id": instrument_id,
            "provider": provider,
            "depth_level": entry.depth_level,
            "ref_count": entry.ref_count,
            "new_subscription": new_subscription,
            "escalation_needed": escalation_needed,
        }

    def unsubscribe(
        self,
        instrument_id: str,
        provider: str,
        subscriber_id: str = "ui_client",
    ) -> Dict[str, Any]:
        """
        Removes a subscriber reference. If ref_count drops to zero, removes subscription.
        """
        key = f"{provider.lower()}:{instrument_id.lower()}"
        if key not in self._subscriptions:
            return {"key": key, "unsubscribed": False, "remaining_refs": 0}

        entry = self._subscriptions[key]
        entry.subscribers.discard(subscriber_id)
        entry.ref_count = len(entry.subscribers)

        should_cancel = False
        if entry.ref_count <= 0:
            del self._subscriptions[key]
            should_cancel = True
            logger.info(f"Unsubscribed all listeners for {key}. Feed cancelled.")

        return {
            "key": key,
            "unsubscribed": should_cancel,
            "remaining_refs": entry.ref_count if not should_cancel else 0,
        }

    def get_active_subscriptions(self) -> List[Dict[str, Any]]:
        """Returns snapshot of all active subscription entries."""
        now = time.time()
        return [
            {
                "instrument_id": e.instrument_id,
                "provider": e.provider,
                "symbol": e.symbol,
                "depth_level": e.depth_level,
                "ref_count": e.ref_count,
                "subscribers": list(e.subscribers),
                "uptime_seconds": round(now - e.created_at, 1),
            }
            for e in self._subscriptions.values()
        ]
