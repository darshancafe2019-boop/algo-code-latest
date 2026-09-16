"""
Quant.OS Provider Control Plane
===============================
Authoritative provider registry, health telemetry resolver, multi-broker role management,
and credential protection service.
"""

from .provider_registry import (
    ProviderCategory,
    ConnectionState,
    ProviderCapability,
    ProviderDefinition,
    get_provider_registry,
    DEFAULT_PROVIDERS_CATALOG,
    global_provider_registry,
)
from .provider_service import ProviderService, global_provider_service
from .legacy_manager import (
    CircuitState,
    ProviderStatus,
    CircuitBreaker,
    ProviderAdapter,
    BinanceSpotAdapter,
    BinanceFuturesAdapter,
    OptionsPlaceholderAdapter,
    UpstoxMarketAdapter,
    ProviderManager,
    global_provider_manager,
)

__all__ = [
    # Control Plane & Registry
    "ProviderCategory",
    "ConnectionState",
    "ProviderCapability",
    "ProviderDefinition",
    "get_provider_registry",
    "DEFAULT_PROVIDERS_CATALOG",
    "global_provider_registry",
    "ProviderService",
    "global_provider_service",
    # Legacy Routing & Adapters
    "CircuitState",
    "ProviderStatus",
    "CircuitBreaker",
    "ProviderAdapter",
    "BinanceSpotAdapter",
    "BinanceFuturesAdapter",
    "OptionsPlaceholderAdapter",
    "UpstoxMarketAdapter",
    "ProviderManager",
    "global_provider_manager",
]
