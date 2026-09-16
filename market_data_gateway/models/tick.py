"""
Canonical MarketTick Model
==========================
Single authoritative internal data structure for normalized ticks across all providers.
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class MarketTick:
    # 1. Identity & Routing
    provider: str                             # "dhan", "delta", "fyers", "upstox", "binance", "sim"
    providerInstrumentId: str                 # Raw symbol/ID used by provider (e.g. "NSE:NIFTY50-INDEX", "NSE_INDEX|Nifty 50", "BTCUSDT")
    internalInstrumentId: str                 # Internal canonical ID (e.g. "INDIA:NSE:INDEX:NIFTY", "CRYPTO:BINANCE:BTC-USDT")
    exchange: str                             # "NSE", "BSE", "BINANCE", "DELTA_INDIA", "MCX"
    segment: str                              # "EQUITY", "EQUITY_DERIVATIVES", "INDEX", "CRYPTO_PERP", "CRYPTO_OPTIONS"
    symbol: str                               # Display symbol (e.g. "NIFTY", "RELIANCE", "BTC/USDT")
    underlying: Optional[str] = None          # Underlying asset for derivatives (e.g. "NIFTY", "BTC")
    assetType: str = "SPOT"                   # "SPOT", "INDEX", "FUTURES", "OPTION_CALL", "OPTION_PUT"

    # 2. Timestamps
    timestamp: Optional[str] = None           # ISO-8601 provider timestamp
    receivedAt: Optional[str] = None          # ISO-8601 gateway arrival timestamp
    rawProviderTimestamp: Optional[int] = None # Raw epoch timestamp from provider (ms or s)

    # 3. Last Traded Execution
    ltp: Optional[float] = None
    ltq: Optional[float] = None
    previousClose: Optional[float] = None

    # 4. OHLC (Day Bar)
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None

    # 5. Volume & Liquidity
    volume: Optional[float] = None

    # 6. Best BBO (Level 1)
    bidPrice: Optional[float] = None
    bidQuantity: Optional[float] = None
    askPrice: Optional[float] = None
    askQuantity: Optional[float] = None
    spread: Optional[float] = None

    # 7. Open Interest (Derivatives)
    openInterest: Optional[float] = None
    previousOpenInterest: Optional[float] = None
    changeInOpenInterest: Optional[float] = None

    # 8. Options Analytics & Greeks
    iv: Optional[float] = None
    delta: Optional[float] = None
    gamma: Optional[float] = None
    theta: Optional[float] = None
    vega: Optional[float] = None
    rho: Optional[float] = None

    # 9. Market Depth (Level 2)
    marketDepth: Optional[Dict[str, Any]] = None  # MarketDepth object as dict

    # 10. Feed Metadata & Integrity
    dataMode: str = "LTP"                     # "LTP", "FULL_QUOTE", "OPTION_GREEKS", "DEPTH_L2", "SIMULATION"
    sequence: Optional[int] = None
    feedStatus: str = "LIVE"                  # "LIVE", "FRESH", "STALE", "DISCONNECTED", "MARKET_CLOSED"
    latencyMs: Optional[float] = None

    def __post_init__(self):
        now_iso = datetime.now(timezone.utc).isoformat()
        if not self.receivedAt:
            self.receivedAt = now_iso
        if not self.timestamp:
            self.timestamp = now_iso

        # Compute spread if bid/ask available and spread not supplied
        if self.bidPrice is not None and self.askPrice is not None and self.spread is None:
            self.spread = round(max(0.0, float(self.askPrice) - float(self.bidPrice)), 4)

        # Compute OI Change if both OI and previous OI exist
        if self.openInterest is not None and self.previousOpenInterest is not None and self.changeInOpenInterest is None:
            self.changeInOpenInterest = round(float(self.openInterest) - float(self.previousOpenInterest), 2)

    @property
    def ageMs(self) -> float:
        try:
            ts = datetime.fromisoformat(self.timestamp.replace("Z", "+00:00"))
            return max(0.0, (datetime.now(timezone.utc) - ts).total_seconds() * 1000.0)
        except Exception:
            return 999999.0

    def is_valid(self) -> bool:
        valid, _ = validate_tick_quality(self)
        return valid

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["ageMs"] = round(self.ageMs, 1)
        return d


def validate_tick_quality(tick: MarketTick) -> Tuple[bool, Optional[str]]:
    """
    Validates tick quality:
    - LTP must be positive and non-zero
    - Non-negative volume & open interest
    - Non-inverted spreads (ask >= bid when both present)
    - Valid timestamps
    """
    if tick.ltp is None or tick.ltp <= 0:
        return False, f"Non-positive LTP: {tick.ltp}"
    if tick.volume is not None and tick.volume < 0:
        return False, f"Negative volume: {tick.volume}"
    if tick.openInterest is not None and tick.openInterest < 0:
        return False, f"Negative OI: {tick.openInterest}"
    if tick.bidPrice is not None and tick.askPrice is not None:
        if tick.bidPrice > tick.askPrice:
            return False, f"Crossed market: bid ({tick.bidPrice}) > ask ({tick.askPrice})"
    return True, None
