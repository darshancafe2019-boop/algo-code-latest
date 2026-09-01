"""
Multi-Provider Routing & Circuit Breaker Manager.
Handles:
- Distinct routing: Binance Spot, Binance Futures (Perpetuals), Deribit Options, Paper Broker.
- Provider Capability Verification before executing requests.
- Circuit Breaker pattern (CLOSED -> OPEN -> HALF_OPEN).
- Bounded Exponential Backoff with Jitter for transient network errors.
- Explicit Rate Limit (429 / 418) handling.
- Real-time provider telemetry & health tracking.
"""

import enum
import logging
import random
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional, Tuple

import ccxt
import pandas as pd
from src import config
from src.instrument_resolver import (
    AssetClass,
    CanonicalInstrument,
    InstrumentResolver,
    InstrumentType,
    ResolutionStatus,
    global_instrument_resolver,
)

logger = logging.getLogger("ProviderManager")


class CircuitState(str, enum.Enum):
    CLOSED = "CLOSED"  # Normal operations
    OPEN = "OPEN"  # Tripped: requests blocked
    HALF_OPEN = "HALF_OPEN"  # Testing recovery


class ProviderStatus(str, enum.Enum):
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    RATE_LIMITED = "RATE_LIMITED"
    CIRCUIT_OPEN = "CIRCUIT_OPEN"
    OFFLINE = "OFFLINE"
    UNKNOWN = "UNKNOWN"
    DISABLED = "DISABLED"
    NOT_CONFIGURED = "NOT_CONFIGURED"


@dataclass
class CircuitBreaker:
    failure_threshold: int = 5
    recovery_timeout_seconds: float = 30.0
    failure_count: int = 0
    state: CircuitState = CircuitState.CLOSED
    last_failure_time: float = 0.0
    last_state_change: float = field(default_factory=time.time)

    def record_success(self) -> None:
        if self.state == CircuitState.HALF_OPEN:
            logger.info("Circuit breaker probe succeeded. Transitioning from HALF_OPEN to CLOSED.")
            self.state = CircuitState.CLOSED
            self.failure_count = 0
            self.last_state_change = time.time()
        elif self.state == CircuitState.CLOSED:
            self.failure_count = 0

    def record_failure(self) -> bool:
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            if self.state != CircuitState.OPEN:
                logger.warning(
                    "Circuit breaker TRIPPED! (%d consecutive failures). Transitioning to OPEN.",
                    self.failure_count,
                )
                self.state = CircuitState.OPEN
                self.last_state_change = time.time()
            return True
        return False

    def can_attempt(self) -> bool:
        if self.state == CircuitState.CLOSED:
            return True
        now = time.time()
        if self.state == CircuitState.OPEN:
            if (now - self.last_failure_time) >= self.recovery_timeout_seconds:
                logger.info("Recovery timeout elapsed (%ss). Transitioning circuit to HALF_OPEN probe.", self.recovery_timeout_seconds)
                self.state = CircuitState.HALF_OPEN
                self.last_state_change = now
                return True
            return False
        # HALF_OPEN allows single probe
        return True


class ProviderAdapter:
    """Base interface for concrete exchange & broker provider adapters."""

    def __init__(self, provider_id: str, name: str):
        self.provider_id = provider_id
        self.name = name
        self.circuit = CircuitBreaker()
        self.rate_limited_until: float = 0.0
        self.request_count: int = 0
        self.error_count: int = 0
        self.latencies: List[float] = []
        self.last_success_time: Optional[str] = None
        self._market_cache: Dict[str, Any] = {}
        self._market_cache_expiry: float = 0.0

    @property
    def status(self) -> ProviderStatus:
        now = time.time()
        if self.circuit.state == CircuitState.OPEN:
            return ProviderStatus.CIRCUIT_OPEN
        if self.request_count == 0 and self.last_success_time is None:
            return ProviderStatus.UNKNOWN
        if now < self.rate_limited_until:
            return ProviderStatus.RATE_LIMITED
        if self.error_count > 0 and self.request_count > 0:
            err_rate = (self.error_count / self.request_count) * 100.0
            if err_rate > 20.0:
                return ProviderStatus.DEGRADED
        return ProviderStatus.HEALTHY

    def get_telemetry(self) -> Dict[str, Any]:
        p95_latency = 0.0
        if self.latencies:
            sorted_lat = sorted(self.latencies)
            idx = int(len(sorted_lat) * 0.95)
            p95_latency = round(sorted_lat[min(idx, len(sorted_lat) - 1)], 1)

        return {
            "provider_id": self.provider_id,
            "name": self.name,
            "status": self.status.value,
            "circuit_state": self.circuit.state.value,
            "request_count": self.request_count,
            "error_count": self.error_count,
            "p95_latency_ms": p95_latency,
            "last_success": self.last_success_time or "None",
            "is_rate_limited": time.time() < self.rate_limited_until,
        }

    def fetch_ohlcv(self, instrument: CanonicalInstrument, timeframe: str, limit: int = 500) -> pd.DataFrame:
        raise NotImplementedError

    def supports_instrument(self, instrument: CanonicalInstrument) -> bool:
        raise NotImplementedError


class BinanceSpotAdapter(ProviderAdapter):
    """Binance Spot API adapter with cached exchangeInfo and bounded retry."""

    def __init__(self):
        super().__init__("binance_spot", "Binance Spot API")
        self.exchange = ccxt.binance({
            "enableRateLimit": True,
            "timeout": 10000,
            "options": {"defaultType": "spot"},
        })

    def supports_instrument(self, instrument: CanonicalInstrument) -> bool:
        return (
            instrument.asset_class == AssetClass.CRYPTO
            and instrument.instrument_type == InstrumentType.SPOT
            and instrument.exchange == "BINANCE"
        )

    def fetch_ohlcv(self, instrument: CanonicalInstrument, timeframe: str, limit: int = 500) -> pd.DataFrame:
        if not self.supports_instrument(instrument):
            raise ValueError(
                f"Binance Spot adapter does not support instrument type {instrument.instrument_type.value} for {instrument.canonical_symbol}"
            )

        if not self.circuit.can_attempt():
            raise ccxt.NetworkError(f"Circuit breaker is OPEN for {self.name}. Requests temporarily paused.")

        t0 = time.time()
        self.request_count += 1

        try:
            raw_candles = self.exchange.fetch_ohlcv(
                symbol=instrument.canonical_symbol,
                timeframe=timeframe,
                limit=limit,
            )
            elapsed_ms = (time.time() - t0) * 1000.0
            self.latencies.append(elapsed_ms)
            if len(self.latencies) > 100:
                self.latencies.pop(0)

            self.circuit.record_success()
            self.last_success_time = datetime.now(timezone.utc).strftime("%H:%M:%S")

            df = pd.DataFrame(raw_candles, columns=["timestamp", "open", "high", "low", "close", "volume"])
            df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms", utc=True)
            df.sort_values(by="timestamp", inplace=True)
            df.reset_index(drop=True, inplace=True)
            return df

        except ccxt.RateLimitExceeded as rle:
            self.error_count += 1
            self.rate_limited_until = time.time() + 30.0
            logger.error("Binance Spot Rate Limit (429): %s. Throttling for 30s.", rle)
            raise rle
        except (ccxt.NetworkError, ccxt.RequestTimeout) as net_err:
            self.error_count += 1
            self.circuit.record_failure()
            logger.error("Binance Spot Network Error: %s", net_err)
            raise net_err
        except Exception as e:
            self.error_count += 1
            logger.error("Binance Spot Error for %s: %s", instrument.canonical_symbol, e)
            raise e


class BinanceFuturesAdapter(ProviderAdapter):
    """Binance USDT-M Futures adapter for Perpetuals."""

    def __init__(self):
        super().__init__("binance_futures", "Binance Futures (USDT-M)")
        self.exchange = ccxt.binance({
            "enableRateLimit": True,
            "timeout": 10000,
            "options": {"defaultType": "future"},
        })

    def supports_instrument(self, instrument: CanonicalInstrument) -> bool:
        return (
            instrument.asset_class == AssetClass.CRYPTO
            and instrument.instrument_type in [InstrumentType.PERPETUAL, InstrumentType.DATED_FUTURE]
            and instrument.exchange == "BINANCE"
        )

    def fetch_ohlcv(self, instrument: CanonicalInstrument, timeframe: str, limit: int = 500) -> pd.DataFrame:
        if not self.supports_instrument(instrument):
            raise ValueError(f"Binance Futures adapter does not support {instrument.canonical_symbol}")

        if not self.circuit.can_attempt():
            raise ccxt.NetworkError(f"Circuit breaker is OPEN for {self.name}.")

        t0 = time.time()
        self.request_count += 1

        try:
            # Map canonical symbol e.g. BTC/USDT:USDT
            raw_candles = self.exchange.fetch_ohlcv(
                symbol=instrument.canonical_symbol,
                timeframe=timeframe,
                limit=limit,
            )
            elapsed_ms = (time.time() - t0) * 1000.0
            self.latencies.append(elapsed_ms)
            if len(self.latencies) > 100:
                self.latencies.pop(0)

            self.circuit.record_success()
            self.last_success_time = datetime.now(timezone.utc).strftime("%H:%M:%S")

            df = pd.DataFrame(raw_candles, columns=["timestamp", "open", "high", "low", "close", "volume"])
            df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms", utc=True)
            df.sort_values(by="timestamp", inplace=True)
            df.reset_index(drop=True, inplace=True)
            return df
        except Exception as e:
            self.error_count += 1
            self.circuit.record_failure()
            logger.error("Binance Futures Error: %s", e)
            raise e


class OptionsPlaceholderAdapter(ProviderAdapter):
    """Options adapter that cleanly signals support availability without crashing spot API."""

    def __init__(self):
        super().__init__("options_gateway", "Options Gateway (Deribit/Binance Options)")

    def supports_instrument(self, instrument: CanonicalInstrument) -> bool:
        return instrument.instrument_type == InstrumentType.OPTION

    def fetch_ohlcv(self, instrument: CanonicalInstrument, timeframe: str, limit: int = 500) -> pd.DataFrame:
        # In current configuration, dedicated options broker is not connected
        raise ccxt.NotSupported(
            f"OPTIONS EXECUTION UNSUPPORTED: Dedicated Options Broker (Deribit API) is not connected for {instrument.canonical_symbol}. "
            f"Trading options requires configuring options gateway credentials."
        )


class UpstoxMarketAdapter(ProviderAdapter):
    """Authoritative Upstox API V3 adapter for Indian Equities, Indices, and F&O."""

    def __init__(self):
        super().__init__("upstox", "Upstox V3 Market Data Engine")

    def supports_instrument(self, instrument: CanonicalInstrument) -> bool:
        return (
            instrument.asset_class in [AssetClass.INDIAN_STOCKS, AssetClass.EQUITY]
            or instrument.exchange == "NSE"
            or instrument.provider in ["upstox", "upstox_ws", "zerodha"]
        )

    def fetch_ohlcv(self, instrument: CanonicalInstrument, timeframe: str, limit: int = 500) -> pd.DataFrame:
        from src.upstox_service import global_upstox_service
        t0 = time.time()
        self.request_count += 1
        try:
            df = global_upstox_service.fetch_historical_candles(instrument.canonical_symbol, timeframe=timeframe, limit=limit)
            elapsed_ms = (time.time() - t0) * 1000.0
            self.latencies.append(elapsed_ms)
            if len(self.latencies) > 100:
                self.latencies.pop(0)

            self.circuit.record_success()
            self.last_success_time = datetime.now(timezone.utc).strftime("%H:%M:%S")
            return df
        except Exception as e:
            self.error_count += 1
            self.circuit.record_failure()
            logger.error("Upstox Market Data fetch error for %s: %s", instrument.canonical_symbol, e)
            raise e


class AlphaVantageAdapter(ProviderAdapter):
    """Alpha Vantage Provider Adapter for global stocks, indicators, and cross-asset data."""

    def __init__(self):
        super().__init__("alpha_vantage", "Alpha Vantage Market Data Engine")

    def supports_instrument(self, instrument: CanonicalInstrument) -> bool:
        return instrument.provider in ["alpha_vantage", "alphavantage"] or instrument.exchange == "ALPHA_VANTAGE"

    def fetch_ohlcv(self, instrument: CanonicalInstrument, timeframe: str, limit: int = 500) -> pd.DataFrame:
        from src.market_data.alphavantage_service import global_alphavantage_service
        t0 = time.time()
        self.request_count += 1
        try:
            df = global_alphavantage_service.fetch_ohlcv(instrument.canonical_symbol, timeframe=timeframe, limit=limit)
            elapsed_ms = (time.time() - t0) * 1000.0
            self.latencies.append(elapsed_ms)
            if len(self.latencies) > 100:
                self.latencies.pop(0)

            self.circuit.record_success()
            self.last_success_time = datetime.now(timezone.utc).strftime("%H:%M:%S")
            return df
        except Exception as e:
            self.error_count += 1
            self.circuit.record_failure()
            logger.error("Alpha Vantage Market Data fetch error for %s: %s", instrument.canonical_symbol, e)
            raise e


class ProviderManager:
    """
    Central Provider Router that enforces capability validation, circuit breakers,
    and isolates failures across venues.
    """

    def __init__(self):
        self.spot_adapter = BinanceSpotAdapter()
        self.futures_adapter = BinanceFuturesAdapter()
        self.options_adapter = OptionsPlaceholderAdapter()
        self.upstox_adapter = UpstoxMarketAdapter()
        self.alphavantage_adapter = AlphaVantageAdapter()
        self._adapters: Dict[str, ProviderAdapter] = {
            "binance_spot": self.spot_adapter,
            "binance_futures": self.futures_adapter,
            "deribit_options": self.options_adapter,
            "options_gateway": self.options_adapter,
            "upstox": self.upstox_adapter,
            "upstox_ws": self.upstox_adapter,
            "zerodha": self.upstox_adapter,
            "alpha_vantage": self.alphavantage_adapter,
            "alphavantage": self.alphavantage_adapter,
        }

    def route_instrument(self, instrument: CanonicalInstrument) -> ProviderAdapter:
        """Determines the authoritative adapter based on asset class and instrument type."""
        if (
            instrument.asset_class in [AssetClass.INDIAN_STOCKS, AssetClass.EQUITY]
            or instrument.exchange == "NSE"
            or instrument.provider in ["upstox", "upstox_ws", "zerodha"]
        ):
            return self.upstox_adapter
        if instrument.instrument_type == InstrumentType.OPTION:
            return self.options_adapter
        if instrument.instrument_type == InstrumentType.PERPETUAL:
            return self.futures_adapter
        if instrument.instrument_type == InstrumentType.SPOT:
            return self.spot_adapter

        # Fallback to configured provider ID or spot
        return self._adapters.get(instrument.provider, self.spot_adapter)

    def fetch_ohlcv_safe(
        self,
        symbol_or_query: str,
        timeframe: str,
        limit: int = 500,
        max_retries: int = 3,
    ) -> Tuple[pd.DataFrame, CanonicalInstrument]:
        """
        End-to-end safe fetch chain:
        Query -> Canonical Resolution -> Provider Routing -> Circuit Breaker -> Bounded Retry.
        """
        res = global_instrument_resolver.resolve(symbol_or_query)
        if not res.is_valid or not res.instrument:
            raise ValueError(
                f"INSTRUMENT_RESOLUTION_FAILED: {res.reason} (Code: {res.error_code}). Suggested Action: {res.suggested_action}"
            )

        instrument = res.instrument
        adapter = self.route_instrument(instrument)

        # Check adapter capabilities
        if not adapter.supports_instrument(instrument) and instrument.instrument_type != InstrumentType.OPTION:
            raise ccxt.NotSupported(
                f"PROVIDER_CAPABILITY_MISMATCH: Adapter {adapter.name} does not support {instrument.instrument_type.value} instrument {instrument.canonical_symbol}."
            )

        # Execute with bounded exponential backoff
        backoff = 1.0
        last_exc: Optional[Exception] = None

        for attempt in range(1, max_retries + 1):
            try:
                df = adapter.fetch_ohlcv(instrument, timeframe, limit=limit)
                return df, instrument
            except (ccxt.RateLimitExceeded, ccxt.NotSupported, ValueError) as non_retryable:
                # Do NOT retry non-retryable errors or rate-limits immediately
                raise non_retryable
            except (ccxt.NetworkError, ccxt.RequestTimeout) as retryable_err:
                last_exc = retryable_err
                if attempt == max_retries:
                    raise retryable_err
                jitter = random.uniform(0.1, 0.5)
                sleep_time = backoff + jitter
                logger.warning(
                    "Retryable network failure for %s (Attempt %d/%d). Backing off %.2fs: %s",
                    instrument.canonical_symbol,
                    attempt,
                    max_retries,
                    retryable_err,
                )
                time.sleep(sleep_time)
                backoff = min(backoff * 2.0, 16.0)
            except Exception as unk_err:
                raise unk_err

        if last_exc:
            raise last_exc
        raise RuntimeError(f"Failed to fetch market data for {symbol_or_query}")

    def get_all_provider_health(self) -> List[Dict[str, Any]]:
        """Returns health telemetry for all configured adapters."""
        return [
            self.spot_adapter.get_telemetry(),
            self.futures_adapter.get_telemetry(),
            self.options_adapter.get_telemetry(),
        ]


# Global shared ProviderManager instance
global_provider_manager = ProviderManager()
