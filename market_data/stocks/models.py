"""
Stock Domain Models
===================
Authoritative dataclass models for pure equity instruments, normalized quotes,
fundamentals, technicals, and explainable analysis.
Zero options or crypto leaks.
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional
from market_data.stocks.enums import (
    StockRegion,
    StockExchange,
    StockInstrumentType,
    MarketCapCategory,
    MarketSessionStatus,
    TradingStatus,
    TrendDirection,
    DataQualityStatus,
)


@dataclass
class StockInstrument:
    """Canonical Normalized Stock Instrument."""
    instrument_id: str                   # e.g. upstox:NSE:INE002A01018 or nse:NSE:RELIANCE
    symbol: str                          # e.g. RELIANCE, AAPL, TCS
    company_name: str                    # e.g. Reliance Industries Limited
    exchange: str                        # NSE, BSE, NASDAQ, NYSE
    region: str                          # INDIA, US, GLOBAL
    currency: str                        # INR, USD, EUR
    instrument_type: str = "EQUITY"      # EQUITY, ETF, ADR
    isin: Optional[str] = None
    provider_token: Optional[str] = None # Native token / instrument_key
    sector: Optional[str] = None
    industry: Optional[str] = None
    market_cap_category: str = "UNKNOWN"
    index_memberships: List[str] = field(default_factory=list)
    trading_status: str = "ACTIVE"
    tick_size: float = 0.05
    lot_size: int = 1
    session_timezone: str = "Asia/Kolkata"
    primary_provider: str = "upstox"
    backup_provider: Optional[str] = None
    is_fno_enabled: bool = False         # True only if real linked F&O contracts exist
    last_metadata_refresh: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class NormalizedStockQuote:
    """Normalized Stock Quote Snapshot."""
    instrument_id: str
    symbol: str
    exchange: str
    currency: str
    last_price: float
    open_price: Optional[float] = None
    high_price: Optional[float] = None
    low_price: Optional[float] = None
    previous_close: Optional[float] = None
    change_abs: Optional[float] = None
    change_pct: Optional[float] = None
    bid: Optional[float] = None
    ask: Optional[float] = None
    bid_size: Optional[int] = None
    ask_size: Optional[int] = None
    spread: Optional[float] = None
    volume_shares: float = 0.0           # Pure share volume (count of shares)
    average_volume_30d: Optional[float] = None
    relative_volume: Optional[float] = None # Current volume / Avg volume
    turnover_quote_currency: Optional[float] = None # e.g. INR or USD turnover
    turnover_usd: Optional[float] = None
    turnover_inr: Optional[float] = None
    vwap: Optional[float] = None
    market_cap: Optional[float] = None
    high_52w: Optional[float] = None
    low_52w: Optional[float] = None
    market_status: str = "REGULAR"       # PRE_MARKET | REGULAR | POST_MARKET | CLOSED
    provider: str = "upstox"
    timestamp_exchange: Optional[str] = None
    timestamp_received: Optional[str] = None
    data_age_ms: float = 0.0
    data_quality: str = "LIVE"           # LIVE | DELAYED | STALE | PARTIAL | MARKET_CLOSED | INVALID
    quality_notes: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class StockFundamentals:
    """Fundamental Metrics Model (with explicit None for missing values)."""
    instrument_id: str
    symbol: str
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    forward_pe: Optional[float] = None
    pb_ratio: Optional[float] = None
    eps_ttm: Optional[float] = None
    dividend_yield_pct: Optional[float] = None
    roe_pct: Optional[float] = None
    roce_pct: Optional[float] = None
    debt_to_equity: Optional[float] = None
    operating_margin_pct: Optional[float] = None
    net_margin_pct: Optional[float] = None
    revenue_growth_yoy_pct: Optional[float] = None
    profit_growth_yoy_pct: Optional[float] = None
    free_cash_flow: Optional[float] = None
    promoter_holding_pct: Optional[float] = None
    institutional_holding_pct: Optional[float] = None
    last_updated: Optional[str] = None
    data_source: str = "official_filings"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class StockTechnicals:
    """Calculated Technical Metrics across standard timeframes."""
    instrument_id: str
    symbol: str
    timeframe: str = "1d"
    rsi_14: Optional[float] = None
    macd_line: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_hist: Optional[float] = None
    ema_20: Optional[float] = None
    ema_50: Optional[float] = None
    ema_200: Optional[float] = None
    sma_50: Optional[float] = None
    sma_200: Optional[float] = None
    adx_14: Optional[float] = None
    atr_14: Optional[float] = None
    atr_pct: Optional[float] = None
    vwap: Optional[float] = None
    bollinger_upper: Optional[float] = None
    bollinger_middle: Optional[float] = None
    bollinger_lower: Optional[float] = None
    pivot_level: Optional[float] = None
    support_1: Optional[float] = None
    support_2: Optional[float] = None
    resistance_1: Optional[float] = None
    resistance_2: Optional[float] = None
    is_breakout: bool = False
    is_breakdown: bool = False
    is_near_52w_high: bool = False
    is_near_52w_low: bool = False
    last_calculated: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class StockAnalysisResult:
    """Explainable Quantitative Analysis Result."""
    instrument_id: str
    symbol: str
    timeframe: str = "1d"
    directional_bias: str = "NEUTRAL"     # BULLISH | BEARISH | NEUTRAL
    overall_score: float = 50.0           # 0 - 100
    technical_score: float = 50.0
    fundamental_score: Optional[float] = None
    liquidity_score: float = 50.0
    momentum_score: float = 50.0
    risk_score: float = 50.0
    confidence_score: float = 75.0        # Based on data availability & completeness
    summary_explanation: str = ""         # Human-readable rationale
    indicators_used: List[str] = field(default_factory=list)
    data_points_used: int = 0
    missing_input_warnings: List[str] = field(default_factory=list)
    provider: str = "QuantOS-AnalysisEngine"
    data_timestamp: Optional[str] = None
    calculated_at: Optional[str] = None
    calculation_latency_ms: float = 0.0
    analysis_version: str = "2.0-deterministic"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
