"""
Modular Futures & Derivatives Canonical Models
===============================================
Institutional models for Perpetual Futures, Dated Futures, Index Futures,
Funding Rates, Basis, and Liquidation Tiers across all market venues.
"""

from __future__ import annotations
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, Any, List, Optional


class FuturesContractType(str, Enum):
    PERPETUAL = "PERPETUAL"
    QUARTERLY = "QUARTERLY"
    MONTHLY = "MONTHLY"
    INDEX_FUTURES = "INDEX_FUTURES"
    COMMODITY_FUTURES = "COMMODITY_FUTURES"


class MarginMode(str, Enum):
    CROSS = "CROSS"
    ISOLATED = "ISOLATED"


class MarketVenue(str, Enum):
    BINANCE = "BINANCE"
    DELTA_EXCHANGE = "DELTA_EXCHANGE"
    UPSTOX_NSE = "UPSTOX_NSE"
    CME = "CME"
    DERIBIT = "DERIBIT"


@dataclass
class FundingRateData:
    symbol: str
    venue: MarketVenue
    funding_rate_8h: float  # e.g. 0.0001 (0.01%)
    funding_rate_annualized: float  # e.g. 10.95% APR
    predicted_next_rate: float
    next_funding_time: str
    countdown_seconds: int
    historical_avg_7d: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class BasisData:
    symbol: str
    spot_symbol: str
    spot_price: float
    futures_price: float
    basis_absolute: float
    basis_percentage: float  # (futures - spot) / spot * 100
    annualized_basis: float  # annualized yield for cash-and-carry
    regime: str  # "CONTANGO" | "BACKWARDATION" | "PARITY"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class LiquidationTier:
    tier: int
    min_notional: float
    max_notional: float
    max_leverage: int
    maintenance_margin_rate: float
    maint_amount: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class CanonicalFuturesContract:
    symbol: str  # e.g. "BTC/USDT:USDT" or "NIFTY-FUT"
    underlying: str  # e.g. "BTC", "ETH", "NIFTY"
    displayName: str
    contract_type: FuturesContractType
    venue: MarketVenue
    mark_price: float
    index_price: float
    last_price: float
    change_24h_pct: float
    volume_24h_usd: float
    open_interest_usd: float
    open_interest_coins: float
    funding_rate: Optional[FundingRateData] = None
    basis: Optional[BasisData] = None
    max_leverage: int = 100
    min_qty: float = 0.001
    tick_size: float = 0.1
    maker_fee_pct: float = 0.02
    taker_fee_pct: float = 0.05
    expiry_date: Optional[str] = None  # None for perpetuals
    is_active: bool = True
    long_short_ratio: float = 1.05
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["contract_type"] = self.contract_type.value
        d["venue"] = self.venue.value
        return d
