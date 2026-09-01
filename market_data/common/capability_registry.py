"""
Provider Capability Registry
============================
Maintains a single source of truth for all configured data sources,
preventing requests for unsupported features (e.g. asking for NSE fundamentals from Binance).
"""

from typing import Dict, List, Optional, Set, Any
from market_data.common.provider_interfaces import ProviderCapability, ProviderMetadata, BaseMarketDataProvider


class ProviderCapabilityRegistry:
    """Registry maintaining active provider instances and their validated capabilities."""

    def __init__(self):
        self._providers: Dict[str, BaseMarketDataProvider] = {}
        self._capabilities_by_exchange: Dict[str, Set[str]] = {}

    def register_provider(self, provider: BaseMarketDataProvider) -> None:
        p_id = provider.get_provider_id().lower()
        self._providers[p_id] = provider
        for ex in provider.metadata.supported_exchanges:
            ex_norm = ex.upper()
            if ex_norm not in self._capabilities_by_exchange:
                self._capabilities_by_exchange[ex_norm] = set()
            self._capabilities_by_exchange[ex_norm].add(p_id)

    def get_provider(self, provider_id: str) -> Optional[BaseMarketDataProvider]:
        return self._providers.get(provider_id.lower())

    def get_all_providers(self) -> List[BaseMarketDataProvider]:
        return list(self._providers.values())

    def get_providers_for_exchange(self, exchange: str) -> List[BaseMarketDataProvider]:
        p_ids = self._capabilities_by_exchange.get(exchange.upper(), set())
        return [self._providers[p_id] for p_id in p_ids if p_id in self._providers]

    def can_provide(self, provider_id: str, capability: ProviderCapability) -> bool:
        provider = self.get_provider(provider_id)
        if not provider:
            return False
        return provider.has_capability(capability)

    def get_capability_matrix(self) -> Dict[str, Dict[str, Any]]:
        matrix = {}
        for p_id, p in self._providers.items():
            matrix[p_id] = {
                "name": p.get_provider_name(),
                "exchanges": p.metadata.supported_exchanges,
                "countries": p.metadata.supported_countries,
                "capabilities": [c.value for c in p.metadata.capabilities],
                "is_active": p.metadata.is_active,
                "is_authenticated": p.metadata.is_authenticated,
                "latency_ms": p.metadata.latency_ms,
            }
        return matrix


global_capability_registry = ProviderCapabilityRegistry()
