"""
Exponential Backoff Reconnection Engine
=======================================
Bounded exponential backoff with randomized jitter to prevent thundering herd problems.
"""
from __future__ import annotations

import asyncio
import random
import logging

logger = logging.getLogger("FeedCore.Reconnect")


class ReconnectPolicy:
    def __init__(
        self,
        initial_backoff_sec: float = 1.0,
        max_backoff_sec: float = 30.0,
        backoff_multiplier: float = 1.5,
        jitter_pct: float = 0.2,
    ):
        self.initial_backoff_sec = initial_backoff_sec
        self.max_backoff_sec = max_backoff_sec
        self.backoff_multiplier = backoff_multiplier
        self.jitter_pct = jitter_pct
        self._current_backoff = initial_backoff_sec
        self._retry_count = 0

    @property
    def retry_count(self) -> int:
        return self._retry_count

    def reset(self) -> None:
        self._current_backoff = self.initial_backoff_sec
        self._retry_count = 0

    def compute_next_delay(self) -> float:
        self._retry_count += 1
        jitter = random.uniform(-self.jitter_pct, self.jitter_pct) * self._current_backoff
        delay = max(0.1, min(self.max_backoff_sec, self._current_backoff + jitter))
        self._current_backoff = min(self.max_backoff_sec, self._current_backoff * self.backoff_multiplier)
        return delay

    async def wait_before_reconnect(self, provider_id: str = "") -> float:
        delay = self.compute_next_delay()
        logger.info(
            "[%s] Reconnect attempt #%d waiting %.2fs (bounded max: %.1fs)",
            provider_id or "Feed",
            self._retry_count,
            delay,
            self.max_backoff_sec,
        )
        await asyncio.sleep(delay)
        return delay
