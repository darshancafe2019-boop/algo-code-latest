"""
Quant.OS Common Market Data Architecture
=========================================
Foundational contracts, canonical identity resolution, decimal-safe arithmetic,
timestamp utilities, domain error definitions, and provider health monitoring.
"""

from market_data.common.provider_interfaces import (
    BaseMarketDataProvider,
    ProviderCapability,
    ProviderMetadata,
)
from market_data.common.capability_registry import (
    ProviderCapabilityRegistry,
    global_capability_registry,
)
from market_data.common.canonical_ids import (
    CanonicalIdResolver,
    make_canonical_id,
    parse_canonical_id,
)
from market_data.common.decimals import (
    to_decimal,
    quantize_price,
    quantize_quantity,
    calculate_pct_change,
    calculate_spread,
)
from market_data.common.timestamps import (
    now_utc_iso,
    parse_iso_timestamp,
    format_session_time,
    is_timestamp_stale,
)
from market_data.common.errors import (
    MarketDataError,
    InstrumentNotFoundError,
    ProviderUnavailableError,
    InvalidFilterError,
    DataQualityError,
)
from market_data.common.health import (
    ProviderHealthTracker,
    global_health_tracker,
)

__all__ = [
    "BaseMarketDataProvider",
    "ProviderCapability",
    "ProviderMetadata",
    "ProviderCapabilityRegistry",
    "global_capability_registry",
    "CanonicalIdResolver",
    "make_canonical_id",
    "parse_canonical_id",
    "to_decimal",
    "quantize_price",
    "quantize_quantity",
    "calculate_pct_change",
    "calculate_spread",
    "now_utc_iso",
    "parse_iso_timestamp",
    "format_session_time",
    "is_timestamp_stale",
    "MarketDataError",
    "InstrumentNotFoundError",
    "ProviderUnavailableError",
    "InvalidFilterError",
    "DataQualityError",
    "ProviderHealthTracker",
    "global_health_tracker",
]
