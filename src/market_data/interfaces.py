"""
Universal Multi-Market Trading, Options & Derivatives Interfaces
================================================================
Provider-agnostic abstract interfaces, capability matrices, and contract specifications
for Indian Markets (NSE/BSE), Global Equities & Options (US/EU/Asia), and Crypto Derivatives (Binance/Deribit).
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Dict, Any, List, Optional, Tuple, Set
from dataclasses import dataclass, field
from datetime import datetime, timezone


class ProviderCapability(str, Enum):
    """Exhaustive capability flags for market data and broker providers."""
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
    MULTILEG = "MULTILEG"
    BASKET = "BASKET"
    PAPER_TRADING = "PAPER_TRADING"
    LIVE_TRADING = "LIVE_TRADING"
    MARGIN_CALCULATOR = "MARGIN_CALCULATOR"


class ProviderStatus(str, Enum):
    """Operational status of a market data provider or broker connection."""
    LIVE = "LIVE"
    DELAYED = "DELAYED"
    STALE = "STALE"
    DISCONNECTED = "DISCONNECTED"
    AUTH_EXPIRED = "AUTH_EXPIRED"
    MISSING_SUBSCRIPTION = "MISSING_SUBSCRIPTION"
    UNSUPPORTED_PRODUCT = "UNSUPPORTED_PRODUCT"
    PAPER_ONLY = "PAPER_ONLY"
    NOT_CONFIGURED = "NOT_CONFIGURED"


class AssetClass(str, Enum):
    """Canonical asset classes across global markets."""
    CRYPTO = "CRYPTO"
    INDIAN_EQUITIES = "INDIAN_EQUITIES"
    GLOBAL_EQUITIES = "GLOBAL_EQUITIES"
    INDIAN_INDICES = "INDIAN_INDICES"
    GLOBAL_INDICES = "GLOBAL_INDICES"
    FUTURES = "FUTURES"
    OPTIONS = "OPTIONS"
    COMMODITIES = "COMMODITIES"
    FOREX = "FOREX"


class SecurityType(str, Enum):
    """Normalized security classifications."""
    STOCK = "STOCK"
    ETF = "ETF"
    CASH_INDEX = "CASH_INDEX"
    STOCK_OPTION = "STOCK_OPTION"
    ETF_OPTION = "ETF_OPTION"
    INDEX_OPTION = "INDEX_OPTION"
    FUTURES_CONTRACT = "FUTURES_CONTRACT"
    OPTION_ON_FUTURES = "OPTION_ON_FUTURES"
    CRYPTO_SPOT = "CRYPTO_SPOT"
    CRYPTO_PERPETUAL = "CRYPTO_PERPETUAL"
    CRYPTO_DELIVERY_FUTURE = "CRYPTO_DELIVERY_FUTURE"
    CRYPTO_OPTION = "CRYPTO_OPTION"


class OptionType(str, Enum):
    """Option contract right."""
    CALL = "CE"
    PUT = "PE"


class OptionExerciseStyle(str, Enum):
    """Exercise settlement style."""
    AMERICAN = "AMERICAN"
    EUROPEAN = "EUROPEAN"


class OptionSettlementType(str, Enum):
    """Delivery settlement type."""
    CASH = "CASH"
    PHYSICAL = "PHYSICAL"


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


@dataclass
class BrokerCapability:
    """Truthful capability profile published by every connected broker adapter."""
    broker_id: str
    broker_name: str
    supported_countries: List[str] = field(default_factory=lambda: ["India", "Global", "Crypto"])
    supported_exchanges: List[str] = field(default_factory=lambda: ["NSE", "BSE", "NASDAQ", "NYSE", "CBOE", "Binance"])
    supported_asset_classes: List[str] = field(default_factory=lambda: ["OPTIONS", "FUTURES", "EQUITIES", "CRYPTO"])
    market_data_availability: str = "LIVE"  # "LIVE", "DELAYED", "SIMULATED", "NONE"
    historical_data_availability: str = "LIVE"
    option_chain_availability: str = "LIVE"
    greeks_availability: str = "ANALYTICAL_BS"
    paper_trading_availability: bool = True
    live_trading_availability: bool = False
    multileg_order_support: bool = True
    basket_order_support: bool = True
    supported_order_types: List[str] = field(default_factory=lambda: ["LIMIT", "MARKET", "STOP_LIMIT"])
    supported_time_in_force: List[str] = field(default_factory=lambda: ["DAY", "IOC", "GTC"])
    margin_api_availability: bool = True
    position_api_availability: bool = True
    exercise_assignment_support: bool = True
    required_subscriptions: List[str] = field(default_factory=list)
    last_heartbeat_utc: Optional[str] = None
    last_quote_utc: Optional[str] = None
    last_reconciliation_utc: Optional[str] = None
    status: ProviderStatus = ProviderStatus.LIVE

    def to_dict(self) -> Dict[str, Any]:
        return {
            "broker_id": self.broker_id,
            "broker_name": self.broker_name,
            "supported_countries": self.supported_countries,
            "supported_exchanges": self.supported_exchanges,
            "supported_asset_classes": self.supported_asset_classes,
            "market_data_availability": self.market_data_availability,
            "historical_data_availability": self.historical_data_availability,
            "option_chain_availability": self.option_chain_availability,
            "greeks_availability": self.greeks_availability,
            "paper_trading_availability": self.paper_trading_availability,
            "live_trading_availability": self.live_trading_availability,
            "multileg_order_support": self.multileg_order_support,
            "basket_order_support": self.basket_order_support,
            "supported_order_types": self.supported_order_types,
            "supported_time_in_force": self.supported_time_in_force,
            "margin_api_availability": self.margin_api_availability,
            "position_api_availability": self.position_api_availability,
            "exercise_assignment_support": self.exercise_assignment_support,
            "required_subscriptions": self.required_subscriptions,
            "last_heartbeat_utc": self.last_heartbeat_utc,
            "last_quote_utc": self.last_quote_utc,
            "last_reconciliation_utc": self.last_reconciliation_utc,
            "status": self.status.value if isinstance(self.status, ProviderStatus) else str(self.status),
        }


# =============================================================
# ABSTRACT SPECIFICATION INTERFACES
# =============================================================

class MarketCatalogueProvider(ABC):
    """Catalog of market underlyings and traded securities."""
    @abstractmethod
    def list_instruments(self, asset_class: Optional[str] = None, country: Optional[str] = None) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def search_instruments(self, query: str, limit: int = 25) -> List[Dict[str, Any]]:
        pass


class InstrumentMetadataProvider(ABC):
    """Authoritative contract specifications and lot size resolution."""
    @abstractmethod
    def get_instrument_metadata(self, symbol: str) -> Optional[Dict[str, Any]]:
        pass


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


class HistoricalDataProvider(ABC):
    """Historical OHLCV candle feed interface."""
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


class OptionChainProvider(ABC):
    """Interface for option chains, strikes, and expiries."""
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


class GreeksProvider(ABC):
    """Calculates or relays analytical option Greeks."""
    @abstractmethod
    def calculate_greeks(
        self,
        option_type: str,
        underlying_price: float,
        strike_price: float,
        time_to_expiry_years: float,
        risk_free_rate: float = 0.065,
        iv: float = 0.20,
    ) -> Dict[str, float]:
        pass


class MarginProvider(ABC):
    """Calculates SPAN, portfolio margin, and capital requirements."""
    @abstractmethod
    def calculate_margin(self, legs: List[Dict[str, Any]], underlying_price: float) -> Dict[str, Any]:
        pass


class FxRateProvider(ABC):
    """Currency conversion rate resolver."""
    @abstractmethod
    def get_fx_rate(self, base_currency: str, quote_currency: str) -> float:
        pass


class TradingCalendarProvider(ABC):
    """Market trading sessions, timezones, and holidays."""
    @abstractmethod
    def is_market_open(self, market: str, dt_utc: Optional[datetime] = None) -> bool:
        pass

    @abstractmethod
    def get_next_trading_session(self, market: str) -> Dict[str, Any]:
        pass


class FeeModelProvider(ABC):
    """Calculates exchange, broker, and regulatory charges."""
    @abstractmethod
    def calculate_fees(self, legs: List[Dict[str, Any]], exchange: str) -> Dict[str, Any]:
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


class BrokerAdapter(ABC):
    """Universal Broker Adapter for account querying, multileg execution, and order management."""
    @abstractmethod
    def get_capability(self) -> BrokerCapability:
        pass

    @abstractmethod
    def get_account_summary(self) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_positions(self) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def place_multileg_order(self, order_payload: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def cancel_order(self, order_id: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    def square_off_position(self, position_id: str) -> Dict[str, Any]:
        pass


# Backward-compatible Interface Aliases
OptionsDataProvider = OptionChainProvider
ReferenceDataProvider = InstrumentMetadataProvider
BrokerProvider = BrokerAdapter
ExecutionProvider = BrokerAdapter


