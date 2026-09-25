"""
Authoritative Quant.OS Data Core Models & Data Contracts
========================================================
Defines strict, typed contracts across all QuantDataCore domains:
- MarketDataDomain
- AccountDomain
- PortfolioDomain
- PositionDomain
- OrderDomain
- ExecutionDomain
- CapitalDomain
- RiskDomain
- ProviderHealthDomain

Invariants:
1. Environment is strictly typed as PAPER or LIVE on every record.
2. Provider funds and currencies are strictly segregated.
3. Every numeric field is non-fabricated; missing values default to 0.0 or None with explicit flags.
"""
from __future__ import annotations

import uuid
import time
from enum import Enum
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Union


# =============================================================================
# 1. ENUMS
# =============================================================================

class Environment(str, Enum):
    PAPER = "PAPER"
    LIVE = "LIVE"


class ProviderStatus(str, Enum):
    LIVE = "LIVE"
    CONNECTED = "CONNECTED"
    RECEIVING = "RECEIVING"
    STALE = "STALE"
    RECONNECTING = "RECONNECTING"
    AUTH_REQUIRED = "AUTH_REQUIRED"
    NOT_ENTITLED = "NOT_ENTITLED"
    RATE_LIMITED = "RATE_LIMITED"
    OFFLINE = "OFFLINE"
    ERROR = "ERROR"


class EventDomain(str, Enum):
    MARKET_DATA = "MARKET_DATA"
    ACCOUNT = "ACCOUNT"
    POSITION = "POSITION"
    ORDER = "ORDER"
    FILL = "FILL"
    CAPITAL = "CAPITAL"
    RISK = "RISK"
    SYSTEM = "SYSTEM"
    BOT = "BOT"
    STRATEGY = "STRATEGY"
    RECONCILIATION = "RECONCILIATION"
    AUDIT = "AUDIT"


class EventType(str, Enum):
    # Bot Lifecycle
    BOT_CREATED = "BOT_CREATED"
    BOT_STARTING = "BOT_STARTING"
    BOT_STARTED = "BOT_STARTED"
    BOT_WAITING_SIGNAL = "BOT_WAITING_SIGNAL"
    BOT_PAUSED = "BOT_PAUSED"
    BOT_RESUMED = "BOT_RESUMED"
    BOT_STOPPED = "BOT_STOPPED"
    BOT_FAILED = "BOT_FAILED"
    BOT_RECOVERED = "BOT_RECOVERED"

    # Market Data & Feeds
    FEED_CONNECTING = "FEED_CONNECTING"
    FEED_CONNECTED = "FEED_CONNECTED"
    FEED_DISCONNECTED = "FEED_DISCONNECTED"
    FEED_RECONNECTING = "FEED_RECONNECTING"
    DATA_STALE = "DATA_STALE"
    DATA_RECOVERED = "DATA_RECOVERED"
    TICK_RECEIVED = "TICK_RECEIVED"
    CANDLE_CLOSED = "CANDLE_CLOSED"
    MARKET_TICK = "MARKET_TICK"
    QUOTE = "QUOTE"
    TRADE = "TRADE"
    DEPTH = "DEPTH"
    CANDLE = "CANDLE"
    OI = "OI"
    FUNDING = "FUNDING"
    GREEKS = "GREEKS"

    # Strategy & Signals
    STRATEGY_EVALUATED = "STRATEGY_EVALUATED"
    SIGNAL_LONG = "SIGNAL_LONG"
    SIGNAL_SHORT = "SIGNAL_SHORT"
    SIGNAL_HOLD = "SIGNAL_HOLD"
    SIGNAL_REJECTED = "SIGNAL_REJECTED"

    # Risk Checks
    RISK_CHECK_STARTED = "RISK_CHECK_STARTED"
    RISK_APPROVED = "RISK_APPROVED"
    RISK_REJECTED = "RISK_REJECTED"
    POSITION_SIZE_CALCULATED = "POSITION_SIZE_CALCULATED"

    # Orders & Execution
    ORDER_CREATED = "ORDER_CREATED"
    ORDER_PENDING = "ORDER_PENDING"
    ORDER_SENT = "ORDER_SENT"
    ORDER_ACKNOWLEDGED = "ORDER_ACKNOWLEDGED"
    ORDER_ACCEPTED = "ORDER_ACCEPTED"
    ORDER_PARTIALLY_FILLED = "ORDER_PARTIALLY_FILLED"
    ORDER_PARTIAL_FILL = "ORDER_PARTIAL_FILL"
    ORDER_FILLED = "ORDER_FILLED"
    ORDER_REJECTED = "ORDER_REJECTED"
    ORDER_CANCELLED = "ORDER_CANCELLED"
    ORDER_OPEN = "ORDER_OPEN"
    TRADE_FILL = "TRADE_FILL"

    # Positions & Lifecycle
    POSITION_OPENED = "POSITION_OPENED"
    POSITION_UPDATED = "POSITION_UPDATED"
    POSITION_REDUCED = "POSITION_REDUCED"
    POSITION_CLOSED = "POSITION_CLOSED"

    # P&L & Stops
    PNL_UPDATE = "PNL_UPDATE"
    PNL_UPDATED = "PNL_UPDATED"
    REALIZED_PNL_UPDATED = "REALIZED_PNL_UPDATED"
    UNREALIZED_PNL_UPDATED = "UNREALIZED_PNL_UPDATED"
    STOP_LOSS_TRIGGERED = "STOP_LOSS_TRIGGERED"
    TAKE_PROFIT_TRIGGERED = "TAKE_PROFIT_TRIGGERED"
    BREAK_EVEN_MOVED = "BREAK_EVEN_MOVED"
    TRAILING_STOP_UPDATED = "TRAILING_STOP_UPDATED"

    # Capital & Accounts
    BALANCE_UPDATE = "BALANCE_UPDATE"
    MARGIN_UPDATE = "MARGIN_UPDATE"
    CAPITAL_ALLOCATION = "CAPITAL_ALLOCATION"
    CAPITAL_RESERVATION = "CAPITAL_RESERVATION"
    CAPITAL_RELEASE = "CAPITAL_RELEASE"

    # Provider Health & Auth
    PROVIDER_AUTH_OK = "PROVIDER_AUTH_OK"
    PROVIDER_AUTH_FAILED = "PROVIDER_AUTH_FAILED"
    PROVIDER_RECONNECTED = "PROVIDER_RECONNECTED"
    PROVIDER_CONNECTED = "PROVIDER_CONNECTED"
    PROVIDER_DISCONNECTED = "PROVIDER_DISCONNECTED"
    PROVIDER_STALE = "PROVIDER_STALE"
    PROVIDER_ERROR = "PROVIDER_ERROR"

    # OMS & Engine Health
    OMS_HEALTHY = "OMS_HEALTHY"
    OMS_DEGRADED = "OMS_DEGRADED"

    # Reconciliation
    RECONCILIATION_STARTED = "RECONCILIATION_STARTED"
    RECONCILIATION_MATCHED = "RECONCILIATION_MATCHED"
    RECONCILIATION_MISMATCH = "RECONCILIATION_MISMATCH"
    RECONCILIATION_HEALTHY = "RECONCILIATION_HEALTHY"
    RECONCILIATION_DRIFT = "RECONCILIATION_DRIFT"

    # System & Runtime Failures
    BOT_RUNTIME_ERROR = "BOT_RUNTIME_ERROR"
    ORDER_TIMEOUT = "ORDER_TIMEOUT"
    DATABASE_ERROR = "DATABASE_ERROR"
    WEBSOCKET_ERROR = "WEBSOCKET_ERROR"
    INVALID_MARKET_DATA = "INVALID_MARKET_DATA"

    # Retries & Recovery
    RETRY_STARTED = "RETRY_STARTED"
    RETRY_FAILED = "RETRY_FAILED"
    RETRY_SUCCESS = "RETRY_SUCCESS"


class LedgerEntryType(str, Enum):
    DEPOSIT = "DEPOSIT"
    WITHDRAWAL = "WITHDRAWAL"
    TRANSFER = "TRANSFER"
    ALLOCATION = "ALLOCATION"
    RESERVATION = "RESERVATION"
    RELEASE = "RELEASE"
    REALIZED_PNL = "REALIZED_PNL"
    BROKERAGE = "BROKERAGE"
    FEE = "FEE"
    TAX = "TAX"
    FUNDING = "FUNDING"
    INTEREST = "INTEREST"
    ADJUSTMENT = "ADJUSTMENT"


class LedgerDirection(str, Enum):
    CREDIT = "CREDIT"
    DEBIT = "DEBIT"


class OrderSide(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


class PositionSide(str, Enum):
    LONG = "LONG"
    SHORT = "SHORT"
    FLAT = "FLAT"


class OrderType(str, Enum):
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP = "STOP"
    STOP_LIMIT = "STOP_LIMIT"


class OrderStatus(str, Enum):
    PENDING = "PENDING"
    OPEN = "OPEN"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    FILLED = "FILLED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class ReconciliationStatus(str, Enum):
    HEALTHY = "HEALTHY"
    DRIFT = "DRIFT"
    STALE = "STALE"
    ERROR = "ERROR"


# =============================================================================
# 2. PROVIDER REGISTRY MODELS
# =============================================================================

@dataclass
class ProviderCapabilities:
    market_data: bool = True
    execution: bool = False
    account: bool = False

    def to_dict(self) -> Dict[str, bool]:
        return {
            "marketData": self.market_data,
            "execution": self.execution,
            "account": self.account,
        }


@dataclass
class ProviderInfo:
    provider_id: str
    name: str
    capabilities: ProviderCapabilities
    market_data_connected: bool = False
    account_connected: bool = False
    execution_connected: bool = False
    authenticated: bool = False
    environment: Environment = Environment.PAPER
    latency_ms: float = 0.0
    last_market_packet: Optional[str] = None
    last_account_update: Optional[str] = None
    last_order_update: Optional[str] = None
    subscriptions_count: int = 0
    messages_per_second: float = 0.0
    errors_count: int = 0
    reconnect_count: int = 0
    status: ProviderStatus = ProviderStatus.OFFLINE
    status_message: str = "Initialized"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "providerId": self.provider_id,
            "name": self.name,
            "capabilities": self.capabilities.to_dict(),
            "marketDataConnected": self.market_data_connected,
            "accountConnected": self.account_connected,
            "executionConnected": self.execution_connected,
            "authenticated": self.authenticated,
            "environment": self.environment.value,
            "latencyMs": self.latency_ms,
            "lastMarketPacket": self.last_market_packet,
            "lastAccountUpdate": self.last_account_update,
            "lastOrderUpdate": self.last_order_update,
            "subscriptionsCount": self.subscriptions_count,
            "messagesPerSecond": self.messages_per_second,
            "errorsCount": self.errors_count,
            "reconnectCount": self.reconnect_count,
            "status": self.status.value,
            "statusMessage": self.status_message,
        }


# =============================================================================
# 3. GLOBAL EVENT MODEL
# =============================================================================

@dataclass
class NormalizedEvent:
    # 1. Identity, Monotonic Sequence & Timestamps
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    sequence: int = 0
    event_time: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    received_time: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    environment: Environment = Environment.PAPER
    provider: str = "SYSTEM"
    domain: EventDomain = EventDomain.SYSTEM
    event_type: Union[EventType, str] = EventType.MARKET_TICK
    severity: str = "INFO"  # "INFO" | "WARN" | "ERROR" | "CRITICAL"

    # 2. Bot & Strategy Context
    bot_id: Optional[str] = None
    bot_name: Optional[str] = None
    strategy_id: Optional[str] = None
    strategy_name: Optional[str] = None

    # 3. Market & Asset Taxonomy
    symbol: Optional[str] = None
    exchange: Optional[str] = None
    timeframe: Optional[str] = None
    instrument_id: Optional[str] = None
    canonical_instrument_id: Optional[str] = None

    # 4. Account & Trading Entity IDs
    account_id: Optional[str] = None
    order_id: Optional[str] = None
    trade_id: Optional[str] = None
    position_id: Optional[str] = None

    # 5. Order / Position Parameters & Pricing
    side: Optional[str] = None  # "BUY" | "SELL" | "LONG" | "SHORT"
    quantity: Optional[float] = None
    market_price: Optional[float] = None
    entry_price: Optional[float] = None
    exit_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None

    # 6. P&L & Execution Cost Accounting
    realized_pnl: Optional[float] = None
    unrealized_pnl: Optional[float] = None
    commission: Optional[float] = None
    fees: Optional[float] = None
    slippage: Optional[float] = None

    # 7. Intelligence & Decision Auditing
    strategy_score: Optional[float] = None
    confidence: Optional[float] = None
    status: Optional[str] = None
    decision_reason: Optional[str] = None

    # 8. Diagnostics, Errors & Latency Metrics
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    latency_ms: float = 0.0
    data_age_ms: float = 0.0

    # 9. Correlation & Causation Tracing
    correlation_id: Optional[str] = None
    causation_id: Optional[str] = None
    idempotency_key: Optional[str] = None

    # 10. Reconciliation & Custom Metadata
    reconciliation_status: Optional[str] = None  # "MATCHED" | "MISMATCH" | "PENDING"
    metadata: Dict[str, Any] = field(default_factory=dict)
    raw_payload: Optional[Dict[str, Any]] = None

    # Legacy compatibility fields
    provider_timestamp: Optional[str] = None
    exchange_timestamp: Optional[str] = None
    received_timestamp: Optional[str] = None
    payload: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        ev_type_str = self.event_type.value if hasattr(self.event_type, "value") else str(self.event_type)
        domain_str = self.domain.value if hasattr(self.domain, "value") else str(self.domain)
        env_str = self.environment.value if hasattr(self.environment, "value") else str(self.environment)

        combined_payload = dict(self.payload or {})
        if self.metadata:
            combined_payload.update(self.metadata)

        return {
            # Standard snake_case & camelCase for unified interoperability
            "event_id": self.event_id,
            "eventId": self.event_id,
            "sequence": self.sequence,
            "event_time": self.event_time or self.provider_timestamp or self.received_time,
            "eventTime": self.event_time or self.provider_timestamp or self.received_time,
            "received_time": self.received_time or self.received_timestamp,
            "receivedTime": self.received_time or self.received_timestamp,
            "receivedTimestamp": self.received_time or self.received_timestamp,
            "environment": env_str,
            "provider": self.provider,
            "domain": domain_str,
            "event_type": ev_type_str,
            "eventType": ev_type_str,
            "severity": self.severity,

            "bot_id": self.bot_id,
            "botId": self.bot_id,
            "bot_name": self.bot_name,
            "botName": self.bot_name,
            "strategy_id": self.strategy_id,
            "strategyId": self.strategy_id,
            "strategy_name": self.strategy_name,
            "strategyName": self.strategy_name,

            "symbol": self.symbol,
            "exchange": self.exchange,
            "timeframe": self.timeframe,
            "instrument_id": self.instrument_id or self.symbol,
            "instrumentId": self.instrument_id or self.symbol,
            "canonical_instrument_id": self.canonical_instrument_id or self.symbol,
            "canonicalInstrumentId": self.canonical_instrument_id or self.symbol,

            "account_id": self.account_id,
            "accountId": self.account_id,
            "order_id": self.order_id,
            "orderId": self.order_id,
            "trade_id": self.trade_id,
            "tradeId": self.trade_id,
            "position_id": self.position_id,
            "positionId": self.position_id,

            "side": self.side,
            "quantity": self.quantity,
            "market_price": self.market_price,
            "marketPrice": self.market_price,
            "entry_price": self.entry_price,
            "entryPrice": self.entry_price,
            "exit_price": self.exit_price,
            "exitPrice": self.exit_price,
            "stop_loss": self.stop_loss,
            "stopLoss": self.stop_loss,
            "take_profit": self.take_profit,
            "takeProfit": self.take_profit,

            "realized_pnl": self.realized_pnl,
            "realizedPnL": self.realized_pnl,
            "unrealized_pnl": self.unrealized_pnl,
            "unrealizedPnL": self.unrealized_pnl,
            "commission": self.commission,
            "fees": self.fees,
            "slippage": self.slippage,

            "strategy_score": self.strategy_score,
            "strategyScore": self.strategy_score,
            "confidence": self.confidence,
            "status": self.status,
            "decision_reason": self.decision_reason,
            "decisionReason": self.decision_reason,

            "error_code": self.error_code,
            "errorCode": self.error_code,
            "error_message": self.error_message,
            "errorMessage": self.error_message,
            "latency_ms": self.latency_ms,
            "latencyMs": self.latency_ms,
            "data_age_ms": self.data_age_ms,
            "dataAgeMs": self.data_age_ms,

            "correlation_id": self.correlation_id,
            "correlationId": self.correlation_id,
            "causation_id": self.causation_id,
            "causationId": self.causation_id,
            "idempotency_key": self.idempotency_key,
            "idempotencyKey": self.idempotency_key,

            "reconciliation_status": self.reconciliation_status,
            "reconciliationStatus": self.reconciliation_status,
            "metadata": self.metadata,
            "raw_payload": self.raw_payload,
            "rawPayload": self.raw_payload,
            "payload": combined_payload,
        }


@dataclass
class MarketDataEvent:
    provider: str
    instrument_id: str
    symbol: str
    underlying: Optional[str] = None
    expiry: Optional[str] = None
    strike: Optional[float] = None
    option_type: Optional[str] = None
    ltp: float = 0.0
    bid: float = 0.0
    ask: float = 0.0
    oi: float = 0.0
    volume: float = 0.0
    feed_age_ms: float = 0.0
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "provider": self.provider,
            "instrumentId": self.instrument_id,
            "symbol": self.symbol,
            "underlying": self.underlying,
            "expiry": self.expiry,
            "strike": self.strike,
            "optionType": self.option_type,
            "ltp": self.ltp,
            "bid": self.bid,
            "ask": self.ask,
            "oi": self.oi,
            "volume": self.volume,
            "feedAgeMs": self.feed_age_ms,
            "timestamp": self.timestamp,
        }




# =============================================================================
# 4. AUTHORITATIVE ACCOUNT & LEDGER MODELS
# =============================================================================

@dataclass
class BrokerAccount:
    provider: str
    broker: str
    account_id: str
    account_name: str
    environment: Environment = Environment.PAPER
    currency: str = "USD"
    cash_balance: float = 0.0
    available_cash: float = 0.0
    collateral: float = 0.0
    margin_used: float = 0.0
    available_margin: float = 0.0
    buying_power: float = 0.0
    realized_pnl: float = 0.0
    unrealized_pnl: float = 0.0
    fees: float = 0.0
    equity: float = 0.0
    positions_count: int = 0
    open_orders_count: int = 0
    last_updated: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "HEALTHY"
    status_message: str = "Synced"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "provider": self.provider,
            "broker": self.broker,
            "accountId": self.account_id,
            "accountName": self.account_name,
            "environment": self.environment.value,
            "currency": self.currency,
            "cashBalance": round(self.cash_balance, 2),
            "availableCash": round(self.available_cash, 2),
            "collateral": round(self.collateral, 2),
            "marginUsed": round(self.margin_used, 2),
            "availableMargin": round(self.available_margin, 2),
            "buyingPower": round(self.buying_power, 2),
            "realizedPnL": round(self.realized_pnl, 2),
            "unrealizedPnL": round(self.unrealized_pnl, 2),
            "fees": round(self.fees, 2),
            "equity": round(self.equity, 2),
            "positionsCount": self.positions_count,
            "openOrdersCount": self.open_orders_count,
            "lastUpdated": self.last_updated,
            "status": self.status,
            "statusMessage": self.status_message,
        }


@dataclass
class LedgerEntry:
    ledger_entry_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    provider: str = "PAPER"
    account_id: str = "default"
    environment: Environment = Environment.PAPER
    currency: str = "USD"
    amount: float = 0.0
    direction: LedgerDirection = LedgerDirection.CREDIT
    entry_type: LedgerEntryType = LedgerEntryType.ADJUSTMENT
    reason: str = ""
    reference_id: Optional[str] = None
    balance_after: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ledgerEntryId": self.ledger_entry_id,
            "timestamp": self.timestamp,
            "provider": self.provider,
            "accountId": self.account_id,
            "environment": self.environment.value,
            "currency": self.currency,
            "amount": round(self.amount, 2),
            "direction": self.direction.value,
            "entryType": self.entry_type.value,
            "reason": self.reason,
            "referenceId": self.reference_id,
            "balanceAfter": round(self.balance_after, 2),
        }


# =============================================================================
# 5. POSITIONS, ORDERS & EXECUTION MODELS
# =============================================================================

@dataclass
class RiskGateItem:
    gate_id: int
    name: str
    category: str
    status: str  # "ARMED" | "TRIGGERED" | "BYPASS" | "NOT_CONFIGURED"
    reason: str
    threshold: str
    current_value: str
    last_evaluation: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "gateId": self.gate_id,
            "name": self.name,
            "category": self.category,
            "status": self.status,
            "reason": self.reason,
            "threshold": self.threshold,
            "currentValue": self.current_value,
            "lastEvaluation": self.last_evaluation,
        }


@dataclass
class RiskGateReport:
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    overall_status: str = "ARMED"
    gates_evaluated: int = 20
    gates_armed: int = 20
    gates_triggered: int = 0
    gates: List[RiskGateItem] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "overallStatus": self.overall_status,
            "gatesEvaluated": self.gates_evaluated,
            "gatesArmed": self.gates_armed,
            "gatesTriggered": self.gates_triggered,
            "gates": [g.to_dict() for g in self.gates],
        }


@dataclass
class PositionItem:
    position_id: str = field(default_factory=lambda: f"POS-{uuid.uuid4().hex[:10].upper()}")
    provider: str = "PAPER"
    market_data_provider: str = "BINANCE_USDM"
    execution_broker: str = "PAPER_SIMULATOR"
    account_id: str = "default"
    environment: Environment = Environment.PAPER
    symbol: str = "BTC/USDT"
    canonical_instrument_id: str = "BTC/USDT:USDT"
    instrument_id: str = "BTCUSDT"
    exchange: str = "BINANCE"
    asset_class: str = "CRYPTO_PERPETUAL"
    strategy_id: Optional[str] = None
    bot_id: Optional[str] = None
    side: PositionSide = PositionSide.FLAT
    quantity: float = 0.0
    lot_size: float = 1.0
    entry_price: float = 0.0
    average_entry: float = 0.0
    mark_price: float = 0.0
    feed_age_ms: float = 0.0
    market_value: float = 0.0
    notional_value: float = 0.0
    realized_pnl: float = 0.0
    realized_pnl_scope: str = "TODAY"
    unrealized_pnl: float = 0.0
    margin_used: float = 0.0
    maintenance_margin: float = 0.0
    leverage: float = 1.0
    liquidation_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    r_multiple: Optional[float] = None
    greeks: Optional[Dict[str, float]] = None
    basis_info: Optional[Dict[str, Any]] = None
    currency: str = "USD"
    native_currency: str = "USD"
    reporting_currency: str = "USD"
    fx_rate: float = 1.0
    fx_provider: str = "DIRECT"
    fx_timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    opened_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    market_data_updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    source: str = "CENTRAL_REGISTRY"
    freshness: str = "LIVE"
    data_state: str = "LIVE"
    config_state: str = "CONFIGURED"
    config_reason: str = "Fully operational"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "positionId": self.position_id,
            "provider": self.provider,
            "marketDataProvider": self.market_data_provider,
            "executionBroker": self.execution_broker,
            "accountId": self.account_id,
            "environment": self.environment.value,
            "symbol": self.symbol,
            "canonicalInstrumentId": self.canonical_instrument_id,
            "instrumentId": self.instrument_id,
            "exchange": self.exchange,
            "assetClass": self.asset_class,
            "strategyId": self.strategy_id,
            "botId": self.bot_id,
            "side": self.side.value,
            "quantity": self.quantity,
            "lotSize": self.lot_size,
            "entryPrice": round(self.entry_price or self.average_entry, 4),
            "averageEntry": round(self.average_entry, 4),
            "markPrice": round(self.mark_price, 4),
            "feedAgeMs": round(self.feed_age_ms, 1),
            "marketValue": round(self.market_value, 2),
            "notionalValue": round(self.notional_value or self.market_value, 2),
            "realizedPnL": round(self.realized_pnl, 2),
            "realizedPnLScope": self.realized_pnl_scope,
            "unrealizedPnL": round(self.unrealized_pnl, 2),
            "marginUsed": round(self.margin_used, 2),
            "maintenanceMargin": round(self.maintenance_margin, 2),
            "leverage": self.leverage,
            "liquidationPrice": self.liquidation_price,
            "stopLoss": self.stop_loss,
            "takeProfit": self.take_profit,
            "rMultiple": self.r_multiple,
            "greeks": self.greeks,
            "basisInfo": self.basis_info,
            "currency": self.currency,
            "nativeCurrency": self.native_currency,
            "reportingCurrency": self.reporting_currency,
            "fxRate": self.fx_rate,
            "fxProvider": self.fx_provider,
            "fxTimestamp": self.fx_timestamp,
            "openedAt": self.opened_at,
            "updatedAt": self.updated_at,
            "marketDataUpdatedAt": self.market_data_updated_at,
            "source": self.source,
            "freshness": self.freshness,
            "dataState": self.data_state,
            "configState": self.config_state,
            "configReason": self.config_reason,
        }

    @property
    def market_price(self) -> float:
        return self.mark_price


@dataclass
class OrderItem:
    internal_order_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    provider: str = "PAPER"
    broker_order_id: Optional[str] = None
    account_id: str = "default"
    environment: Environment = Environment.PAPER
    instrument: str = "BTC/USDT"
    canonical_instrument_id: str = "BTC/USDT:USDT"
    side: OrderSide = OrderSide.BUY
    order_type: OrderType = OrderType.LIMIT
    quantity: float = 0.0
    filled_quantity: float = 0.0
    remaining_quantity: float = 0.0
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None
    avg_fill_price: Optional[float] = None
    status: OrderStatus = OrderStatus.PENDING
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    reject_reason: Optional[str] = None
    client_tag: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "internalOrderId": self.internal_order_id,
            "provider": self.provider,
            "brokerOrderId": self.broker_order_id,
            "accountId": self.account_id,
            "environment": self.environment.value,
            "instrument": self.instrument,
            "canonicalInstrumentId": self.canonical_instrument_id,
            "side": self.side.value,
            "orderType": self.order_type.value,
            "quantity": self.quantity,
            "filledQuantity": self.filled_quantity,
            "remainingQuantity": self.remaining_quantity,
            "limitPrice": self.limit_price,
            "stopPrice": self.stop_price,
            "avgFillPrice": self.avg_fill_price,
            "status": self.status.value,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
            "rejectReason": self.reject_reason,
            "clientTag": self.client_tag,
        }


@dataclass
class TradeFill:
    fill_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    internal_order_id: str = ""
    broker_order_id: Optional[str] = None
    provider: str = "PAPER"
    account_id: str = "default"
    environment: Environment = Environment.PAPER
    instrument: str = "BTC/USDT"
    side: OrderSide = OrderSide.BUY
    fill_price: float = 0.0
    fill_quantity: float = 0.0
    fee: float = 0.0
    fee_currency: str = "USD"
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "fillId": self.fill_id,
            "internalOrderId": self.internal_order_id,
            "brokerOrderId": self.broker_order_id,
            "provider": self.provider,
            "accountId": self.account_id,
            "environment": self.environment.value,
            "instrument": self.instrument,
            "side": self.side.value,
            "fillPrice": self.fill_price,
            "fillQuantity": self.fill_quantity,
            "fee": self.fee,
            "feeCurrency": self.fee_currency,
            "timestamp": self.timestamp,
        }


# =============================================================================
# 6. RECONCILIATION MODELS
# =============================================================================

@dataclass
class ReconciliationDriftItem:
    provider: str
    account_id: str
    environment: Environment
    entity_type: str  # "BALANCE" | "POSITION" | "ORDER"
    entity_id: str
    internal_value: Any
    provider_value: Any
    drift_amount: float = 0.0
    status: str = "DRIFT_DETECTED"
    detected_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "provider": self.provider,
            "accountId": self.account_id,
            "environment": self.environment.value,
            "entityType": self.entity_type,
            "entityId": self.entity_id,
            "internalValue": self.internal_value,
            "providerValue": self.provider_value,
            "driftAmount": self.drift_amount,
            "status": self.status,
            "detectedAt": self.detected_at,
        }


@dataclass
class ReconciliationReport:
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: ReconciliationStatus = ReconciliationStatus.HEALTHY
    accounts_audited: int = 0
    positions_audited: int = 0
    orders_audited: int = 0
    drifts_found: int = 0
    drifts: List[ReconciliationDriftItem] = field(default_factory=list)
    latency_ms: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "status": self.status.value,
            "accountsAudited": self.accounts_audited,
            "positionsAudited": self.positions_audited,
            "ordersAudited": self.orders_audited,
            "driftsFound": self.drifts_found,
            "drifts": [d.to_dict() for d in self.drifts],
            "latencyMs": self.latency_ms,
        }


# =============================================================================
# 10. QUALITY & OPTIONS DOMAIN MODELS
# =============================================================================

class QualityStatus(str, Enum):
    OK = "OK"
    DEGRADED = "DEGRADED"
    STALE = "STALE"
    INVALID = "INVALID"


@dataclass
class OptionGreeks:
    delta: float = 0.0
    gamma: float = 0.0
    theta: float = 0.0
    vega: float = 0.0
    rho: float = 0.0
    iv: float = 0.0

    def to_dict(self) -> Dict[str, float]:
        return {
            "delta": self.delta,
            "gamma": self.gamma,
            "theta": self.theta,
            "vega": self.vega,
            "rho": self.rho,
            "iv": self.iv,
        }


@dataclass
class OptionContractData:
    instrument_id: str
    symbol: str
    strike: float
    option_type: str  # 'CE' | 'PE'
    expiry: str
    ltp: float = 0.0
    bid: float = 0.0
    ask: float = 0.0
    iv: float = 0.0
    delta: float = 0.0
    gamma: float = 0.0
    theta: float = 0.0
    vega: float = 0.0
    rho: float = 0.0
    oi: float = 0.0
    oi_change: float = 0.0
    volume: float = 0.0
    feed_age_ms: float = 0.0
    provider: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "instrumentId": self.instrument_id,
            "symbol": self.symbol,
            "strike": self.strike,
            "optionType": self.option_type,
            "expiry": self.expiry,
            "ltp": self.ltp,
            "bid": self.bid,
            "ask": self.ask,
            "iv": self.iv,
            "delta": self.delta,
            "gamma": self.gamma,
            "theta": self.theta,
            "vega": self.vega,
            "rho": self.rho,
            "oi": self.oi,
            "oiChange": self.oi_change,
            "volume": self.volume,
            "feedAgeMs": self.feed_age_ms,
            "provider": self.provider,
        }


@dataclass
class OptionStrikeRow:
    strike: float
    call: Optional[OptionContractData] = None
    put: Optional[OptionContractData] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "strike": self.strike,
            "call": self.call.to_dict() if self.call else None,
            "put": self.put.to_dict() if self.put else None,
        }


@dataclass
class OptionChainSnapshot:
    underlying: str
    spot_price: float = 0.0
    expiry: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    pcr_oi: float = 1.0
    pcr_volume: float = 1.0
    atm_strike: float = 0.0
    atm_iv: float = 0.0
    max_pain: float = 0.0
    total_call_oi: float = 0.0
    total_put_oi: float = 0.0
    strikes: List[OptionStrikeRow] = field(default_factory=list)
    expiries: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "underlying": self.underlying,
            "spotPrice": self.spot_price,
            "spot_price": self.spot_price,
            "expiry": self.expiry,
            "timestamp": self.timestamp,
            "pcrOi": self.pcr_oi,
            "pcr_oi": self.pcr_oi,
            "pcrVolume": self.pcr_volume,
            "pcr_volume": self.pcr_volume,
            "atmStrike": self.atm_strike,
            "atm_strike": self.atm_strike,
            "atmIv": self.atm_iv,
            "atm_iv": self.atm_iv,
            "maxPain": self.max_pain,
            "max_pain": self.max_pain,
            "totalCallOi": self.total_call_oi,
            "total_call_oi": self.total_call_oi,
            "totalPutOi": self.total_put_oi,
            "total_put_oi": self.total_put_oi,
            "strikes": [s.to_dict() for s in self.strikes],
            "expiries": self.expiries,
        }

