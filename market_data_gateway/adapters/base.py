"""
Market Data Gateway — Abstract Provider Base
=============================================
Universal interface every provider adapter must implement.
"""
from __future__ import annotations

import time
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional, Set

logger = logging.getLogger("MDGateway.Base")


# ─────────────────────────────────────────────────────────────────────────────
# CANONICAL DATA MODELS
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class NormalizedQuote:
    """Single source of truth for a market price tick."""
    symbol: str                    # canonical symbol  e.g. "BTC/USDT", "NIFTY", "AAPL"
    exchange: str                  # e.g. "BINANCE", "NSE", "XNAS"
    provider: str                  # adapter id e.g. "binance_ws", "angelone"
    last_price: float
    bid: float = 0.0
    ask: float = 0.0
    volume: float = 0.0
    high: Optional[float] = None
    low: Optional[float] = None
    open: Optional[float] = None
    close: Optional[float] = None
    change_pct: Optional[float] = None
    vwap: Optional[float] = None
    oi: Optional[float] = None
    funding_rate: Optional[float] = None
    # Provenance
    event_timestamp: str = ""      # ISO-8601 UTC — from the provider
    received_timestamp: str = ""   # ISO-8601 UTC — when we received it
    feed_latency_ms: float = 0.0
    data_mode: str = "REAL_TIME"   # REAL_TIME | DELAYED | EOD | CACHED
    is_stale: bool = False
    sequence: Optional[int] = None

    def __post_init__(self):
        now_iso = datetime.now(timezone.utc).isoformat()
        if not self.received_timestamp:
            self.received_timestamp = now_iso
        if not self.event_timestamp:
            self.event_timestamp = now_iso

    @property
    def age_seconds(self) -> float:
        try:
            ts = datetime.fromisoformat(self.event_timestamp.replace("Z", "+00:00"))
            return max(0.0, (datetime.now(timezone.utc) - ts).total_seconds())
        except Exception:
            return 9999.0

    def mark_stale(self, threshold_sec: float = 10.0) -> "NormalizedQuote":
        self.is_stale = self.age_seconds > threshold_sec
        return self

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["age_seconds"] = round(self.age_seconds, 2)
        return d


@dataclass
class OHLCVCandle:
    """Canonical OHLCV candle."""
    symbol: str
    exchange: str
    provider: str
    timeframe: str
    timestamp: str         # ISO-8601 UTC — open time of the candle
    open: float
    high: float
    low: float
    close: float
    volume: float
    is_closed: bool = True
    vwap: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class CanonicalInstrument:
    """Universal instrument specification."""
    canonical_symbol: str
    display_name: str
    asset_class: str
    exchange: str
    mic_code: str
    region: str
    currency: str
    timezone: str
    lot_size: int = 1
    tick_size: float = 0.01
    contract_multiplier: float = 1.0
    has_options: bool = False
    has_futures: bool = False
    is_active: bool = True
    provider_symbols: Dict[str, str] = field(default_factory=dict)
    expiry: Optional[str] = None
    strike: Optional[float] = None
    option_type: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ProviderHealth:
    """Live health status of a provider adapter."""
    provider_id: str
    provider_name: str
    status: str
    asset_classes: List[str] = field(default_factory=list)
    subscribed_symbols: int = 0
    latency_ms: float = 0.0
    error_count: int = 0
    last_tick_time: Optional[str] = None
    message: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ─────────────────────────────────────────────────────────────────────────────
# ABSTRACT BASE CLASS
# ─────────────────────────────────────────────────────────────────────────────

class BaseProviderAdapter(ABC):
    """
    Universal interface all provider adapters must implement.

    Lifecycle:
        start  ->  connect()  ->  subscribe()  ->  [ticks arrive]  ->  unsubscribe()  ->  disconnect()
    """

    def __init__(self, provider_id: str, provider_name: str):
        self.provider_id = provider_id
        self.provider_name = provider_name
        self._status = "DISCONNECTED"
        self._error_count = 0
        self._last_tick_time: Optional[float] = None
        self._subscribed_symbols: Set[str] = set()
        self._logger = logging.getLogger(f"MDGateway.{provider_id}")
        self._on_quote_callback: Optional[Callable[[NormalizedQuote], None]] = None

    def set_quote_callback(self, callback: Callable[[NormalizedQuote], None]) -> None:
        self._on_quote_callback = callback

    def _emit(self, quote: NormalizedQuote) -> None:
        self._last_tick_time = time.monotonic()
        quote.mark_stale()
        if self._on_quote_callback is not None:
            try:
                self._on_quote_callback(quote)
            except Exception as exc:
                self._logger.error("Quote callback error: %s", exc)

    # ── Abstract methods ──────────────────────────────────────────────────────

    @abstractmethod
    async def connect(self) -> None: ...

    @abstractmethod
    async def disconnect(self) -> None: ...

    @abstractmethod
    async def subscribe(self, symbols: List[str]) -> None: ...

    @abstractmethod
    async def unsubscribe(self, symbols: List[str]) -> None: ...

    @abstractmethod
    async def get_snapshot(self, symbols: List[str]) -> Dict[str, NormalizedQuote]: ...

    @abstractmethod
    async def get_history(
        self,
        symbol: str,
        timeframe: str,
        from_dt: datetime,
        to_dt: datetime,
    ) -> List[OHLCVCandle]: ...

    @abstractmethod
    async def get_instruments(self) -> List[CanonicalInstrument]: ...

    @abstractmethod
    async def health_check(self) -> ProviderHealth: ...

    # ── Concrete helpers ──────────────────────────────────────────────────────

    def get_status(self) -> str:
        return self._status

    def get_subscribed_symbols(self) -> Set[str]:
        return set(self._subscribed_symbols)

    def _record_success(self) -> None:
        self._error_count = 0
        self._status = "LIVE"

    def _record_error(self, msg: str = "") -> None:
        self._error_count += 1
        self._logger.warning("Provider error #%d: %s", self._error_count, msg)
        self._status = "DISCONNECTED" if self._error_count >= 5 else "STALE"
