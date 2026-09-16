"""
Typed Provider Registry
=======================
Centralized, typed registry of all supported market data and execution providers across:
- Indian Brokers
- Crypto Exchanges
- Global / Forex Brokers
"""

from __future__ import annotations

import os
from enum import Enum
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict, field


class ProviderCategory(str, Enum):
    INDIAN_BROKERS = "INDIAN_BROKERS"
    CRYPTO = "CRYPTO"
    GLOBAL_FOREX = "GLOBAL_FOREX"


class ConnectionState(str, Enum):
    CONNECTED = "CONNECTED"
    CONNECTING = "CONNECTING"
    RECONNECTING = "RECONNECTING"
    DISCONNECTED = "DISCONNECTED"
    STALE = "STALE"
    ERROR = "ERROR"
    NOT_CONFIGURED = "NOT_CONFIGURED"
    AUTH_EXPIRED = "AUTH_EXPIRED"
    RATE_LIMITED = "RATE_LIMITED"


@dataclass
class ProviderCapability:
    marketData: bool = True
    orderExecution: bool = True
    optionChain: bool = False
    futures: bool = False
    crypto: bool = False
    forex: bool = False
    websocket: bool = True
    rest: bool = True
    historicalData: bool = True
    portfolio: bool = True
    orders: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ProviderDefinition:
    id: str
    name: str
    category: ProviderCategory
    logo: str  # Emoji or icon identifier
    markets: List[str]
    assetClasses: List[str]
    capabilities: ProviderCapability
    authenticationType: str  # "TOKEN", "API_KEY_SECRET", "TOTP_OAUTH", "BRIDGE"
    connectionState: ConnectionState = ConnectionState.NOT_CONFIGURED
    isConfigured: bool = False
    isPrimary: bool = False
    isSecondary: bool = False
    latencyMs: float = 0.0
    lastTickIso: str = ""
    lastError: str = ""
    subscriptionsCount: int = 0
    maxSubscriptions: int = 5000
    description: str = ""

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["category"] = self.category.value
        d["connectionState"] = self.connectionState.value
        d["capabilities"] = self.capabilities.to_dict()
        return d


# Catalog of all supported providers with genuine capability declarations
DEFAULT_PROVIDERS_CATALOG: Dict[str, ProviderDefinition] = {
    # ── INDIAN BROKERS ────────────────────────────────────────────────────────
    "dhan": ProviderDefinition(
        id="dhan",
        name="Dhan HQ",
        category=ProviderCategory.INDIAN_BROKERS,
        logo="🇮🇳",
        markets=["NSE", "BSE", "MCX"],
        assetClasses=["EQUITY", "F&O", "CURRENCY", "COMMODITY"],
        capabilities=ProviderCapability(
            marketData=True,
            orderExecution=True,
            optionChain=True,
            futures=True,
            crypto=False,
            forex=False,
            websocket=True,
            rest=True,
            historicalData=True,
            portfolio=True,
            orders=True,
        ),
        authenticationType="TOKEN",
        description="Official Dhan HQ Trading & Market Feed API with direct order execution and live depth.",
    ),
    "upstox": ProviderDefinition(
        id="upstox",
        name="Upstox V3",
        category=ProviderCategory.INDIAN_BROKERS,
        logo="🇮🇳",
        markets=["NSE", "BSE", "MCX"],
        assetClasses=["EQUITY", "F&O", "COMMODITY"],
        capabilities=ProviderCapability(
            marketData=True,
            orderExecution=True,
            optionChain=True,
            futures=True,
            crypto=False,
            forex=False,
            websocket=True,
            rest=True,
            historicalData=True,
            portfolio=True,
            orders=True,
        ),
        authenticationType="TOTP_OAUTH",
        description="Upstox API v3 Protobuf WebSocket feed and multi-order routing.",
    ),
    "fyers": ProviderDefinition(
        id="fyers",
        name="FYERS V3",
        category=ProviderCategory.INDIAN_BROKERS,
        logo="🇮🇳",
        markets=["NSE", "BSE", "MCX"],
        assetClasses=["EQUITY", "F&O", "CURRENCY", "COMMODITY"],
        capabilities=ProviderCapability(
            marketData=True,
            orderExecution=True,
            optionChain=True,
            futures=True,
            crypto=False,
            forex=False,
            websocket=True,
            rest=True,
            historicalData=True,
            portfolio=True,
            orders=True,
        ),
        authenticationType="API_KEY_SECRET",
        description="FYERS API v3 high-speed WebSocket market data and institutional order manager.",
    ),
    "zerodha": ProviderDefinition(
        id="zerodha",
        name="Zerodha Kite Connect",
        category=ProviderCategory.INDIAN_BROKERS,
        logo="🪁",
        markets=["NSE", "BSE", "MCX"],
        assetClasses=["EQUITY", "F&O", "COMMODITY"],
        capabilities=ProviderCapability(
            marketData=True,
            orderExecution=True,
            optionChain=True,
            futures=True,
            crypto=False,
            forex=False,
            websocket=True,
            rest=True,
            historicalData=True,
            portfolio=True,
            orders=True,
        ),
        authenticationType="API_KEY_SECRET",
        description="Kite Connect 3.0 API with WebSocket ticker and basket orders.",
    ),
    "angelone": ProviderDefinition(
        id="angelone",
        name="Angel One SmartAPI",
        category=ProviderCategory.INDIAN_BROKERS,
        logo="👼",
        markets=["NSE", "BSE", "MCX"],
        assetClasses=["EQUITY", "F&O", "COMMODITY"],
        capabilities=ProviderCapability(
            marketData=True,
            orderExecution=True,
            optionChain=True,
            futures=True,
            crypto=False,
            forex=False,
            websocket=True,
            rest=True,
            historicalData=True,
            portfolio=True,
            orders=True,
        ),
        authenticationType="API_KEY_SECRET",
        description="Angel One SmartAPI WebSocket feed and institutional execution engine.",
    ),
    "icicidirect": ProviderDefinition(
        id="icicidirect",
        name="ICICI Direct Breeze",
        category=ProviderCategory.INDIAN_BROKERS,
        logo="🏦",
        markets=["NSE", "BSE"],
        assetClasses=["EQUITY", "F&O"],
        capabilities=ProviderCapability(
            marketData=True,
            orderExecution=True,
            optionChain=True,
            futures=True,
            crypto=False,
            forex=False,
            websocket=True,
            rest=True,
            historicalData=True,
            portfolio=True,
            orders=True,
        ),
        authenticationType="API_KEY_SECRET",
        description="ICICI Direct Breeze API for equity and derivative algorithmic trading.",
    ),
    "fivepaisa": ProviderDefinition(
        id="fivepaisa",
        name="5Paisa Open API",
        category=ProviderCategory.INDIAN_BROKERS,
        logo="₹",
        markets=["NSE", "BSE", "MCX"],
        assetClasses=["EQUITY", "F&O"],
        capabilities=ProviderCapability(
            marketData=True,
            orderExecution=True,
            optionChain=True,
            futures=True,
            crypto=False,
            forex=False,
            websocket=True,
            rest=True,
            historicalData=True,
            portfolio=True,
            orders=True,
        ),
        authenticationType="API_KEY_SECRET",
        description="5Paisa Open Platform API for real-time market data and order placement.",
    ),

    # ── CRYPTO EXCHANGES ──────────────────────────────────────────────────────
    "delta": ProviderDefinition(
        id="delta",
        name="Delta Exchange",
        category=ProviderCategory.CRYPTO,
        logo="⚡",
        markets=["DELTA_INDIA", "DELTA_GLOBAL"],
        assetClasses=["CRYPTO_OPTIONS", "CRYPTO_FUTURES", "PERPETUALS", "SPOT"],
        capabilities=ProviderCapability(
            marketData=True,
            orderExecution=True,
            optionChain=True,
            futures=True,
            crypto=True,
            forex=False,
            websocket=True,
            rest=True,
            historicalData=True,
            portfolio=True,
            orders=True,
        ),
        authenticationType="API_KEY_SECRET",
        description="Official Delta Exchange 24/7 crypto options, perpetual futures, and live orderbook.",
    ),
    "binance": ProviderDefinition(
        id="binance",
        name="Binance",
        category=ProviderCategory.CRYPTO,
        logo="🟡",
        markets=["BINANCE_SPOT", "BINANCE_USDM", "BINANCE_COINM"],
        assetClasses=["CRYPTO_SPOT", "CRYPTO_FUTURES", "PERPETUALS"],
        capabilities=ProviderCapability(
            marketData=True,
            orderExecution=True,
            optionChain=False,  # Spot and USDT-M futures primary
            futures=True,
            crypto=True,
            forex=False,
            websocket=True,
            rest=True,
            historicalData=True,
            portfolio=True,
            orders=True,
        ),
        authenticationType="API_KEY_SECRET",
        description="Binance public and private WebSocket API with institutional depth.",
    ),
    "bybit": ProviderDefinition(
        id="bybit",
        name="Bybit V5",
        category=ProviderCategory.CRYPTO,
        logo="🅱️",
        markets=["BYBIT_SPOT", "BYBIT_LINEAR", "BYBIT_INVERSE"],
        assetClasses=["CRYPTO_SPOT", "CRYPTO_FUTURES", "CRYPTO_OPTIONS"],
        capabilities=ProviderCapability(
            marketData=True,
            orderExecution=True,
            optionChain=True,
            futures=True,
            crypto=True,
            forex=False,
            websocket=True,
            rest=True,
            historicalData=True,
            portfolio=True,
            orders=True,
        ),
        authenticationType="API_KEY_SECRET",
        description="Bybit V5 unified trading API for crypto spot, linear perpetuals, and USDC options.",
    ),
    "okx": ProviderDefinition(
        id="okx",
        name="OKX V5",
        category=ProviderCategory.CRYPTO,
        logo="⬛",
        markets=["OKX_SPOT", "OKX_FUTURES", "OKX_SWAP", "OKX_OPTIONS"],
        assetClasses=["CRYPTO_SPOT", "CRYPTO_FUTURES", "CRYPTO_OPTIONS"],
        capabilities=ProviderCapability(
            marketData=True,
            orderExecution=True,
            optionChain=True,
            futures=True,
            crypto=True,
            forex=False,
            websocket=True,
            rest=True,
            historicalData=True,
            portfolio=True,
            orders=True,
        ),
        authenticationType="API_KEY_SECRET",
        description="OKX V5 institutional API with full cross-margin options and swaps execution.",
    ),

    # ── GLOBAL / FOREX ────────────────────────────────────────────────────────
    "metatrader5": ProviderDefinition(
        id="metatrader5",
        name="MetaTrader 5",
        category=ProviderCategory.GLOBAL_FOREX,
        logo="📈",
        markets=["FOREX", "METALS", "INDICES", "CFD"],
        assetClasses=["FOREX", "COMMODITY", "INDEX_CFD"],
        capabilities=ProviderCapability(
            marketData=True,
            orderExecution=True,
            optionChain=False,
            futures=False,
            crypto=False,
            forex=True,
            websocket=False,
            rest=False,
            historicalData=True,
            portfolio=True,
            orders=True,
        ),
        authenticationType="BRIDGE",
        description="MetaTrader 5 IPC/Python Bridge for multi-broker Forex and CFD trading.",
    ),
    "exness": ProviderDefinition(
        id="exness",
        name="Exness Bridge",
        category=ProviderCategory.GLOBAL_FOREX,
        logo="🌐",
        markets=["FOREX", "METALS", "CRYPTO_CFD"],
        assetClasses=["FOREX", "COMMODITY"],
        capabilities=ProviderCapability(
            marketData=True,
            orderExecution=True,
            optionChain=False,
            futures=False,
            crypto=False,
            forex=True,
            websocket=True,
            rest=True,
            historicalData=True,
            portfolio=True,
            orders=True,
        ),
        authenticationType="API_KEY_SECRET",
        description="Exness ultra-low latency Forex and Commodities streaming feed.",
    ),
    "interactive_brokers": ProviderDefinition(
        id="interactive_brokers",
        name="Interactive Brokers (IBKR)",
        category=ProviderCategory.GLOBAL_FOREX,
        logo="🏛️",
        markets=["NYSE", "NASDAQ", "LSE", "EUREX", "HKEX"],
        assetClasses=["GLOBAL_EQUITY", "OPTIONS", "FUTURES", "FOREX", "BONDS"],
        capabilities=ProviderCapability(
            marketData=True,
            orderExecution=True,
            optionChain=True,
            futures=True,
            crypto=False,
            forex=True,
            websocket=True,
            rest=True,
            historicalData=True,
            portfolio=True,
            orders=True,
        ),
        authenticationType="BRIDGE",
        description="Interactive Brokers TWS Client API and Client Portal Web Gateway.",
    ),
}


class ProviderRegistry:
    """Manages provider catalog lookup and categorization."""

    def __init__(self):
        self._providers: Dict[str, ProviderDefinition] = dict(DEFAULT_PROVIDERS_CATALOG)

    def get_all(self) -> List[ProviderDefinition]:
        return list(self._providers.values())

    def get_all_providers(self) -> List[ProviderDefinition]:
        return self.get_all()

    def get_by_id(self, provider_id: str) -> Optional[ProviderDefinition]:
        return self._providers.get(provider_id.lower())

    def get_provider(self, provider_id: str) -> Optional[ProviderDefinition]:
        return self.get_by_id(provider_id)

    def get_by_category(self, category: ProviderCategory) -> List[ProviderDefinition]:
        return [p for p in self._providers.values() if p.category == category]

    def get_providers_by_category(self, category: ProviderCategory) -> List[ProviderDefinition]:
        return self.get_by_category(category)

    def register_provider(self, definition: ProviderDefinition) -> None:
        self._providers[definition.id.lower()] = definition



_global_registry: Optional[ProviderRegistry] = None


def get_provider_registry() -> ProviderRegistry:
    global _global_registry
    if _global_registry is None:
        _global_registry = ProviderRegistry()
    return _global_registry


global_provider_registry = get_provider_registry()

