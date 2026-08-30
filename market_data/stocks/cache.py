"""
Stock In-Memory TTL Cache
=========================
Fast caching layer for stock quotes, screener results, and calculated technicals.
"""

import time
from typing import Dict, Any, Optional, Tuple


class StockDataCache:
    """Thread-safe TTL in-memory cache."""

    def __init__(self, default_ttl_seconds: float = 5.0):
        self.default_ttl = default_ttl_seconds
        self._cache: Dict[str, Tuple[float, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        if key not in self._cache:
            return None
        expires_at, val = self._cache[key]
        if time.time() > expires_at:
            del self._cache[key]
            return None
        return val

    def set(self, key: str, value: Any, ttl_seconds: Optional[float] = None) -> None:
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl
        self._cache[key] = (time.time() + ttl, value)

    def clear(self) -> None:
        self._cache.clear()


global_stock_cache = StockDataCache(default_ttl_seconds=3.0)
