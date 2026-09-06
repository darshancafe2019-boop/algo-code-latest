"""
Futures Market Unified Service
===============================
Coordinates Quote, Funding, Basis, Liquidation, Screener, and Provider Health engines with in-memory caching.
"""

from __future__ import annotations
import time
from typing import Dict, Any, List, Optional
from market_data.futures.models import CanonicalFuturesContract, ProviderHealthReport
from market_data.futures.quote_engine import FuturesQuoteEngine
from market_data.futures.funding_engine import FundingRateEngine
from market_data.futures.basis_engine import BasisEngine
from market_data.futures.liquidation_engine import LiquidationEngine
from market_data.futures.screener_engine import FuturesScreenerEngine


class FuturesMarketService:
    """Singleton service for all Futures & Derivatives market operations."""

    _instance: Optional[FuturesMarketService] = None

    def __init__(self):
        self.quote_engine = FuturesQuoteEngine()
        self.funding_engine = FundingRateEngine()
        self.basis_engine = BasisEngine()
        self.liquidation_engine = LiquidationEngine()
        self.screener_engine = FuturesScreenerEngine()

        self._cached_contracts: List[CanonicalFuturesContract] = []
        self._last_cache_time: float = 0.0
        self._cache_ttl_sec: float = 3.0  # 3s cache

    @classmethod
    def get_instance(cls) -> FuturesMarketService:
        if cls._instance is None:
            cls._instance = FuturesMarketService()
        return cls._instance

    def get_all_contracts(self, force_refresh: bool = False) -> List[CanonicalFuturesContract]:
        """Returns cached universe contracts with 3s TTL."""
        now = time.time()
        if force_refresh or not self._cached_contracts or (now - self._last_cache_time) > self._cache_ttl_sec:
            self._cached_contracts = self.quote_engine.get_all_universe_contracts()
            self._last_cache_time = now
        return self._cached_contracts

    def get_providers_health(self) -> List[ProviderHealthReport]:
        """Returns provider diagnostic health reports."""
        return self.quote_engine.get_providers_health()

    def get_contract_by_symbol(self, symbol: str) -> Optional[CanonicalFuturesContract]:
        contracts = self.get_all_contracts()
        for c in contracts:
            if c.symbol.upper() == symbol.upper() or c.underlying.upper() == symbol.upper():
                return c
        return None

    def get_funding_heatmap(self) -> List[Dict[str, Any]]:
        contracts = self.get_all_contracts()
        return self.screener_engine.get_funding_heatmap(contracts)

    def calculate_liquidation(self, side: str, entry_price: float, leverage: int) -> Dict[str, Any]:
        liq_price = self.liquidation_engine.calculate_liquidation_price(side, entry_price, leverage)
        distance_pct = round(abs(entry_price - liq_price) / entry_price * 100, 2) if entry_price > 0 else 0
        return {
            "entryPrice": entry_price,
            "leverage": leverage,
            "side": side.upper(),
            "liquidationPrice": liq_price,
            "liquidationDistancePct": distance_pct,
            "riskLevel": "HIGH" if distance_pct < 5.0 else "MODERATE" if distance_pct < 15.0 else "SAFE",
        }
