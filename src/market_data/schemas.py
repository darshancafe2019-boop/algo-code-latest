"""
Universal Market Data Canonical Schemas
=======================================
Standardized, normalized dataclasses for all quotes, ticks, option chains,
futures contracts, and provider capabilities.
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from src.market_data.interfaces import (
    ProviderCapability,
    ProviderStatus,
    AssetClass,
    OptionType,
    DataProvenance,
    DataQuality,
)


@dataclass
class MarketQuote:
    """Canonical Normalized Market Quote."""
    symbol: str
    exchange: str
    provider: str
    lastPrice: float
    bid: float
    ask: float
    volume: float
    timestamp: str  # ISO 8601 UTC
    status: str = "LIVE"
    data_quality: str = DataQuality.VALID.value
    provenance: str = DataProvenance.PROVIDER_DATA.value
    vwap: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    open: Optional[float] = None
    close: Optional[float] = None
    change_pct: Optional[float] = None
    sequence: Optional[int] = None
    server_time_ms: int = field(default_factory=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class FuturesQuote:
    """Canonical Normalized Futures & Perpetuals Quote."""
    underlying: str
    contract: str
    exchange: str
    provider: str
    expiry: str  # "PERPETUAL" or "YYYY-MM-DD"
    lastPrice: float
    bid: float
    ask: float
    volume: float
    timestamp: str
    status: str = "LIVE"
    data_quality: str = DataQuality.VALID.value
    provenance: str = DataProvenance.PROVIDER_DATA.value
    OI: float = 0.0
    OIChange: float = 0.0
    basis: float = 0.0
    annualized_basis: float = 0.0
    markPrice: Optional[float] = None
    indexPrice: Optional[float] = None
    fundingRate: Optional[float] = None
    nextFundingTime: Optional[str] = None
    contract_size: float = 1.0
    tick_size: float = 0.01

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class OptionQuote:
    """Canonical Normalized Option Contract Quote."""
    underlying: str
    expiry: str  # "YYYY-MM-DD"
    strike: float
    optionType: str  # "CE" or "PE"
    symbol: str
    exchange: str
    provider: str
    lastPrice: float
    bid: float
    ask: float
    volume: float
    OI: float
    OIChange: float
    timestamp: str
    status: str = "LIVE"
    data_quality: str = DataQuality.VALID.value
    provenance: str = DataProvenance.PROVIDER_DATA.value
    greeks_source: str = "CALCULATED"  # "PROVIDER" or "CALCULATED"
    IV: float = 0.0
    delta: float = 0.0
    gamma: float = 0.0
    theta: float = 0.0
    vega: float = 0.0
    rho: float = 0.0
    intrinsic_value: float = 0.0
    time_value: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class OptionStrikeRow:
    """Strike-centered Call/Put Row for Option Chain UI."""
    strike: float
    is_atm: bool
    distance_pct: float
    ce: OptionQuote
    pe: OptionQuote

    def to_dict(self) -> Dict[str, Any]:
        return {
            "strike": self.strike,
            "is_atm": self.is_atm,
            "distance_pct": self.distance_pct,
            "ce": self.ce.to_dict(),
            "pe": self.pe.to_dict(),
        }


@dataclass
class OptionChainSnapshot:
    """Full Option Chain Snapshot with Market Analytics."""
    underlying: str
    spot_price: float
    selected_expiry: str
    available_expiries: List[str]
    strikes: List[OptionStrikeRow]
    max_pain: float
    pcr_oi: float
    pcr_volume: float
    total_call_oi: float
    total_put_oi: float
    total_call_volume: float
    total_put_volume: float
    support_zones: List[float] = field(default_factory=list)
    resistance_zones: List[float] = field(default_factory=list)
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "LIVE"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "underlying": self.underlying,
            "spot_price": self.spot_price,
            "selected_expiry": self.selected_expiry,
            "available_expiries": self.available_expiries,
            "strike_count": len(self.strikes),
            "max_pain": self.max_pain,
            "pcr": {
                "pcr_oi": self.pcr_oi,
                "pcr_volume": self.pcr_volume,
                "total_call_oi": self.total_call_oi,
                "total_put_oi": self.total_put_oi,
                "total_call_volume": self.total_call_volume,
                "total_put_volume": self.total_put_volume,
            },
            "support_zones": self.support_zones,
            "resistance_zones": self.resistance_zones,
            "timestamp": self.timestamp,
            "strikes": [s.to_dict() for s in self.strikes],
        }


@dataclass
class InstrumentMetadata:
    """Static and Dynamic Instrument Master Specifications."""
    symbol: str
    display_name: str
    description: str
    asset_class: str
    exchange: str
    region: str
    provider_id: str
    lot_size: int = 1
    tick_size: float = 0.05
    is_active: bool = True
    base_currency: str = "USD"
    quote_currency: str = "USD"
    has_options: bool = False
    has_futures: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ProviderCapabilityMatrixEntry:
    """Provider Capability Matrix Entry for /system/providers."""
    provider_id: str
    provider_name: str
    market: str
    exchange: str
    data_types: List[str]
    realtime: bool
    historical: bool
    options: bool
    futures: bool
    oi: bool
    greeks: bool
    status: str  # "LIVE", "DELAYED", "STALE", "DISCONNECTED", "NOT_CONFIGURED", "NOT_SUPPORTED"
    latency_ms: float
    entitlement: str = "LICENSED"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
