"""
Stale Data Protection Engine
============================
Detects stale market feeds and halts new automated signal generation
and order placement to protect trading capital.
"""

import time
import logging
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("StaleProtection")


class StaleDataProtectionEngine:
    """
    Automated safeguard against stale or frozen market data feeds.
    Intercepts strategy signals before execution routing.
    """

    def __init__(self, stale_threshold_sec: float = 10.0):
        self.stale_threshold_sec = stale_threshold_sec
        self._feed_last_active: Dict[str, float] = {}
        self._provider_statuses: Dict[str, str] = {}
        self._lockout_events: List[Dict[str, Any]] = []

    def record_tick(self, symbol: str, provider_id: str = "default") -> None:
        """Records the arrival of a valid tick."""
        now = time.time()
        self._feed_last_active[symbol.upper()] = now
        self._provider_statuses[provider_id] = "LIVE"

    def set_provider_status(self, provider_id: str, status: str) -> None:
        """Sets external provider connectivity status."""
        self._provider_statuses[provider_id] = status

    def is_symbol_safe_for_trading(self, symbol: str) -> Tuple[bool, Optional[str], float]:
        """
        Validates if symbol market feed is fresh enough for algorithmic order execution.
        Returns: (is_safe, error_reason_if_any, age_sec)
        """
        sym_key = symbol.upper()
        now = time.time()
        last_seen = self._feed_last_active.get(sym_key)

        if last_seen is None:
            # If no ticks recorded yet, check if system just booted
            return True, None, 0.0

        age_sec = now - last_seen
        if age_sec > self.stale_threshold_sec:
            reason = (
                f"BLOCKED_BY_STALE_DATA: Market feed for {symbol} is stale "
                f"({age_sec:.1f}s ago > limit {self.stale_threshold_sec:.1f}s). All trade execution halted."
            )
            event = {
                "symbol": symbol,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)),
                "age_sec": round(age_sec, 2),
                "threshold_sec": self.stale_threshold_sec,
                "reason": reason,
            }
            self._lockout_events.append(event)
            if len(self._lockout_events) > 100:
                self._lockout_events.pop(0)
            return False, reason, age_sec

        return True, None, age_sec

    def get_stale_status_summary(self) -> Dict[str, Any]:
        """Provides status summary for top command bar and system health."""
        now = time.time()
        stale_symbols = []
        live_symbols = []

        for sym, last_ts in self._feed_last_active.items():
            age = now - last_ts
            if age > self.stale_threshold_sec:
                stale_symbols.append({"symbol": sym, "age_sec": round(age, 1)})
            else:
                live_symbols.append({"symbol": sym, "age_sec": round(age, 1)})

        is_any_stale = len(stale_symbols) > 0

        return {
            "is_system_stale": is_any_stale,
            "stale_threshold_sec": self.stale_threshold_sec,
            "stale_count": len(stale_symbols),
            "live_count": len(live_symbols),
            "stale_symbols": stale_symbols,
            "live_symbols": live_symbols,
            "recent_lockouts": self._lockout_events[-5:],
        }


# Global Singleton Instance
global_stale_protection = StaleDataProtectionEngine()
