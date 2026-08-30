"""
Stock Provider Registry
=======================
Manages connected market data providers supporting pure equity feeds.
"""

from typing import Dict, List, Optional
from market_data.common.provider_interfaces import BaseMarketDataProvider, ProviderCapability


class StockProviderRegistry:
    def __init__(self):
        self._providers: Dict[str, BaseMarketDataProvider] = {}

    def register(self, provider: BaseMarketDataProvider) -> None:
        p_id = provider.get_provider_id().lower()
        self._providers[p_id] = provider

    def get(self, provider_id: str) -> Optional[BaseMarketDataProvider]:
        return self._providers.get(provider_id.lower())

    def get_all(self) -> List[BaseMarketDataProvider]:
        return list(self._providers.values())

    def get_quote_providers(self) -> List[BaseMarketDataProvider]:
        return [
            p for p in self._providers.values()
            if p.has_capability(ProviderCapability.REALTIME_QUOTES) or p.has_capability(ProviderCapability.DELAYED_QUOTES)
        ]


global_stock_provider_registry = StockProviderRegistry()
