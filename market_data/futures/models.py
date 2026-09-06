"""
Modular Futures & Derivatives Canonical Models
===============================================
Institutional models for Perpetual Futures, Dated Futures, Index Futures,
Funding Rates, Basis, Liquidation Tiers, Provider Health, and Exact Source Identification
across all market data providers and execution brokers.
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
    STOCK_FUTURES = "STOCK_FUTURES"
    COMMODITY_FUTURES = "COMMODITY_FUTURES"


class MarginMode(str, Enum):
    CROSS = "CROSS"
    ISOLATED = "ISOLATED"


class MarketVenue(str, Enum):
    BINANCE = "BINANCE"
    BINANCE_USDM = "BINANCE_USDM"
    BINANCE_COINM = "BINANCE_COINM"
    DELTA_EXCHANGE = "DELTA_EXCHANGE"
    UPSTOX_NSE = "UPSTOX_NSE"
    DHAN_NSE = "DHAN_NSE"
    CME = "CME"
    DERIBIT = "DERIBIT"
    PAPER_SIM = "PAPER_SIM"


@dataclass
class FundingRateData:
    symbol: str
    venue: MarketVenue
    funding_rate_8h: Optional[float] = None  # e.g. 0.0001 (0.01%)
    funding_rate_annualized: Optional[float] = None  # e.g. 10.95% APR
    predicted_next_rate: Optional[float] = None
    next_funding_time: Optional[str] = None
    countdown_seconds: Optional[int] = None
    historical_avg_7d: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["venue"] = self.venue.value if isinstance(self.venue, MarketVenue) else str(self.venue)
        return d


@dataclass
class BasisData:
    symbol: str
    spot_symbol: str
    spot_price: Optional[float] = None
    futures_price: Optional[float] = None
    basis_absolute: Optional[float] = None
    basis_percentage: Optional[float] = None  # (futures - spot) / spot * 100
    annualized_basis: Optional[float] = None  # annualized yield for cash-and-carry
    regime: str = "PARITY"  # "CONTANGO" | "BACKWARDATION" | "PARITY"

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
class ProviderHealthReport:
    provider: str
    display_name: str
    configured: bool
    rest_status: str  # CONNECTED, AUTH_REQUIRED, TOKEN_EXPIRED, FAILED, NOT_CONFIGURED
    websocket_status: str  # CONNECTED, CONNECTING, DISCONNECTED, NOT_CONFIGURED
    subscription_status: str  # ACTIVE, IDLE, FAILED, NOT_APPLICABLE
    decoder_status: str  # OPERATIONAL, DEGRADED, ERROR, NOT_APPLICABLE
    instrument_count: int
    first_tick_received: bool
    last_real_tick_at: Optional[str] = None
    last_tick_age_ms: Optional[float] = None
    status: str = "LIVE"  # LIVE, TOKEN_EXPIRED, AUTH_REQUIRED, DATA_PLAN_INACTIVE, NOT_CONFIGURED, STALE, DISCONNECTED
    error_code: Optional[str] = None
    error_details: Optional[str] = None
    reconnect_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class CanonicalFuturesContract:
    # Primary Contract Identity
    symbol: str  # e.g. "BTC/USDT:USDT" or "NIFTY-FUT"
    underlying: str  # e.g. "BTC", "ETH", "NIFTY"
    displayName: str
    contract_type: FuturesContractType
    venue: MarketVenue

    # Pricing & Market Telemetry (Nullable to represent missing data truthfully)
    mark_price: Optional[float] = None
    index_price: Optional[float] = None
    last_price: Optional[float] = None
    bid: Optional[float] = None
    ask: Optional[float] = None
    bid_qty: Optional[float] = None
    ask_qty: Optional[float] = None
    change_24h_pct: Optional[float] = None
    volume_24h_usd: Optional[float] = None
    open_interest_usd: Optional[float] = None
    open_interest_coins: Optional[float] = None
    open_interest_change: Optional[float] = None

    # Exact Source Identification & Broker Data Isolation (Decoupled Data Source vs Execution Broker)
    market_data_provider: str = ""  # e.g. BINANCE_USDM, BINANCE_COINM, DELTA_INDIA, UPSTOX, DHAN, CME, PAPER_SIM
    provider: str = ""  # Human display name
    execution_broker: str = ""  # e.g. BINANCE, DELTA, UPSTOX, DHAN, PAPER_SIM
    broker_account: str = "ba_primary"
    broker_account_alias: str = "Primary Account"
    environment: str = "PAPER"  # PAPER, SHADOW, LIVE
    exchange: str = "BINANCE"  # BINANCE, DELTA_INDIA, NSE, BSE, CME, SIM
    segment: str = "CRYPTO_PERPETUAL"
    asset_type: str = "PERPETUAL"  # FUT, PERPETUAL, INDEX, COMMODITY, STOCK_FUT
    canonical_symbol: str = ""  # e.g. CRYPTO:BINANCE:BTC-USDT:PERPETUAL
    provider_instrument_id: str = ""
    instrument_key: str = ""
    feed_type: str = "WEBSOCKET"  # WEBSOCKET, REST, SIMULATOR
    last_update: Optional[str] = None
    data_age_ms: Optional[float] = None
    latency_ms: Optional[float] = None
    freshness_status: str = "LIVE"  # LIVE, DELAYED, STALE, NO_DATA, MARKET_CLOSED, UNAVAILABLE
    market_status: str = "OPEN"  # OPEN, CLOSED, PRE_OPEN, POST_CLOSE
    status: str = "CONNECTED"  # CONNECTED, LIVE, AUTH_REQUIRED, TOKEN_EXPIRED, DATA_PLAN_INACTIVE, NOT_CONFIGURED, STALE, DISCONNECTED
    error_details: Optional[str] = None

    # Multi-Asset Contract Specs
    quote_currency: str = "USD"
    margin_currency: str = "USD"
    settlement_type: str = "CASH"  # CASH, PHYSICAL
    contract_multiplier: float = 1.0
    lot_size: float = 1.0
    tick_size: float = 0.1
    min_qty: float = 0.001
    max_leverage: int = 100
    maker_fee_pct: float = 0.02
    taker_fee_pct: float = 0.05
    expiry_date: Optional[str] = None  # None for perpetuals
    is_active: bool = True
    long_short_ratio: Optional[float] = None
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    # Derivatives Metrics
    funding_rate: Optional[FundingRateData] = None
    basis: Optional[BasisData] = None

    def __post_init__(self):
        if not self.market_data_provider:
            if self.venue in [MarketVenue.BINANCE, MarketVenue.BINANCE_USDM]:
                self.market_data_provider = "BINANCE_USDM"
            elif self.venue == MarketVenue.BINANCE_COINM:
                self.market_data_provider = "BINANCE_COINM"
            elif self.venue == MarketVenue.DELTA_EXCHANGE:
                self.market_data_provider = "DELTA_INDIA"
            elif self.venue == MarketVenue.UPSTOX_NSE:
                self.market_data_provider = "UPSTOX"
            elif self.venue == MarketVenue.DHAN_NSE:
                self.market_data_provider = "DHAN"
            elif self.venue == MarketVenue.CME:
                self.market_data_provider = "CME"
            else:
                self.market_data_provider = "PAPER_SIM"

        if not self.provider:
            display_map = {
                "BINANCE_USDM": "Binance USD-M Official API",
                "BINANCE_COINM": "Binance COIN-M Official API",
                "DELTA_INDIA": "Delta Exchange India Official API",
                "UPSTOX": "Upstox Official API",
                "DHAN": "Dhan Official API",
                "CME": "CME Licensed Data Gateway",
                "PAPER_SIM": "Paper Simulator Engine",
            }
            self.provider = display_map.get(self.market_data_provider, f"{self.market_data_provider} Feed")

        if not self.execution_broker:
            exec_map = {
                "BINANCE_USDM": "BINANCE",
                "BINANCE_COINM": "BINANCE",
                "DELTA_INDIA": "DELTA",
                "UPSTOX": "UPSTOX",
                "DHAN": "DHAN",
                "CME": "CME",
                "PAPER_SIM": "PAPER_SIM",
            }
            self.execution_broker = exec_map.get(self.market_data_provider, "PAPER_SIM")

        if not self.instrument_key:
            self.instrument_key = f"{self.market_data_provider}:{self.broker_account}:{self.environment}:{self.exchange}:{self.segment}:{self.symbol}"

        if not self.canonical_symbol:
            asset_prefix = "CRYPTO" if "CRYPTO" in self.segment else ("INDIA" if self.exchange == "NSE" else "GLOBAL")
            self.canonical_symbol = f"{asset_prefix}:{self.exchange}:{self.symbol}:{self.asset_type}"

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["contract_type"] = self.contract_type.value if isinstance(self.contract_type, FuturesContractType) else str(self.contract_type)
        d["venue"] = self.venue.value if isinstance(self.venue, MarketVenue) else str(self.venue)
        if self.funding_rate:
            d["funding_rate"] = self.funding_rate.to_dict()
        if self.basis:
            d["basis"] = self.basis.to_dict()
        return d
