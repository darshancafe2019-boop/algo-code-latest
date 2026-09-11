"""
Subscription Registry & Mode Manager
====================================
Tracks active symbol subscriptions, reference counts, and feed modes across:
- Watchlist (LTPC)
- Running Bot / Strategies (FULL)
- Option Chain & Greeks (OPTION_GREEKS / FULL)
- Deep Level 2 / L30 Order Books (FULL_D30)

Prevents duplicate provider connections and handles automatic mode upgrades/downgrades.
"""
from __future__ import annotations

import logging
import threading
from typing import Any, Callable, Dict, Optional, Set

logger = logging.getLogger("MDGateway.SubscriptionRegistry")

VALID_REASONS = frozenset({
    "WATCHLIST",      # user's manual watchlist (default: ltpc)
    "RUNNING_BOT",    # symbol monitored by an active bot instance (default: full)
    "OPEN_POSITION",  # symbol with an open trade (default: full)
    "CHART_VIEW",     # currently open chart in UI (default: full)
    "BENCHMARK",      # configured index benchmarks (default: ltpc)
    "OPTION_CHAIN",   # options chain & greeks view (default: option_greeks)
    "DEPTH_VIEW",     # deep orderbook level view (default: full_d30)
})

MODE_PRIORITY: Dict[str, int] = {
    "ltpc": 1,
    "option_greeks": 2,
    "full": 3,
    "full_d30": 4,
}


class SubscriptionRegistry:
    """
    Reason-keyed and mode-managed subscription tracker with reference counting.
    Aggregates requested modes to the highest necessary mode.
    """

    def __init__(
        self,
        add_callback: Optional[Callable[[str, str], None]] = None,
        remove_callback: Optional[Callable[[str], None]] = None,
        mode_change_callback: Optional[Callable[[str, str], None]] = None,
    ):
        """
        add_callback(symbol, mode) -> called when a new symbol is subscribed
        remove_callback(symbol)   -> called when no more reasons remain
        mode_change_callback(symbol, new_mode) -> called when highest mode changes
        """
        self._lock = threading.RLock()
        # symbol -> {reason: (source_label, mode)}
        self._subscriptions: Dict[str, Dict[str, tuple[str, str]]] = {}
        self._active_modes: Dict[str, str] = {}  # symbol -> aggregated mode
        self._add_callback = add_callback
        self._remove_callback = remove_callback
        self._mode_change_callback = mode_change_callback

    def _calculate_highest_mode(self, reasons: Dict[str, tuple[str, str]]) -> str:
        if not reasons:
            return "ltpc"
        highest_prio = 0
        chosen_mode = "ltpc"
        for _, (_, mode) in reasons.items():
            prio = MODE_PRIORITY.get(mode.lower(), 1)
            if prio > highest_prio:
                highest_prio = prio
                chosen_mode = mode.lower()
        return chosen_mode

    def subscribe(self, symbol: str, reason: str, source: str = "", mode: str = "full") -> None:
        """Register a subscription for a symbol with a given reason and mode."""
        sym = symbol.upper()
        if reason not in VALID_REASONS:
            logger.warning("Unknown subscription reason '%s' for %s - rejected", reason, sym)
            return

        clean_mode = mode.lower() if mode.lower() in MODE_PRIORITY else "full"

        with self._lock:
            is_new = sym not in self._subscriptions
            if is_new:
                self._subscriptions[sym] = {}

            self._subscriptions[sym][reason] = (source, clean_mode)
            new_mode = self._calculate_highest_mode(self._subscriptions[sym])
            old_mode = self._active_modes.get(sym)

            if is_new:
                self._active_modes[sym] = new_mode
                logger.info("New subscription: %s (mode=%s, reason=%s, source=%s)", sym, new_mode, reason, source)
                if self._add_callback:
                    try:
                        self._add_callback(sym, new_mode)
                    except TypeError:
                        self._add_callback(sym)
            elif old_mode != new_mode:
                self._active_modes[sym] = new_mode
                logger.info("Mode upgraded/downgraded for %s: %s -> %s", sym, old_mode, new_mode)
                if self._mode_change_callback:
                    try:
                        self._mode_change_callback(sym, new_mode)
                    except TypeError:
                        self._mode_change_callback(sym)
            else:
                logger.debug("Added reason %s for existing subscription %s (mode=%s)", reason, sym, new_mode)

    def unsubscribe(self, symbol: str, reason: str) -> None:
        """Remove a subscription reason for a symbol. Triggers mode adjustment or full unsubscribe."""
        sym = symbol.upper()
        with self._lock:
            if sym not in self._subscriptions:
                return
            self._subscriptions[sym].pop(reason, None)
            if not self._subscriptions[sym]:
                del self._subscriptions[sym]
                self._active_modes.pop(sym, None)
                logger.info("Last reason removed for %s — unsubscribing", sym)
                if self._remove_callback:
                    self._remove_callback(sym)
            else:
                new_mode = self._calculate_highest_mode(self._subscriptions[sym])
                old_mode = self._active_modes.get(sym)
                if old_mode != new_mode:
                    self._active_modes[sym] = new_mode
                    logger.info("Mode downgraded for %s after removing %s: %s -> %s", sym, reason, old_mode, new_mode)
                    if self._mode_change_callback:
                        self._mode_change_callback(sym, new_mode)

    def clear_reason(self, reason: str) -> None:
        """Remove a reason from all subscribed symbols (e.g. when a bot stops)."""
        with self._lock:
            to_remove = []
            for sym, reasons in list(self._subscriptions.items()):
                if reason in reasons:
                    reasons.pop(reason)
                    if not reasons:
                        to_remove.append(sym)
                    else:
                        new_mode = self._calculate_highest_mode(reasons)
                        if self._active_modes.get(sym) != new_mode:
                            self._active_modes[sym] = new_mode
                            if self._mode_change_callback:
                                self._mode_change_callback(sym, new_mode)

            for sym in to_remove:
                del self._subscriptions[sym]
                self._active_modes.pop(sym, None)
                logger.info("Cleared reason %s — unsubscribing %s", reason, sym)
                if self._remove_callback:
                    self._remove_callback(sym)

    def get_active_symbols(self) -> Set[str]:
        with self._lock:
            return set(self._subscriptions.keys())

    def get_effective_mode(self, symbol: str) -> str:
        with self._lock:
            return self._active_modes.get(symbol.upper(), "ltpc")

    def get_reasons_for(self, symbol: str) -> Dict[str, tuple[str, str]]:
        with self._lock:
            return dict(self._subscriptions.get(symbol.upper(), {}))

    def dump(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "active_symbol_count": len(self._subscriptions),
                "symbols": {
                    sym: {
                        "active_mode": self._active_modes.get(sym, "ltpc"),
                        "reasons": list(reasons.keys()),
                    }
                    for sym, reasons in self._subscriptions.items()
                },
            }
