"""
Quant.OS Global Market Data Taxonomy & Canonical Registry Models
================================================================
Authoritative multi-dimensional taxonomy:
- market_region: INDIA | US | EUROPE | ASIA | GLOBAL | CRYPTO
- asset_class: EQUITY | FUND | ETF | INDEX | CRYPTO | FOREX | COMMODITY | BOND | ECONOMIC_SERIES | UNKNOWN
- instrument_type: CASH | SPOT | REFERENCE_INDEX | FUTURE | PERPETUAL | OPTION | FUND | BOND | ECONOMIC_SERIES | UNKNOWN

STRICT TRUTH-IN-DATA & LICENSING:
- No TradingView scraping / reverse-engineered feeds.
- Verified provider data only (Upstox, Binance, LicensedGlobalProvider).
- Unconfigured licensed sources return DATA_SOURCE_REQUIRED.
"""

from __future__ import annotations

from enum import Enum
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone


class MarketRegion(str, Enum):
    INDIA = "INDIA"
    US = "US"
    EUROPE = "EUROPE"
    ASIA = "ASIA"
    GLOBAL = "GLOBAL"
    CRYPTO = "CRYPTO"


class AssetClass(str, Enum):
    EQUITY = "EQUITY"
    FUND = "FUND"
    ETF = "ETF"
    INDEX = "INDEX"
    CRYPTO = "CRYPTO"
    FOREX = "FOREX"
    COMMODITY = "COMMODITY"
    BOND = "BOND"
    ECONOMIC_SERIES = "ECONOMIC_SERIES"
    UNKNOWN = "UNKNOWN"


class InstrumentType(str, Enum):
    CASH = "CASH"
    SPOT = "SPOT"
    REFERENCE_INDEX = "REFERENCE_INDEX"
    FUTURE = "FUTURE"
    PERPETUAL = "PERPETUAL"
    OPTION = "OPTION"
    FUND = "FUND"
    BOND = "BOND"
    ECONOMIC_SERIES = "ECONOMIC_SERIES"
    UNKNOWN = "UNKNOWN"


class DataStatus(str, Enum):
    LIVE = "LIVE"
    SNAPSHOT = "SNAPSHOT"
    STALE = "STALE"
    DELAYED = "DELAYED"
    MARKET_CLOSED = "MARKET_CLOSED"
    OFFLINE = "OFFLINE"
    AUTH_REQUIRED = "AUTH_REQUIRED"
    DATA_SOURCE_REQUIRED = "DATA_SOURCE_REQUIRED"
    ERROR = "ERROR"


class FieldProvenance(str, Enum):
    PROVIDER_SUPPLIED = "PROVIDER_SUPPLIED"
    CALCULATED = "CALCULATED"
    UNAVAILABLE = "UNAVAILABLE"


@dataclass
class TradableInstrument:
    """Canonical Normalized Tradable Instrument."""
    instrument_id: str                   # Stable: provider + ":" + provider_instrument_id
    provider: str                        # upstox | binance | licensed_global
    provider_instrument_id: str          # e.g. NSE_EQ|INE002A01018 | BTCUSDT
    instrument_key: str                  # Standardized provider lookup key
    symbol: str                          # Canonical ticker e.g. RELIANCE, BTC/USDT, AAPL
    trading_symbol: str                  # Exchange trading symbol e.g. RELIANCE-EQ, BTCUSDT
    display_name: str                    # Human-friendly name e.g. Reliance Industries Limited
    exchange: str                        # NSE | BSE | BINANCE | NASDAQ | NYSE | CME | CBOT
    exchange_segment: str                # CASH | FO | SPOT | FUTURES | DERIVATIVES
    market_region: str                   # INDIA | US | EUROPE | ASIA | GLOBAL | CRYPTO
    asset_class: str                     # EQUITY | FUND | ETF | INDEX | CRYPTO | FOREX | COMMODITY | BOND
    instrument_type: str                 # CASH | SPOT | REFERENCE_INDEX | FUTURE | PERPETUAL | OPTION
    underlying: Optional[str] = None     # Parent underlying symbol/key if derivative
    currency: str = "USD"                # INR | USD | EUR | USDT
    expiry: Optional[str] = None         # YYYY-MM-DD or PERPETUAL
    strike: Optional[float] = None       # Strike price for options
    option_type: Optional[str] = None    # CE | PE | CALL | PUT
    contract_multiplier: float = 1.0
    lot_size: float = 1.0
    tick_size: float = 0.01
    price_precision: int = 2
    quantity_precision: int = 4
    trading_session: str = "REGULAR"     # 24/7 | 09:15-15:30 IST | 09:30-16:00 EST
    timezone: str = "UTC"
    is_active: bool = True
    last_discovered_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class EconomicSeriesData:
    """Canonical Model for Macro & Economic Data Series (Not a tradable instrument)."""
    series_id: str                       # e.g. US_CPI, IND_REPO_RATE, US_FED_FUNDS
    provider: str                        # licensed_global | official_stats
    country: str                         # US | IN | EU | GB | JP | CN
    category: str                        # INFLATION | INTEREST_RATE | GDP | LABOR | TRADE
    title: str                           # e.g. Consumer Price Index YoY
    unit: str                            # % | USD | Index Points
    frequency: str                       # MONTHLY | QUARTERLY | ANNUALLY
    period: str                          # e.g. 2026-07
    release_time: str                    # ISO 8601 UTC
    actual: Optional[float] = None
    forecast: Optional[float] = None
    previous: Optional[float] = None
    revision: Optional[float] = None
    importance: str = "MEDIUM"           # HIGH | MEDIUM | LOW
    source: str = "OFFICIAL"             # BLS | RBI | FED | EUROSTAT
    data_status: str = DataStatus.LIVE.value
    received_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ProviderCapabilityRecord:
    """Capability specification for a verified market-data provider."""
    provider: str
    supported_markets: List[str]
    supported_asset_classes: List[str]
    instrument_discovery: bool
    historical_data: bool
    rest_quotes: bool
    websocket_quotes: bool
    trades: bool
    orderbook: bool
    options_chain: bool
    open_interest: bool
    funding_rate: bool
    economic_data: bool
    authentication_required: bool
    rate_limits: Dict[str, Any]
    licence_status: str                  # VERIFIED_OFFICIAL | LICENSED | DATA_SOURCE_REQUIRED
    connection_status: str               # LIVE | OFFLINE | AUTH_REQUIRED | NOT_CONFIGURED

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class NormalizedLiveQuote:
    """Canonical Normalized Live Quote across all markets."""
    instrument_id: str
    provider: str
    transport: str                       # WEBSOCKET | REST | CACHE
    last_price: float
    bid: float
    ask: float
    bid_size: float = 0.0
    ask_size: float = 0.0
    volume: float = 0.0
    open_interest: float = 0.0
    mark_price: Optional[float] = None
    index_price: Optional[float] = None
    provider_event_time: Optional[str] = None
    received_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    age_ms: int = 0
    market_status: str = "OPEN"          # OPEN | CLOSED | PRE_OPEN | POST_CLOSE
    data_status: str = DataStatus.LIVE.value

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
