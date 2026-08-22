"""
Universal Market Data Cache Engine
==================================
Hybrid Redis and ultra-fast thread-safe In-Memory cache for:
- Normalized Quotes & Ticks
- Option Chains & Strike Matrices
- Futures Basis & Open Interest
- Centralized Subscription Pub/Sub
"""

import time
import json
import logging
import threading
from typing import Dict, Any, List, Optional, Callable

logger = logging.getLogger("MarketDataCache")

# Attempt Redis import
try:
    import redis
    REDIS_INSTALLED = True
except ImportError:
    REDIS_INSTALLED = False


class MarketDataCache:
    """
    High-Performance Unified Market Data Cache.
    Seamlessly switches between Redis and thread-safe In-Memory storage.
    """

    def __init__(self, redis_host: str = "localhost", redis_port: int = 6379, redis_db: int = 0):
        self._lock = threading.RLock()
        self._memory_store: Dict[str, Tuple[float, Any]] = {}  # key -> (expiry_ts, value)
        self._subscribers: Dict[str, List[Callable[[Dict[str, Any]], None]]] = {}
        self._redis_client = None
        self._is_redis_active = False
        self._hits = 0
        self._misses = 0

        # Try connecting to Redis if available
        if REDIS_INSTALLED:
            try:
                r = redis.Redis(
                    host=redis_host,
                    port=redis_port,
                    db=redis_db,
                    socket_connect_timeout=0.5,
                    socket_timeout=0.5,
                    decode_responses=True,
                )
                r.ping()
                self._redis_client = r
                self._is_redis_active = True
                logger.info("Connected to Redis market data cache on %s:%d", redis_host, redis_port)
            except Exception:
                logger.info("Redis server not reachable. Using thread-safe in-memory cache.")

    def is_redis(self) -> bool:
        return self._is_redis_active

    def set_quote(self, symbol: str, quote: Dict[str, Any], ttl_sec: int = 30) -> None:
        """Caches a normalized market quote."""
        key = f"quote:{symbol.upper()}"
        val_str = json.dumps(quote)

        if self._is_redis_active and self._redis_client:
            try:
                self._redis_client.setex(key, ttl_sec, val_str)
                return
            except Exception as e:
                logger.debug("Redis set_quote fallback to memory: %s", e)

        with self._lock:
            expiry_ts = time.time() + ttl_sec
            self._memory_store[key] = (expiry_ts, quote)

    def get_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Retrieves a cached market quote."""
        key = f"quote:{symbol.upper()}"

        if self._is_redis_active and self._redis_client:
            try:
                val = self._redis_client.get(key)
                if val:
                    self._hits += 1
                    return json.loads(val)
            except Exception as e:
                logger.debug("Redis get_quote fallback to memory: %s", e)

        with self._lock:
            entry = self._memory_store.get(key)
            if entry:
                exp, val = entry
                if time.time() <= exp:
                    self._hits += 1
                    return val
                else:
                    del self._memory_store[key]

        self._misses += 1
        return None

    def set_option_chain(self, underlying: str, expiry: str, chain_data: Dict[str, Any], ttl_sec: int = 60) -> None:
        """Caches an option chain snapshot."""
        key = f"option_chain:{underlying.upper()}:{expiry}"
        val_str = json.dumps(chain_data)

        if self._is_redis_active and self._redis_client:
            try:
                self._redis_client.setex(key, ttl_sec, val_str)
                return
            except Exception:
                pass

        with self._lock:
            self._memory_store[key] = (time.time() + ttl_sec, chain_data)

    def get_option_chain(self, underlying: str, expiry: str) -> Optional[Dict[str, Any]]:
        """Retrieves a cached option chain snapshot."""
        key = f"option_chain:{underlying.upper()}:{expiry}"

        if self._is_redis_active and self._redis_client:
            try:
                val = self._redis_client.get(key)
                if val:
                    self._hits += 1
                    return json.loads(val)
            except Exception:
                pass

        with self._lock:
            entry = self._memory_store.get(key)
            if entry:
                exp, val = entry
                if time.time() <= exp:
                    self._hits += 1
                    return val
                else:
                    del self._memory_store[key]

        self._misses += 1
        return None

    def set_futures_chain(self, underlying: str, contracts: List[Dict[str, Any]], ttl_sec: int = 60) -> None:
        """Caches futures contracts list."""
        key = f"futures_chain:{underlying.upper()}"
        if self._is_redis_active and self._redis_client:
            try:
                self._redis_client.setex(key, ttl_sec, json.dumps(contracts))
                return
            except Exception:
                pass

        with self._lock:
            self._memory_store[key] = (time.time() + ttl_sec, contracts)

    def get_futures_chain(self, underlying: str) -> Optional[List[Dict[str, Any]]]:
        """Retrieves cached futures contracts list."""
        key = f"futures_chain:{underlying.upper()}"
        if self._is_redis_active and self._redis_client:
            try:
                val = self._redis_client.get(key)
                if val:
                    self._hits += 1
                    return json.loads(val)
            except Exception:
                pass

        with self._lock:
            entry = self._memory_store.get(key)
            if entry:
                exp, val = entry
                if time.time() <= exp:
                    self._hits += 1
                    return val
                else:
                    del self._memory_store[key]

        self._misses += 1
        return None

    def publish_ticker(self, symbol: str, quote: Dict[str, Any]) -> None:
        """Publishes ticker updates to registered in-process subscribers."""
        self.set_quote(symbol, quote)

        with self._lock:
            subs = self._subscribers.get(symbol.upper(), []) + self._subscribers.get("*", [])

        for cb in subs:
            try:
                cb(quote)
            except Exception as e:
                logger.error("Subscriber callback failed for %s: %s", symbol, e)

    def subscribe_ticker(self, symbol: str, callback: Callable[[Dict[str, Any]], None]) -> None:
        """Registers a listener for live ticker updates."""
        with self._lock:
            sym_key = symbol.upper()
            if sym_key not in self._subscribers:
                self._subscribers[sym_key] = []
            self._subscribers[sym_key].append(callback)

    def get_cache_stats(self) -> Dict[str, Any]:
        """Returns diagnostic telemetry for the cache subsystem."""
        with self._lock:
            # Clean expired memory keys
            now = time.time()
            valid_keys = [k for k, (exp, _) in self._memory_store.items() if exp > now]
            memory_key_count = len(valid_keys)

        return {
            "driver": "REDIS" if self._is_redis_active else "IN_MEMORY",
            "is_redis_active": self._is_redis_active,
            "cached_keys_count": memory_key_count,
            "hits": self._hits,
            "misses": self._misses,
            "hit_ratio_pct": round((self._hits / max(1, self._hits + self._misses)) * 100.0, 2),
            "status": "HEALTHY",
        }


# Global Singleton Instance
global_market_cache = MarketDataCache()
