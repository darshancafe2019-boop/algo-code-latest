"""
Provider Interfaces & Capability Definitions
============================================
Defines the authoritative base contract for all Quant.OS market data providers.
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime, timezone


class ProviderCapability(str, Enum):
    INSTRUMENTS = "INSTRUMENTS"
    REALTIME_QUOTES = "REALTIME_QUOTES"
    DELAYED_QUOTES = "DELAYED_QUOTES"
    HISTORICAL_CANDLES = "HISTORICAL_CANDLES"
    FUNDAMENTALS = "FUNDAMENTALS"
    CORPORATE_ACTIONS = "CORPORATE_ACTIONS"
    MARKET_DEPTH = "MARKET_DEPTH"
    TRADING = "TRADING"
    WEBSOCKET = "WEBSOCKET"


@dataclass
class ProviderMetadata:
    provider_id: str
    name: str
    description: str
    supported_countries: List[str] = field(default_factory=list)
    supported_exchanges: List[str] = field(default_factory=list)
    capabilities: List[ProviderCapability] = field(default_factory=list)
    is_active: bool = True
    is_authenticated: bool = False
    rate_limit_per_second: int = 10
    latency_ms: float = 0.0
    last_health_check: Optional[str] = None
    last_sync_timestamp: Optional[str] = None


class BaseMarketDataProvider(ABC):
    """Abstract Base Class for all market data source adapters."""

    def __init__(self, metadata: ProviderMetadata):
        self.metadata = metadata

    @abstractmethod
    def get_provider_id(self) -> str:
        return self.metadata.provider_id

    @abstractmethod
    def get_provider_name(self) -> str:
        return self.metadata.name

    @abstractmethod
    def has_capability(self, capability: ProviderCapability) -> bool:
        return capability in self.metadata.capabilities

    @abstractmethod
    def discover_instruments(self) -> List[Dict[str, Any]]:
        """Discovers full instrument catalog from official provider endpoints."""
        pass

    @abstractmethod
    def fetch_quotes(self, symbols_or_keys: List[str]) -> Dict[str, Dict[str, Any]]:
        """Fetches normalized quote snapshots for requested symbols."""
        pass

    @abstractmethod
    def fetch_historical(
        self,
        instrument_key: str,
        timeframe: str = "15m",
        limit: int = 100,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Fetches historical OHLCV candle series."""
        pass

    def fetch_fundamentals(self, symbol_or_key: str) -> Optional[Dict[str, Any]]:
        """Fetches fundamental metrics if supported by provider."""
        return None

    def fetch_corporate_actions(self, symbol_or_key: str) -> List[Dict[str, Any]]:
        """Fetches corporate actions (dividends, splits) if supported."""
        return []

    def check_health(self) -> Dict[str, Any]:
        """Performs ping / latency check."""
        now_utc = datetime.now(timezone.utc).isoformat()
        self.metadata.last_health_check = now_utc
        return {
            "provider_id": self.metadata.provider_id,
            "name": self.metadata.name,
            "is_active": self.metadata.is_active,
            "is_authenticated": self.metadata.is_authenticated,
            "latency_ms": self.metadata.latency_ms,
            "last_check": now_utc,
            "capabilities": [c.value for c in self.metadata.capabilities],
        }
