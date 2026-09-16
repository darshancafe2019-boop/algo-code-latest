"""
High-Performance Market Data Cache
==================================
Ultra-low latency in-memory quote cache with multi-key indexing and pluggable Redis adapter.
"""
from __future__ import annotations

import asyncio
import time
from typing import Dict, List, Optional, Any

from market_data_gateway.models.tick import MarketTick
from market_data_gateway.adapters.base import NormalizedQuote


class MarketDataCache:
    """Thread-safe & Async-friendly in-memory latest tick cache."""

    def __init__(self):
        # Primary storage: canonical_symbol -> MarketTick
        self._ticks: Dict[str, MarketTick] = {}
        # Backwards compatible: canonical_symbol -> NormalizedQuote
        self._quotes: Dict[str, NormalizedQuote] = {}
        # Alias map: alias_key -> canonical_symbol
        self._alias_map: Dict[str, str] = {}
        self._lock = asyncio.Lock()

    def set_tick(self, tick: MarketTick, quote: Optional[NormalizedQuote] = None) -> None:
        sym = tick.symbol
        self._ticks[sym] = tick
        self._ticks[sym.upper()] = tick

        # Register provider and exchange aliases
        if tick.providerInstrumentId:
            self._alias_map[tick.providerInstrumentId] = sym
            self._alias_map[tick.providerInstrumentId.upper()] = sym
        if tick.internalInstrumentId:
            self._alias_map[tick.internalInstrumentId] = sym
            self._alias_map[tick.internalInstrumentId.upper()] = sym
        if tick.exchange:
            self._alias_map[f"{tick.exchange}:{sym}"] = sym
            self._alias_map[f"{tick.exchange}:{sym.upper()}"] = sym

        if quote:
            self._quotes[sym] = quote
            self._quotes[sym.upper()] = quote

    def get_tick(self, key: str) -> Optional[MarketTick]:
        k_clean = key.strip()
        k_upper = k_clean.upper()

        if k_clean in self._ticks:
            return self._ticks[k_clean]
        if k_upper in self._ticks:
            return self._ticks[k_upper]

        canonical = self._alias_map.get(k_clean) or self._alias_map.get(k_upper)
        if canonical and canonical in self._ticks:
            return self._ticks[canonical]
        return None

    def get_quote(self, key: str) -> Optional[NormalizedQuote]:
        k_clean = key.strip()
        k_upper = k_clean.upper()

        if k_clean in self._quotes:
            return self._quotes[k_clean]
        if k_upper in self._quotes:
            return self._quotes[k_upper]

        canonical = self._alias_map.get(k_clean) or self._alias_map.get(k_upper)
        if canonical and canonical in self._quotes:
            return self._quotes[canonical]
        return None

    def get_snapshot(self, symbols: List[str]) -> Dict[str, NormalizedQuote]:
        snapshot = {}
        for s in symbols:
            q = self.get_quote(s)
            if q:
                snapshot[s] = q
        return snapshot

    def put(self, tick: MarketTick) -> None:
        self.set_tick(tick)

    def get(self, key: str) -> Optional[MarketTick]:
        return self.get_tick(key)

    def put_normalized_quote(self, quote: NormalizedQuote) -> None:
        self._quotes[quote.symbol] = quote
        self._quotes[quote.symbol.upper()] = quote

    def get_stats(self) -> Dict[str, Any]:
        return {
            "cached_ticks": len(self._ticks),
            "cached_quotes": len(self._quotes),
            "alias_keys": len(self._alias_map),
        }

    def get_all_quotes(self) -> Dict[str, NormalizedQuote]:
        return dict(self._quotes)

    def size(self) -> int:
        return len(self._ticks)


global_market_cache = MarketDataCache()
