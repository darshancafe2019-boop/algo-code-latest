"""
Feed Rate Limiter
=================
Token-bucket rate limiter for protecting broker WebSockets from burst subscription storms.
"""
from __future__ import annotations

import asyncio
import time


class FeedRateLimiter:
    def __init__(self, rate_per_sec: float = 20.0, burst: int = 50):
        self.rate_per_sec = rate_per_sec
        self.burst = burst
        self.tokens = float(burst)
        self.last_update = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self, count: int = 1) -> None:
        async with self._lock:
            while True:
                now = time.monotonic()
                elapsed = now - self.last_update
                self.last_update = now
                self.tokens = min(float(self.burst), self.tokens + elapsed * self.rate_per_sec)

                if self.tokens >= count:
                    self.tokens -= count
                    return

                needed = count - self.tokens
                wait_sec = needed / self.rate_per_sec
                await asyncio.sleep(min(wait_sec, 0.5))
