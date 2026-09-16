"""
Stale Data Detector
===================
Calculates data age, classifies freshness (LIVE, FRESH, STALE, DISCONNECTED),
and prevents outdated ticks from overwriting newer quotes.
"""
from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Dict, Optional

from market_data_gateway.models.tick import MarketTick
from market_data_gateway.models.feed_status import FeedState


class StaleDetector:
    def __init__(
        self,
        live_threshold_ms: float = 1500.0,
        stale_threshold_sec: float = 10.0,
        disconnected_threshold_sec: float = 30.0,
        live_threshold_sec: Optional[float] = None,
        fresh_threshold_sec: Optional[float] = None,
    ):
        if live_threshold_sec is not None:
            self.live_threshold_ms = live_threshold_sec * 1000.0
        else:
            self.live_threshold_ms = live_threshold_ms

        if fresh_threshold_sec is not None:
            self.fresh_threshold_ms = fresh_threshold_sec * 1000.0
        else:
            self.fresh_threshold_ms = self.live_threshold_ms * 2.0

        self.stale_threshold_sec = stale_threshold_sec
        self.disconnected_threshold_sec = disconnected_threshold_sec
        # Tracks last provider timestamp per symbol to prevent out-of-order writes: symbol -> epoch_ms
        self._last_provider_timestamps: Dict[str, float] = {}

    def classify_tick(self, tick: MarketTick) -> str:
        """Determines if the tick is LIVE, FRESH, STALE, or DISCONNECTED."""
        age_ms = tick.ageMs
        if age_ms <= self.live_threshold_ms:
            return FeedState.LIVE.value
        elif age_ms <= self.fresh_threshold_ms:
            return FeedState.FRESH.value
        elif age_ms <= self.stale_threshold_sec * 1000.0:
            return FeedState.STALE.value
        else:
            return FeedState.DISCONNECTED.value

    def evaluate(self, tick: MarketTick) -> MarketTick:
        state = self.classify_tick(tick)
        tick.feedStatus = state
        return tick

    def is_newer(self, tick: MarketTick) -> bool:
        """Returns True if tick is at least as new as the last recorded tick for this symbol."""
        try:
            ts_ms = datetime.fromisoformat(tick.timestamp.replace("Z", "+00:00")).timestamp() * 1000.0
        except Exception:
            return True
        last_ts = self._last_provider_timestamps.get(tick.symbol)
        if last_ts is not None and ts_ms < last_ts:
            return False
        return True

    def record_tick(self, tick: MarketTick) -> None:
        try:
            ts_ms = datetime.fromisoformat(tick.timestamp.replace("Z", "+00:00")).timestamp() * 1000.0
            self._last_provider_timestamps[tick.symbol] = ts_ms
        except Exception:
            pass

    def is_out_of_order(self, symbol: str, tick_ts_ms: Optional[float]) -> bool:
        """Returns True if this tick is older than a previously processed tick for this symbol."""
        if tick_ts_ms is None or tick_ts_ms <= 0:
            return False
        last_ts = self._last_provider_timestamps.get(symbol)
        if last_ts is not None and tick_ts_ms < last_ts:
            return True
        self._last_provider_timestamps[symbol] = tick_ts_ms
        return False


class TickDeduplicator:
    """Detects and drops exact duplicate tick frames."""

    def __init__(self, max_history: int = 5000):
        self._seen: Dict[str, float] = {}
        self._max_history = max_history

    def _key(self, tick: MarketTick) -> str:
        seq = tick.sequence or 0
        return f"{tick.provider}:{tick.symbol}:{tick.timestamp}:{seq}"

    def is_duplicate(self, tick: MarketTick) -> bool:
        return self._key(tick) in self._seen

    def record(self, tick: MarketTick) -> None:
        if len(self._seen) > self._max_history:
            self._seen.clear()
        self._seen[self._key(tick)] = time.time()


global_stale_detector = StaleDetector()
