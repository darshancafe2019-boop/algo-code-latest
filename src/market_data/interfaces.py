"""
Universal Market Data Interfaces & Enums
========================================
Provider-agnostic abstract interfaces and capability specifications
for Global Equities, Indian Markets, Crypto, Futures, and Options.
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Dict, Any, List, Optional, Tuple, Set
from dataclasses import dataclass, field
from datetime import datetime, timezone


class ProviderCapability(str, Enum):
    """Exhaustive capability flags for market data providers."""
    INDICES = "INDICES"
    STOCKS = "STOCKS"
    CRYPTO = "CRYPTO"
    FUTURES = "FUTURES"
    OPTIONS = "OPTIONS"
    OI = "OI"
    ORDERBOOK = "ORDERBOOK"
    TICK = "TICK"
    HISTORICAL = "HISTORICAL"
    GREEKS = "GREEKS"
    FUNDAMENTALS = "FUNDAMENTALS"
    NEWS = "NEWS"


class ProviderStatus(str, Enum):
    """Operational status of a market data provider."""
    LIVE = "LIVE"
    DELAYED = "DELAYED"
    STALE = "STALE"
    DISCONNECTED = "DISCONNECTED"
    NOT_CONFIGURED = "NOT_CONFIGURED"
    NOT_SUPPORTED = "NOT_SUPPORTED"


class AssetClass(str, Enum):
    """Canonical asset classes."""
    CRYPTO = "CRYPTO"
    INDIAN_EQUITIES = "INDIAN_EQUITIES"
    GLOBAL_EQUITIES = "GLOBAL_EQUITIES"
    INDIAN_INDICES = "INDIAN_INDICES"
    GLOBAL_INDICES = "GLOBAL_INDICES"
    FUTURES = "FUTURES"
    OPTIONS = "OPTIONS"
    COMMODITIES = "COMMODITIES"
    FOREX = "FOREX"


class OptionType(str, Enum):
    """Option contract types."""
    CALL = "CE"
    PUT = "PE"


class DataProvenance(str, Enum):
    """Provenance marker for every market data field."""
    PROVIDER_DATA = "PROVIDER_DATA"
    CALCULATED_DATA = "CALCULATED_DATA"
    ALGO_SIGNAL = "ALGO_SIGNAL"


class DataQuality(str, Enum):
    """Quality classification of a tick/quote."""
    VALID = "VALID"
    STALE = "STALE"
    SUSPECT = "SUSPECT"
    FUTURE_TIMESTAMP = "FUTURE_TIMESTAMP"
    CROSSED_BOOK = "CROSSED_BOOK"
    DROPPED_DUPLICATE = "DROPPED_DUPLICATE"


# =============================================================
# ABSTRACT PROVIDER INTERFACES
# =============================================================

class MarketDataProvider(ABC):
    """Base interface for spot, index, and equity market data feeds."""

    @abstractmethod
    def get_provider_id(self) -> str:
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        pass

    @abstractmethod
    def get_capabilities(self) -> Set[ProviderCapability]:
        pass

    @abstractmethod
    def get_supported_markets(self) -> List[str]:
        pass

    @abstractmethod
    def get_status(self) -> ProviderStatus:
        pass

    @abstractmethod
    def get_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def get_quotes_batch(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        pass

    @abstractmethod
    def get_historical_candles(
        self,
        symbol: str,
        timeframe: str = "5m",
        limit: int = 100,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        pass


class OptionsDataProvider(ABC):
    """Interface for options chains, contracts, expiries, and Greeks."""

    @abstractmethod
    def get_available_expiries(self, underlying: str) -> List[str]:
        pass

    @abstractmethod
    def get_option_chain(
        self,
        underlying: str,
        expiry: Optional[str] = None,
        strike_count: int = 20,
    ) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_option_quote(
        self,
        underlying: str,
        expiry: str,
        strike: float,
        option_type: OptionType,
    ) -> Optional[Dict[str, Any]]:
        pass


class FuturesDataProvider(ABC):
    """Interface for perpetual and dated futures contracts, basis, and funding."""

    @abstractmethod
    def get_futures_expiries(self, underlying: str) -> List[str]:
        pass

    @abstractmethod
    def get_futures_contracts(self, underlying: str) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def get_futures_basis(self, underlying: str, contract_symbol: Optional[str] = None) -> Dict[str, Any]:
        pass


class ReferenceDataProvider(ABC):
    """Interface for static instrument specifications, trading hours, and lot sizes."""

    @abstractmethod
    def get_instrument_metadata(self, symbol: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def search_instruments(self, query: str, limit: int = 25) -> List[Dict[str, Any]]:
        pass


class BrokerProvider(ABC):
    """Interface for broker connectivity, account balances, and margin requirements."""

    @abstractmethod
    def get_broker_name(self) -> str:
        pass

    @abstractmethod
    def is_connected(self) -> bool:
        pass

    @abstractmethod
    def get_account_balance(self) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_margin_profile(self) -> Dict[str, Any]:
        pass


class ExecutionProvider(ABC):
    """Interface for order execution routing and lifecycle management."""

    @abstractmethod
    def submit_order(self, order_payload: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def cancel_order(self, order_id: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_order_status(self, order_id: str) -> Dict[str, Any]:
        pass
