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
    "WATCHLIST",          # user's manual watchlist (default: ltpc)
    "RUNNING_BOT",        # symbol monitored by an active bot instance (default: full)
    "OPEN_POSITION",      # symbol with an open trade (default: full)
    "CHART_VIEW",         # currently open chart in UI (default: full)
    "BENCHMARK",          # configured index benchmarks (default: ltpc)
    "OPTION_CHAIN",       # options chain & greeks view (default: option_greeks)
    "DEPTH_VIEW",         # deep orderbook level view (default: full_d30)
    "DETAIL_VIEW",        # detail view on gateway
    "COMMAND_CENTER",     # command center dashboard stream (default: full)
    "LIVE_MARKET_TEST",   # diagnostic test subscription
    "QUANTOS_DIAGNOSTIC", # Quant.OS diagnostic tooling
    "SYSTEM",             # system background subscription
    "DIAGNOSTIC",         # generic diagnostic
    "SSE_CLIENT_STREAM",  # Next.js BFF server-sent event stream
    "TEST_CLIENT",        # diagnostic and test client
    "RESTORE_SUBSCRIPTIONS", # frontend reconnection restoration
    "DELTA_LIVE_TAB",     # Delta live tab stream
    "DHAN_LIVE_TAB",      # Dhan live tab stream
    "RESILIENCE_TEST",    # resilience e2e test
    "VERIFICATION_TEST",  # verification test script
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
    Supports per-source subscription keys to prevent cross-client clobbering.
    Provides debounce grace periods for temporary frontend disconnects to prevent Upstox churn.
    """

    def __init__(
        self,
        add_callback: Optional[Callable[[str, str], None]] = None,
        remove_callback: Optional[Callable[[str], None]] = None,
        mode_change_callback: Optional[Callable[[str, str], None]] = None,
        batch_add_callback: Optional[Callable[[List[Tuple[str, str]]], None]] = None,
        batch_remove_callback: Optional[Callable[[List[str]], None]] = None,
    ):
        """
        add_callback(symbol, mode) -> called when a new symbol is subscribed
        remove_callback(symbol)   -> called when no more reasons remain
        mode_change_callback(symbol, new_mode) -> called when highest mode changes
        batch_add_callback([(symbol, mode), ...]) -> called for batch additions
        batch_remove_callback([symbol, ...]) -> called for batch removals
        """
        self._lock = threading.RLock()
        # symbol -> {sub_key: (reason, source_label, mode)}
        # sub_key is f"{reason}::{source}" if source else reason
        self._subscriptions: Dict[str, Dict[str, tuple[str, str, str]]] = {}
        self._active_modes: Dict[str, str] = {}  # symbol -> aggregated mode
        self._add_callback = add_callback
        self._remove_callback = remove_callback
        self._mode_change_callback = mode_change_callback
        self._batch_add_callback = batch_add_callback
        self._batch_remove_callback = batch_remove_callback
        self._debounce_timers: Dict[str, threading.Timer] = {}

    def _calculate_highest_mode(self, reasons_dict: Dict[str, tuple[str, str, str]]) -> str:
        if not reasons_dict:
            return "ltpc"
        highest_prio = 0
        chosen_mode = "ltpc"
        for _, (_, _, mode) in reasons_dict.items():
            prio = MODE_PRIORITY.get(mode.lower(), 1)
            if prio > highest_prio:
                highest_prio = prio
                chosen_mode = mode.lower()
        return chosen_mode

    def _make_key(self, reason: str, source: str) -> str:
        return f"{reason}::{source}" if source else reason

    def subscribe(self, symbol: str, reason: str, source: str = "", mode: str = "full") -> None:
        """Register a subscription for a symbol with a given reason and mode."""
        sym = symbol.upper()
        if reason not in VALID_REASONS:
            logger.warning("Unknown subscription reason '%s' for %s - rejected", reason, sym)
            return

        clean_mode = mode.lower() if mode.lower() in MODE_PRIORITY else "full"
        sub_key = self._make_key(reason, source)

        with self._lock:
            # Cancel any pending debounced unsubscribe for this client source
            if source and source in self._debounce_timers:
                try:
                    self._debounce_timers[source].cancel()
                    del self._debounce_timers[source]
                except Exception:
                    pass

            is_new = sym not in self._subscriptions
            if is_new:
                self._subscriptions[sym] = {}

            self._subscriptions[sym][sub_key] = (reason, source, clean_mode)
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

    def unsubscribe(self, symbol: str, reason: str, source: str = "") -> None:
        """Remove a subscription reason for a symbol. Triggers mode adjustment or full unsubscribe."""
        sym = symbol.upper()
        with self._lock:
            if sym not in self._subscriptions:
                return

            sub_key = self._make_key(reason, source)
            # If explicit key exists, remove it
            if sub_key in self._subscriptions[sym]:
                self._subscriptions[sym].pop(sub_key, None)
            else:
                # Also check matching by reason prefix if source was not specified
                to_pop = [k for k, (r, s, _) in self._subscriptions[sym].items() if r == reason and (not source or s == source)]
                for k in to_pop:
                    self._subscriptions[sym].pop(k, None)

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

    def unsubscribe_all_for_source(self, source: str, debounce_sec: float = 2.5) -> None:
        """
        Removes all subscriptions associated with a specific client source ID.
        If debounce_sec > 0, delays removal to withstand rapid React remounts/reconnects.
        """
        if not source:
            return

        with self._lock:
            if source in self._debounce_timers:
                try:
                    self._debounce_timers[source].cancel()
                except Exception:
                    pass

            if debounce_sec > 0:
                def _delayed():
                    self._execute_unsubscribe_all_for_source(source)

                t = threading.Timer(debounce_sec, _delayed)
                self._debounce_timers[source] = t
                t.daemon = True
                t.start()
            else:
                self._execute_unsubscribe_all_for_source(source)

    def _execute_unsubscribe_all_for_source(self, source: str) -> None:
        """Executes actual unsubscription across symbols for a source."""
        with self._lock:
            self._debounce_timers.pop(source, None)
            to_remove_symbols = []
            for sym, sub_dict in list(self._subscriptions.items()):
                keys_to_pop = [k for k, (_, s, _) in sub_dict.items() if s == source]
                for k in keys_to_pop:
                    sub_dict.pop(k, None)

                if not sub_dict:
                    to_remove_symbols.append(sym)
                else:
                    new_mode = self._calculate_highest_mode(sub_dict)
                    old_mode = self._active_modes.get(sym)
                    if old_mode != new_mode:
                        self._active_modes[sym] = new_mode
                        if self._mode_change_callback:
                            self._mode_change_callback(sym, new_mode)

            for sym in to_remove_symbols:
                del self._subscriptions[sym]
                self._active_modes.pop(sym, None)

            if to_remove_symbols:
                logger.info("Removed %d symbols for disconnected source=%s", len(to_remove_symbols), source)
                if self._batch_remove_callback:
                    try:
                        self._batch_remove_callback(to_remove_symbols)
                    except Exception as e:
                        logger.error("batch_remove_callback error: %s", e)
                elif self._remove_callback:
                    for s in to_remove_symbols:
                        try:
                            self._remove_callback(s)
                        except Exception:
                            pass

    def clear_reason(self, reason: str) -> None:
        """Remove a reason from all subscribed symbols (e.g. when a bot stops)."""
        with self._lock:
            to_remove = []
            for sym, sub_dict in list(self._subscriptions.items()):
                keys_to_pop = [k for k, (r, _, _) in sub_dict.items() if r == reason]
                for k in keys_to_pop:
                    sub_dict.pop(k, None)

                if not sub_dict:
                    to_remove.append(sym)
                else:
                    new_mode = self._calculate_highest_mode(sub_dict)
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

    def get_active_subscriptions(self) -> Set[str]:
        """Returns set of all active subscribed symbols."""
        with self._lock:
            return set(self._subscriptions.keys())

    def get_effective_mode(self, symbol: str) -> str:
        with self._lock:
            return self._active_modes.get(symbol.upper(), "ltpc")

    def get_reasons_for(self, symbol: str) -> Dict[str, tuple[str, str]]:
        with self._lock:
            # Map sub_key or reason -> (source, mode)
            result = {}
            for k, (r, s, m) in self._subscriptions.get(symbol.upper(), {}).items():
                result[k] = (s, m)
            return result

    def dump(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "active_symbol_count": len(self._subscriptions),
                "symbols": {
                    sym: {
                        "active_mode": self._active_modes.get(sym, "ltpc"),
                        "reasons": [r for (r, _, _) in sub_dict.values()],
                        "sources": [s for (_, s, _) in sub_dict.values() if s],
                    }
                    for sym, sub_dict in self._subscriptions.items()
                },
            }
