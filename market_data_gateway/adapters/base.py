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
    """Single source of truth for a market price tick across all asset domains."""
    symbol: str                    # canonical symbol  e.g. "BTC/USDT", "NIFTY", "RELIANCE", "NIFTY24DEC25000CE"
    exchange: str                  # e.g. "BINANCE", "NSE", "BSE", "DELTA", "XNAS"
    provider: str                  # adapter id e.g. "dhan", "upstox", "delta_options_ws", "binance_ws"
    last_price: float
    
    # Core Quote Fields
    bid: Optional[float] = None
    ask: Optional[float] = None
    spread: Optional[float] = None
    volume: Optional[float] = None
    turnover: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    open: Optional[float] = None
    close: Optional[float] = None
    change: Optional[float] = None
    change_pct: Optional[float] = None
    vwap: Optional[float] = None
    high_52w: Optional[float] = None
    low_52w: Optional[float] = None
    
    # Order Flow & Quantities
    last_quantity: Optional[float] = None
    bid_quantity: Optional[float] = None
    ask_quantity: Optional[float] = None
    buy_quantity: Optional[float] = None
    sell_quantity: Optional[float] = None
    event_type: str = "TICK"  # TICK | TRADE | DEPTH | GREEKS | STATUS
    
    # Asset Classification & Metadata
    segment: Optional[str] = None  # e.g. "INDEX", "EQUITY", "FUTURES", "OPTIONS", "CRYPTO"
    instrument_key: Optional[str] = None
    market: str = "STOCKS"         # STOCKS | STOCK_FUTURES | STOCK_OPTIONS | CRYPTO | CRYPTO_FUTURES | CRYPTO_OPTIONS | INDICES | INDEX_FUTURES | INDEX_OPTIONS
    instrument_type: str = "SPOT"  # SPOT | FUTURES | OPTIONS_CALL | OPTIONS_PUT | INDEX
    company_name: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    base_asset: Optional[str] = None
    quote_asset: Optional[str] = None
    
    # Derivatives / Futures Specific
    underlying: Optional[str] = None
    expiry: Optional[str] = None
    expiry_days: Optional[int] = None
    spot_price: Optional[float] = None
    future_price: Optional[float] = None
    mark_price: Optional[float] = None
    index_price: Optional[float] = None
    basis: Optional[float] = None
    basis_pct: Optional[float] = None
    oi: Optional[float] = None
    open_interest: Optional[float] = None
    oi_change: Optional[float] = None
    funding_rate: Optional[float] = None
    next_funding_time: Optional[str] = None
    lot_size: Optional[int] = None
    margin: Optional[float] = None
    available_leverage: Optional[float] = None
    
    # Options Specific
    strike: Optional[float] = None
    option_type: Optional[str] = None       # CALL | PUT | CE | PE
    moneyness: Optional[str] = None         # ITM | ATM | OTM
    intrinsic_value: Optional[float] = None
    time_value: Optional[float] = None
    iv: Optional[float] = None
    greeks: Optional[Dict[str, Any]] = None  # {delta, gamma, theta, vega, rho}
    
    # Provenance & Data Quality
    event_timestamp: str = ""              # ISO-8601 UTC from provider (exchangeTimestamp)
    received_timestamp: str = ""           # ISO-8601 UTC when received at gateway (receivedTimestamp)
    feed_latency_ms: float = 0.0
    data_mode: str = "REAL_TIME"           # REAL_TIME | DELAYED | EOD | CACHED
    status: str = "LIVE"                   # LIVE | PRE_OPEN | OPEN | CLOSED | AFTER_HOURS | HALTED | STALE | DISCONNECTED | UNAVAILABLE
    is_stale: bool = False
    sequence: Optional[int] = None
    calculation_source: str = "BROKER_PROVIDED"  # BROKER_PROVIDED | EXCHANGE_PROVIDED | CALCULATED | DERIVED | ESTIMATED
    depth: Optional[Dict[str, Any]] = None

    def __post_init__(self):
        now_iso = datetime.now(timezone.utc).isoformat()
        if not self.received_timestamp:
            self.received_timestamp = now_iso
        if not self.event_timestamp:
            self.event_timestamp = now_iso
        
        # Calculate feed latency if timestamps present
        try:
            evt_dt = datetime.fromisoformat(self.event_timestamp.replace("Z", "+00:00"))
            rcv_dt = datetime.fromisoformat(self.received_timestamp.replace("Z", "+00:00"))
            lat = (rcv_dt.timestamp() - evt_dt.timestamp()) * 1000.0
            if lat >= 0 and self.feed_latency_ms <= 0:
                self.feed_latency_ms = round(lat, 2)
        except Exception:
            pass

        if self.oi is None and self.open_interest is not None:
            self.oi = self.open_interest
        elif self.open_interest is None and self.oi is not None:
            self.open_interest = self.oi
        
        # Auto-compute spread if bid and ask exist
        if self.bid is not None and self.ask is not None and self.spread is None:
            self.spread = round(max(0.0, float(self.ask) - float(self.bid)), 6)
            
        # Auto-compute basis if spot and future price exist
        if self.spot_price and (self.future_price or self.last_price) and self.basis is None:
            fp = self.future_price if self.future_price is not None else self.last_price
            self.basis = round(fp - self.spot_price, 6)
            if self.spot_price > 0:
                self.basis_pct = round((self.basis / self.spot_price) * 100.0, 4)

    @property
    def age_seconds(self) -> float:
        try:
            ts = datetime.fromisoformat(self.event_timestamp.replace("Z", "+00:00"))
            return max(0.0, (datetime.now(timezone.utc) - ts).total_seconds())
        except Exception:
            return 9999.0

    @property
    def age_ms(self) -> int:
        return int(self.age_seconds * 1000)

    def mark_stale(
        self,
        live_threshold_sec: float = 5.0,
        delayed_threshold_sec: float = 15.0,
        threshold_sec: Optional[float] = None,
    ) -> "NormalizedQuote":
        if threshold_sec is not None:
            live_threshold_sec = threshold_sec
        age = self.age_seconds
        self.is_stale = age > live_threshold_sec
        if self.last_price is None or self.last_price <= 0:
            self.status = "UNAVAILABLE"
        elif age <= live_threshold_sec:
            if self.status != "MARKET_CLOSED":
                self.status = "LIVE"
        elif age <= delayed_threshold_sec:
            if self.status != "MARKET_CLOSED":
                self.status = "DELAYED"
        else:
            if self.status != "MARKET_CLOSED":
                self.status = "STALE"
        return self

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        age_sec = round(self.age_seconds, 2)
        age_ms = self.age_ms
        d["age_seconds"] = age_sec
        d["ageMs"] = age_ms

        # Canonical provider normalization
        prov_raw = (d.get("provider") or "").lower()
        if "dhan" in prov_raw:
            d["raw_provider"] = d.get("provider")
            d["provider"] = "dhan"
        elif "upstox" in prov_raw:
            d["raw_provider"] = d.get("provider")
            d["provider"] = "upstox"
        elif "delta" in prov_raw:
            d["raw_provider"] = d.get("provider")
            d["provider"] = "delta"
        elif "binance" in prov_raw:
            d["raw_provider"] = d.get("provider")
            d["provider"] = "binance"

        # Epoch timestamps
        try:
            event_dt = datetime.fromisoformat(self.event_timestamp.replace("Z", "+00:00"))
            d["sourceTimestamp"] = int(event_dt.timestamp() * 1000)
        except Exception:
            d["sourceTimestamp"] = int(time.time() * 1000)

        try:
            recv_dt = datetime.fromisoformat(self.received_timestamp.replace("Z", "+00:00"))
            d["receivedAt"] = int(recv_dt.timestamp() * 1000)
        except Exception:
            d["receivedAt"] = int(time.time() * 1000)

        # Dynamic Freshness Rules (0-5s = LIVE, 5-15s = DELAYED, >15s = STALE)
        if self.last_price is None or self.last_price <= 0:
            status_val = "UNAVAILABLE"
        elif age_sec <= 5.0:
            status_val = "MARKET_CLOSED" if self.status == "MARKET_CLOSED" else "LIVE"
        elif age_sec <= 15.0:
            status_val = "MARKET_CLOSED" if self.status == "MARKET_CLOSED" else "DELAYED"
        else:
            status_val = "MARKET_CLOSED" if self.status == "MARKET_CLOSED" else "STALE"
        d["status"] = status_val
        d["freshnessStatus"] = status_val

        # Normalized schema attributes
        d["ltp"] = self.last_price
        d["price"] = self.last_price
        d["lastPrice"] = self.last_price
        d["instrument_key"] = d.get("instrument_key") or self.instrument_key or self.symbol
        d["instrumentKey"] = d["instrument_key"]
        d["segment"] = d.get("exchange_segment") or d.get("market") or "INDEX"
        d["eventType"] = self.event_type
        d["exchangeTimestamp"] = d["sourceTimestamp"]
        d["receivedTimestamp"] = d["receivedAt"]
        d["isStale"] = d["is_stale"] = (status_val == "STALE")
        d["lastQuantity"] = self.last_quantity
        d["bidQuantity"] = self.bid_quantity
        d["askQuantity"] = self.ask_quantity
        d["buyQuantity"] = self.buy_quantity
        d["sellQuantity"] = self.sell_quantity
        d["previous_close"] = self.close if self.close and self.close > 0 else None
        d["previousClose"] = d["previous_close"]
        d["change"] = self.change if self.change is not None else (round(self.last_price - self.close, 2) if self.close and self.close > 0 and self.last_price else None)
        d["change_pct"] = self.change_pct if self.change_pct is not None else (round(((self.last_price - self.close) / self.close) * 100.0, 2) if self.close and self.close > 0 and self.last_price else None)
        d["change_percent"] = d["change_pct"]
        d["changePct"] = d["change_pct"]
        d["openInterest"] = d.get("oi")
        d["age_ms"] = age_ms
        d["event_timestamp"] = d["sourceTimestamp"]
        d["received_at"] = d["receivedAt"]
        d["source"] = getattr(self, "source", None) or f"{d.get('provider', 'gateway')}_websocket"
        d["connection_id"] = getattr(self, "connection_id", "gateway_conn_1")
        d["sequence"] = self.sequence

        # Compatibility fields for table rendering
        if d.get("bid") is not None and "bid_price" not in d:
            d["bid_price"] = d["bid"]
        if d.get("ask") is not None and "ask_price" not in d:
            d["ask_price"] = d["ask"]
        if d.get("bid_quantity") is not None and "bidQty" not in d:
            d["bidQty"] = d["bid_quantity"]
        if d.get("ask_quantity") is not None and "askQty" not in d:
            d["askQty"] = d["ask_quantity"]
        if d.get("oi") is not None and "open_interest" not in d:
            d["open_interest"] = d["oi"]
        if d.get("feed_latency_ms") is not None and "freshness_ms" not in d:
            d["freshness_ms"] = d["feed_latency_ms"]

        if d.get("provider") == "dhan":
            try:
                from src.dhan_service import global_dhan_service
                meta = global_dhan_service.resolve_symbol(self.symbol)
                if meta:
                    d.setdefault("security_id", str(meta.get("security_id", "")))
                    d.setdefault("exchange_segment", meta.get("exchange_segment", self.exchange or "NSE_EQ"))
            except Exception:
                pass
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
    sector: Optional[str] = None
    industry: Optional[str] = None
    underlying: Optional[str] = None

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
    auth_status: str = "HEALTHY"
    rest_status: str = "HEALTHY"
    stream_status: str = "CONNECTED"
    capabilities: Dict[str, bool] = field(default_factory=dict)

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
        self._quote_callbacks: List[Callable[[NormalizedQuote], None]] = []

    def set_quote_callback(self, callback: Callable[[NormalizedQuote], None]) -> None:
        self._on_quote_callback = callback
        if callback not in self._quote_callbacks:
            self._quote_callbacks.append(callback)

    def add_quote_callback(self, callback: Callable[[NormalizedQuote], None]) -> None:
        if callback not in self._quote_callbacks:
            self._quote_callbacks.append(callback)

    def remove_quote_callback(self, callback: Callable[[NormalizedQuote], None]) -> None:
        if callback in self._quote_callbacks:
            self._quote_callbacks.remove(callback)
        if self._on_quote_callback == callback:
            self._on_quote_callback = None

    def _emit(self, quote: NormalizedQuote) -> None:
        self._last_tick_time = time.monotonic()
        quote.mark_stale()
        if self._on_quote_callback is not None:
            try:
                self._on_quote_callback(quote)
            except Exception as exc:
                self._logger.error("Quote callback error: %s", exc)
        for cb in list(self._quote_callbacks):
            if cb is not self._on_quote_callback:
                try:
                    cb(quote)
                except Exception as exc:
                    self._logger.error("Additional quote callback error: %s", exc)

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
