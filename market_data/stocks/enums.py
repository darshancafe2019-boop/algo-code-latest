"""
Stock Market Enums & Constant Taxonomy
======================================
Authoritative enums for pure equity instruments (no derivative leaks).
"""

from enum import Enum


class StockRegion(str, Enum):
    INDIA = "INDIA"
    US = "US"
    GLOBAL = "GLOBAL"


class StockExchange(str, Enum):
    NSE = "NSE"
    BSE = "BSE"
    NYSE = "NYSE"
    NASDAQ = "NASDAQ"
    AMEX = "AMEX"
    LSE = "LSE"
    TSX = "TSX"


class StockInstrumentType(str, Enum):
    EQUITY = "EQUITY"
    ETF = "ETF"
    ADR = "ADR"
    REIT = "REIT"
    PREFERENCE_SHARE = "PREFERENCE_SHARE"


class MarketCapCategory(str, Enum):
    MEGA_CAP = "MEGA_CAP"       # > $200B / > ₹5L Cr
    LARGE_CAP = "LARGE_CAP"     # $10B - $200B / ₹50K - ₹5L Cr
    MID_CAP = "MID_CAP"         # $2B - $10B / ₹10K - ₹50K Cr
    SMALL_CAP = "SMALL_CAP"     # $300M - $2B / ₹1K - ₹10K Cr
    MICRO_CAP = "MICRO_CAP"     # < $300M / < ₹1K Cr
    UNKNOWN = "UNKNOWN"


class MarketSessionStatus(str, Enum):
    PRE_MARKET = "PRE_MARKET"
    REGULAR = "REGULAR"
    POST_MARKET = "POST_MARKET"
    CLOSED = "CLOSED"
    HALTED = "HALTED"
    HOLIDAY = "HOLIDAY"


class TradingStatus(str, Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    DELISTED = "DELISTED"
    RESTRICTED = "RESTRICTED"


class TrendDirection(str, Enum):
    STRONG_BULLISH = "STRONG_BULLISH"
    BULLISH = "BULLISH"
    NEUTRAL = "NEUTRAL"
    BEARISH = "BEARISH"
    STRONG_BEARISH = "STRONG_BEARISH"


class DataQualityStatus(str, Enum):
    LIVE = "LIVE"
    DELAYED = "DELAYED"
    STALE = "STALE"
    PARTIAL = "PARTIAL"
    MARKET_CLOSED = "MARKET_CLOSED"
    PROVIDER_DOWN = "PROVIDER_DOWN"
    INVALID = "INVALID"


class Timeframe(str, Enum):
    M1 = "1m"
    M5 = "5m"
    M15 = "15m"
    H1 = "1h"
    H4 = "4h"
    D1 = "1d"
    W1 = "1w"
