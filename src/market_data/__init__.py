"""
Universal Market Data Engine Subsystem
======================================
"""

from src.market_data.interfaces import (
    ProviderCapability,
    ProviderStatus,
    AssetClass,
    OptionType,
    DataProvenance,
    DataQuality,
    MarketDataProvider,
    OptionsDataProvider,
    FuturesDataProvider,
    ReferenceDataProvider,
    BrokerProvider,
    ExecutionProvider,
)
from src.market_data.schemas import (
    MarketQuote,
    FuturesQuote,
    OptionQuote,
    OptionStrikeRow,
    OptionChainSnapshot,
    InstrumentMetadata,
    ProviderCapabilityMatrixEntry,
)
from src.market_data.data_quality import DataQualityEngine
from src.market_data.cache_engine import MarketDataCache, global_market_cache
from src.market_data.stale_protection import StaleDataProtectionEngine, global_stale_protection
from src.market_data.instrument_master import InstrumentMaster, global_instrument_master
from src.market_data.options_engine import UniversalOptionsEngine, global_options_engine
from src.market_data.futures_engine import UniversalFuturesEngine, global_futures_engine
from src.market_data.stream_engine import CentralizedStreamManager, global_stream_manager
from src.market_data.live_market_data_service import LiveMarketDataService, global_live_market_data_service
from src.market_data.canonical_pipeline import (
    CanonicalQuote,
    resolve_canonical_quote,
    resolve_symbol_aliases,
    evaluate_quote_freshness,
    validate_canonical_quote,
    STATE_LIVE,
    STATE_DELAYED,
    STATE_STALE,
    STATE_UNKNOWN,
    STATE_INVALID,
    STATE_NO_DATA,
)

__all__ = [
    "ProviderCapability",
    "ProviderStatus",
    "AssetClass",
    "OptionType",
    "DataProvenance",
    "DataQuality",
    "MarketDataProvider",
    "OptionsDataProvider",
    "FuturesDataProvider",
    "ReferenceDataProvider",
    "BrokerProvider",
    "ExecutionProvider",
    "MarketQuote",
    "FuturesQuote",
    "OptionQuote",
    "OptionStrikeRow",
    "OptionChainSnapshot",
    "InstrumentMetadata",
    "ProviderCapabilityMatrixEntry",
    "DataQualityEngine",
    "MarketDataCache",
    "global_market_cache",
    "StaleDataProtectionEngine",
    "global_stale_protection",
    "InstrumentMaster",
    "global_instrument_master",
    "UniversalOptionsEngine",
    "global_options_engine",
    "UniversalFuturesEngine",
    "global_futures_engine",
    "CentralizedStreamManager",
    "global_stream_manager",
    "LiveMarketDataService",
    "global_live_market_data_service",
    "CanonicalQuote",
    "resolve_canonical_quote",
    "resolve_symbol_aliases",
    "evaluate_quote_freshness",
    "validate_canonical_quote",
    "STATE_LIVE",
    "STATE_DELAYED",
    "STATE_STALE",
    "STATE_UNKNOWN",
    "STATE_INVALID",
    "STATE_NO_DATA",
]

