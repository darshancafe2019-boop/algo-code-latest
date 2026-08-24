"""
Subscription Registry
=====================
Tracks active symbol subscriptions and the reason each symbol is subscribed.
Prevents accidental subscription to search results, ensures cleanup when
bot instances stop or positions are closed.
"""
from __future__ import annotations

import logging
import threading
from typing import Any, Dict, Optional, Set

logger = logging.getLogger("MDGateway.SubscriptionRegistry")

VALID_REASONS = frozenset({
    "WATCHLIST",      # user's manual watchlist
    "RUNNING_BOT",    # symbol monitored by an active bot instance
    "OPEN_POSITION",  # symbol with an open trade
    "CHART_VIEW",     # currently open chart in UI
    "BENCHMARK",      # configured index benchmarks
})


class SubscriptionRegistry:
    """
    Reason-keyed subscription tracker.
    A symbol remains subscribed as long as at least one reason exists.
    Removal of the last reason triggers unsubscribe in the provider adapters.
    """

    def __init__(self, add_callback=None, remove_callback=None):
        """
        add_callback(symbol)   -> called when a new symbol is subscribed
        remove_callback(symbol) -> called when no more reasons remain
        """
        self._lock = threading.RLock()
        # symbol -> {reason: source_label}
        self._subscriptions: Dict[str, Dict[str, str]] = {}
        self._add_callback = add_callback
        self._remove_callback = remove_callback

    def subscribe(self, symbol: str, reason: str, source: str = "") -> None:
        """Register a subscription for a symbol with a given reason."""
        sym = symbol.upper()
        if reason not in VALID_REASONS:
            logger.warning("Unknown subscription reason '%s' for %s — ignored", reason, sym)
            return
        with self._lock:
            is_new = sym not in self._subscriptions
            if is_new:
                self._subscriptions[sym] = {}
            self._subscriptions[sym][reason] = source
            if is_new and self._add_callback:
                logger.info("New subscription: %s (reason=%s, source=%s)", sym, reason, source)
                self._add_callback(sym)
            else:
                logger.debug("Added reason %s for existing subscription %s", reason, sym)

    def unsubscribe(self, symbol: str, reason: str) -> None:
        """Remove a subscription reason for a symbol. Triggers full unsubscribe when empty."""
        sym = symbol.upper()
        with self._lock:
            if sym not in self._subscriptions:
                return
            self._subscriptions[sym].pop(reason, None)
            if not self._subscriptions[sym]:
                del self._subscriptions[sym]
                logger.info("Last reason removed for %s — unsubscribing", sym)
                if self._remove_callback:
                    self._remove_callback(sym)
            else:
                remaining = list(self._subscriptions[sym].keys())
                logger.debug("Removed reason %s from %s. Remaining: %s", reason, sym, remaining)

    def clear_reason(self, reason: str) -> None:
        """Remove a reason from all subscribed symbols (e.g. when a bot stops)."""
        with self._lock:
            to_remove = []
            for sym, reasons in list(self._subscriptions.items()):
                if reason in reasons:
                    reasons.pop(reason)
                    if not reasons:
                        to_remove.append(sym)
            for sym in to_remove:
                del self._subscriptions[sym]
                logger.info("Cleared reason %s — unsubscribing %s", reason, sym)
                if self._remove_callback:
                    self._remove_callback(sym)

    def get_active_symbols(self) -> Set[str]:
        with self._lock:
            return set(self._subscriptions.keys())

    def get_reasons_for(self, symbol: str) -> Dict[str, str]:
        with self._lock:
            return dict(self._subscriptions.get(symbol.upper(), {}))

    def dump(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "active_symbol_count": len(self._subscriptions),
                "symbols": {
                    sym: list(reasons.keys())
                    for sym, reasons in self._subscriptions.items()
                },
            }
