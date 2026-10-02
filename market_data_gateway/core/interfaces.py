"""
Universal Market Data and Execution Provider Interfaces
=======================================================
Defines canonical abstractions separating market data feeds from execution brokers.
"""
import abc
from dataclasses import asdict, dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set


class ProviderStatus(str, Enum):
    CONNECTED = "CONNECTED"
    CONNECTING = "CONNECTING"
    RECONNECTING = "RECONNECTING"
    DEGRADED = "DEGRADED"
    DISCONNECTED = "DISCONNECTED"
    AUTH_FAILED = "AUTH_FAILED"
    RATE_LIMITED = "RATE_LIMITED"
    STALE = "STALE"


class MarketType(str, Enum):
    NSE_EQ = "NSE_EQ"
    NSE_FO = "NSE_FO"
    CRYPTO_SPOT = "CRYPTO_SPOT"
    CRYPTO_PERP = "CRYPTO_PERP"
    CRYPTO_OPTIONS = "CRYPTO_OPTIONS"
    SIMULATION = "SIMULATION"


@dataclass
class NormalizedMarketEvent:
    """Canonical Normalized Market Data Structure (Requirement 9)."""
    provider: str
    exchange: str
    symbol: str
    segment: str = "SPOT"
    instrumentKey: Optional[str] = None
    instrumentType: Optional[str] = None
    timestampExchange: Optional[int] = None
    timestampReceived: Optional[int] = None
    sequence: Optional[int] = None
    eventType: str = "QUOTE"

    ltp: Optional[float] = None
    bid: Optional[float] = None
    ask: Optional[float] = None
    bidQty: Optional[float] = None
    askQty: Optional[float] = None

    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None

    volume: Optional[float] = None
    openInterest: Optional[float] = None

    markPrice: Optional[float] = None
    indexPrice: Optional[float] = None
    fundingRate: Optional[float] = None

    strike: Optional[float] = None
    expiry: Optional[str] = None
    optionType: Optional[str] = None

    iv: Optional[float] = None
    delta: Optional[float] = None
    gamma: Optional[float] = None
    theta: Optional[float] = None
    vega: Optional[float] = None

    depth: Optional[List[Any]] = field(default_factory=list)
    rawProviderTimestamp: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        if self.depth is None:
            d["depth"] = []
        return d


class IMarketDataProvider(abc.ABC):
    """Universal interface for real-time market data feed providers."""

    @abc.abstractmethod
    async def connect(self) -> bool:
        """Establish WebSocket connection to market data provider."""
        raise NotImplementedError

    @abc.abstractmethod
    async def disconnect(self) -> None:
        """Disconnect and cleanup connection resources."""
        raise NotImplementedError

    @abc.abstractmethod
    async def subscribe(self, symbols: List[str], reason: str = "COMMAND_CENTER") -> bool:
        """Subscribe to live market feeds for given symbols/instrument keys."""
        raise NotImplementedError

    @abc.abstractmethod
    async def unsubscribe(self, symbols: List[str]) -> bool:
        """Unsubscribe from live market feeds."""
        raise NotImplementedError

    @abc.abstractmethod
    async def get_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Retrieve latest cached or snapshot quote."""
        raise NotImplementedError

    @abc.abstractmethod
    async def get_depth(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Retrieve L2 market depth / order book levels."""
        raise NotImplementedError

    @abc.abstractmethod
    async def get_option_chain(self, underlying: str, expiry: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Retrieve full option chain with strikes, CE/PE quotes, and Greeks."""
        raise NotImplementedError

    @abc.abstractmethod
    async def get_greeks(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Retrieve option Greeks (Delta, Gamma, Theta, Vega, IV)."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """Return provider connection state, latency, and throughput metrics."""
        raise NotImplementedError

    @abc.abstractmethod
    async def reconnect(self) -> bool:
        """Force reconnect with exponential backoff and subscription restoration."""
        raise NotImplementedError


class IExecutionProvider(abc.ABC):
    """Universal interface for execution brokers and order routing."""

    @abc.abstractmethod
    def place_order(self, order_request: Dict[str, Any]) -> Dict[str, Any]:
        """Place an order with the execution broker."""
        raise NotImplementedError

    @abc.abstractmethod
    def modify_order(self, order_id: str, modification: Dict[str, Any]) -> Dict[str, Any]:
        """Modify an existing open order."""
        raise NotImplementedError

    @abc.abstractmethod
    def cancel_order(self, order_id: str) -> Dict[str, Any]:
        """Cancel an open order."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_orders(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve active and historical orders from the broker."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_trades(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Retrieve executed trade fills."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_positions(self) -> List[Dict[str, Any]]:
        """Retrieve open and closed positions."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_funds(self) -> Dict[str, Any]:
        """Retrieve available cash, margin balance, and collateral."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_margins(self) -> Dict[str, Any]:
        """Retrieve margin requirements and utilization."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """Return broker connection and authorization status."""
        raise NotImplementedError
