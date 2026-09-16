"""
Subscription Planner & Capacity Manager
========================================
Prioritizes and queues subscriptions based on critical hierarchy:
1. Active Trading Strategy
2. Open Positions
3. Current Option Chain
4. Watchlist
5. Visible Markets Table
6. Background Instruments
"""
from __future__ import annotations

import logging
from enum import IntEnum
from typing import Dict, List, Set, Optional, Tuple

logger = logging.getLogger("Subscriptions.Planner")


class SubscriptionPriority(IntEnum):
    ACTIVE_STRATEGY = 1
    OPEN_POSITIONS = 2
    OPTION_CHAIN = 3
    WATCHLIST = 4
    VISIBLE_TABLE = 5
    BACKGROUND = 6


class SubscriptionPlanner:
    def __init__(
        self,
        max_capacity_per_provider: Optional[Dict[str, int]] = None,
        max_limits: Optional[Dict[str, int]] = None,
    ):
        capacity = max_limits or max_capacity_per_provider
        self.max_capacity = capacity or {
            "fyers": 5000,
            "upstox": 5000,
            "dhan": 5000,
            "delta": 10000,
            "binance": 10000,
        }
        # provider -> symbol -> (priority, count, reason)
        self._subscriptions: Dict[str, Dict[str, Tuple[SubscriptionPriority, int, str]]] = {
            k: {} for k in self.max_capacity
        }

    def get_active_count(self, provider: str) -> int:
        prov = provider.lower()
        return len(self._subscriptions.get(prov, {}))

    def can_subscribe(self, provider: str, count: int = 1) -> bool:
        prov = provider.lower()
        limit = self.max_capacity.get(prov, 5000)
        current = len(self._subscriptions.get(prov, {}))
        return (current + count) <= limit

    def get_remaining_capacity(self, provider: str) -> int:
        prov = provider.lower()
        limit = self.max_capacity.get(prov, 5000)
        current = len(self._subscriptions.get(prov, {}))
        return max(0, limit - current)

    def plan_subscriptions(
        self,
        provider: str,
        symbols: List[str],
        priority: SubscriptionPriority = SubscriptionPriority.VISIBLE_TABLE,
        reason: str = "UI_REQUEST"
    ) -> Tuple[List[str], List[str]]:
        """
        Returns (approved_symbols, rejected_symbols).
        """
        prov = provider.lower()
        if prov not in self._subscriptions:
            self._subscriptions[prov] = {}

        approved: List[str] = []
        rejected: List[str] = []

        remaining = self.get_remaining_capacity(prov)

        for sym in symbols:
            s_clean = sym.strip()
            if not s_clean:
                continue

            if s_clean in self._subscriptions[prov]:
                # Already subscribed, increment ref count
                p, c, r = self._subscriptions[prov][s_clean]
                # Elevate priority if new request has higher priority
                new_p = min(p, priority)
                self._subscriptions[prov][s_clean] = (new_p, c + 1, reason)
                approved.append(s_clean)
            else:
                if remaining > 0:
                    self._subscriptions[prov][s_clean] = (priority, 1, reason)
                    remaining -= 1
                    approved.append(s_clean)
                else:
                    # Check if we can evict a lower priority subscription
                    lowest_sym = None
                    lowest_p = -1
                    for active_s, (act_p, _, _) in self._subscriptions[prov].items():
                        if act_p > priority and act_p > lowest_p:
                            lowest_p = act_p
                            lowest_sym = active_s
                    if lowest_sym:
                        del self._subscriptions[prov][lowest_sym]
                        self._subscriptions[prov][s_clean] = (priority, 1, reason)
                        approved.append(s_clean)
                        logger.info("[%s] Evicted lower-priority symbol %s to accommodate %s", prov.upper(), lowest_sym, s_clean)
                    else:
                        logger.warning(
                            "[%s] SUBSCRIPTION LIMIT REACHED (Capacity: %d). Rejected: %s",
                            prov.upper(),
                            self.max_capacity.get(prov, 5000),
                            s_clean
                        )
                        rejected.append(s_clean)

        return approved, rejected

    def release_subscriptions(self, provider: str, symbols: List[str]) -> List[str]:
        """
        Decrements ref count and returns list of symbols that should actually be unsubscribed.
        """
        prov = provider.lower()
        if prov not in self._subscriptions:
            return []

        to_unsub: List[str] = []
        for sym in symbols:
            s_clean = sym.strip()
            if s_clean in self._subscriptions[prov]:
                p, count, r = self._subscriptions[prov][s_clean]
                if count <= 1:
                    del self._subscriptions[prov][s_clean]
                    to_unsub.append(s_clean)
                else:
                    self._subscriptions[prov][s_clean] = (p, count - 1, r)

        return to_unsub

    def get_active_count(self, provider: str) -> int:
        return len(self._subscriptions.get(provider.lower(), {}))


global_subscription_planner = SubscriptionPlanner()
