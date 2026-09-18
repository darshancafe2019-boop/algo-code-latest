"""
Quant.OS Bot Deployment Control Plane Models & Contracts
========================================================
Authoritative type definitions for Bot Deployment, Market Data Contracts,
Data Freshness SLAs, Capital Reservations, Strategy Rule Nodes,
Explainable Decisions, Signal Lifecycles, and Activation Scorecards.

Invariants:
1. Bots DO NOT own broker balance, market feeds, order books, positions, orders, or P&L.
2. Every Bot config references authoritative QuantDataCore domains.
3. Every order produced by a bot requires an Idempotency Key and passes through RiskDomain.
4. Capital reservations prevent fleet-wide over-allocation of broker buying power.
"""

from __future__ import annotations

import enum
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union

from src.data_core.models import Environment


class BotLifecycleState(str, enum.Enum):
    DRAFT = "DRAFT"
    VALIDATING = "VALIDATING"
    READY = "READY"
    STARTING = "STARTING"
    RUNNING = "RUNNING"
    PAUSING = "PAUSING"
    PAUSED = "PAUSED"
    DATA_STALE = "DATA_STALE"
    BROKER_OFFLINE = "BROKER_OFFLINE"
    RISK_BLOCKED = "RISK_BLOCKED"
    STOPPING = "STOPPING"
    STOPPED = "STOPPED"
    ERROR = "ERROR"
    KILLED = "KILLED"


class SignalLifecycleState(str, enum.Enum):
    NO_SIGNAL = "NO_SIGNAL"
    CANDIDATE = "CANDIDATE"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"
    EXECUTED = "EXECUTED"


class StaleDataPolicy(str, enum.Enum):
    PAUSE = "PAUSE"
    BLOCK_ENTRY = "BLOCK_ENTRY"
    CLOSE_ONLY = "CLOSE_ONLY"
    STOP = "STOP"


@dataclass
class MarketDataContract:
    """Declared market data requirements for a bot strategy."""
    ltp: bool = True
    quotes: bool = True
    depth_tier: str = "FULL_D5"  # 'LTPC', 'FULL_D5', 'FULL_D20', 'L200'
    oi: bool = False
    funding: bool = False
    greeks: bool = False
    timeframes: List[str] = field(default_factory=lambda: ["5m"])

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class DataFreshnessContract:
    """SLA requirements for tick, depth, and candle staleness."""
    max_tick_age_ms: float = 2000.0
    max_depth_age_ms: float = 3000.0
    max_candle_age_ms: float = 60000.0
    stale_policy: StaleDataPolicy = StaleDataPolicy.BLOCK_ENTRY

    def to_dict(self) -> Dict[str, Any]:
        return {
            "maxTickAgeMs": self.max_tick_age_ms,
            "maxDepthAgeMs": self.max_depth_age_ms,
            "maxCandleAgeMs": self.max_candle_age_ms,
            "stalePolicy": self.stale_policy.value,
        }


@dataclass
class CapitalReservation:
    """Immutable capital allocation record held by the central CapitalLedger."""
    reservation_id: str = field(default_factory=lambda: f"res_{uuid.uuid4().hex[:8]}")
    bot_id: str = ""
    account_id: str = ""
    provider: str = ""
    environment: Environment = Environment.PAPER
    currency: str = "USDT"
    requested_amount: float = 0.0
    approved_amount: float = 0.0
    reserved_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    released_at: Optional[str] = None
    status: str = "ACTIVE"  # 'ACTIVE', 'RELEASED', 'REJECTED'

    def to_dict(self) -> Dict[str, Any]:
        return {
            "reservationId": self.reservation_id,
            "botId": self.bot_id,
            "accountId": self.account_id,
            "provider": self.provider,
            "environment": self.environment.value,
            "currency": self.currency,
            "requestedAmount": self.requested_amount,
            "approvedAmount": self.approved_amount,
            "reservedAt": self.reserved_at,
            "releasedAt": self.released_at,
            "status": self.status,
        }


@dataclass
class StrategyRuleNode:
    """Single rule evaluation node (e.g. EMA9 CROSS_ABOVE EMA21)."""
    id: str
    left_operand: str  # Indicator, Price, or OrderFlow variable
    operator: str      # '>', '<', '>=', '<=', '==', '!=', 'CROSS_ABOVE', 'CROSS_BELOW'
    right_type: str    # 'THRESHOLD', 'INDICATOR', 'PRICE'
    right_value: Optional[float] = None
    right_operand: Optional[str] = None
    timeframe: str = "5m"
    is_mandatory: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ExplainableDecisionRule:
    """Audit entry for why a specific rule passed or failed."""
    rule_id: str
    description: str
    input_value: Any
    expected_value: Any
    passed: bool


@dataclass
class ExplainableDecision:
    """Explainable decision snapshot: 'WHY DID THE BOT TRADE / NOT TRADE?'."""
    decision_id: str = field(default_factory=lambda: f"dec_{uuid.uuid4().hex[:8]}")
    bot_id: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    market_snapshot_id: str = ""
    rules_evaluated: List[ExplainableDecisionRule] = field(default_factory=list)
    risk_gates_passed: bool = True
    risk_summary: str = "All Risk Gates Armed"
    final_decision: str = "NO_TRADE"  # 'BUY', 'SELL', 'NO_TRADE', 'HOLD', 'EXIT'
    summary: str = "Criteria not met"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "decisionId": self.decision_id,
            "botId": self.bot_id,
            "timestamp": self.timestamp,
            "marketSnapshotId": self.market_snapshot_id,
            "rulesEvaluated": [asdict(r) for r in self.rules_evaluated],
            "riskGatesPassed": self.risk_gates_passed,
            "riskSummary": self.risk_summary,
            "finalDecision": self.final_decision,
            "summary": self.summary,
        }


@dataclass
class SignalItem:
    """Explicit Signal lifecycle item."""
    signal_id: str = field(default_factory=lambda: f"sig_{uuid.uuid4().hex[:8]}")
    bot_id: str = ""
    instrument_id: str = ""
    canonical_instrument_id: str = ""
    side: str = "BUY"  # 'BUY', 'SELL'
    state: SignalLifecycleState = SignalLifecycleState.NO_SIGNAL
    confidence: float = 1.0
    generated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: str = ""
    market_snapshot_id: str = ""
    conditions_passed: List[str] = field(default_factory=list)
    conditions_failed: List[str] = field(default_factory=list)
    idempotency_key: str = field(default_factory=lambda: str(uuid.uuid4()))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "signalId": self.signal_id,
            "botId": self.bot_id,
            "instrumentId": self.instrument_id,
            "canonicalInstrumentId": self.canonical_instrument_id,
            "side": self.side,
            "state": self.state.value,
            "confidence": self.confidence,
            "generatedAt": self.generated_at,
            "expiresAt": self.expires_at,
            "marketSnapshotId": self.market_snapshot_id,
            "conditionsPassed": self.conditions_passed,
            "conditionsFailed": self.conditions_failed,
            "idempotencyKey": self.idempotency_key,
        }


@dataclass
class ScorecardGate:
    name: str
    status: str  # 'PASS' | 'FAIL' | 'WARNING'
    reason: str


@dataclass
class ActivationScorecard:
    """Objective 7-Gate Activation Readiness Scorecard."""
    data_gate: ScorecardGate = field(default_factory=lambda: ScorecardGate("DATA", "FAIL", "Feed not validated"))
    strategy_gate: ScorecardGate = field(default_factory=lambda: ScorecardGate("STRATEGY", "FAIL", "No rules configured"))
    risk_gate: ScorecardGate = field(default_factory=lambda: ScorecardGate("RISK", "FAIL", "Risk bounds not configured"))
    capital_gate: ScorecardGate = field(default_factory=lambda: ScorecardGate("CAPITAL", "FAIL", "Capital unreserved"))
    oms_gate: ScorecardGate = field(default_factory=lambda: ScorecardGate("OMS", "FAIL", "OMS unreachable"))
    broker_gate: ScorecardGate = field(default_factory=lambda: ScorecardGate("BROKER", "FAIL", "Broker unauthenticated"))
    paper_test_gate: ScorecardGate = field(default_factory=lambda: ScorecardGate("PAPER_TEST", "FAIL", "Paper verification pending"))

    @property
    def is_ready_for_activation(self) -> bool:
        gates = [
            self.data_gate,
            self.strategy_gate,
            self.risk_gate,
            self.capital_gate,
            self.oms_gate,
            self.broker_gate,
            self.paper_test_gate,
        ]
        return all(g.status == "PASS" for g in gates)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "dataGate": asdict(self.data_gate),
            "strategyGate": asdict(self.strategy_gate),
            "riskGate": asdict(self.risk_gate),
            "capitalGate": asdict(self.capital_gate),
            "omsGate": asdict(self.oms_gate),
            "brokerGate": asdict(self.broker_gate),
            "paperTestGate": asdict(self.paper_test_gate),
            "isReadyForActivation": self.is_ready_for_activation,
        }


@dataclass
class BotDeploymentItem:
    """Authoritative Quant.OS Bot Instance Deployment Contract."""
    bot_id: str
    name: str
    description: str = ""
    group_name: str = "Alpha Fleet"
    tags: List[str] = field(default_factory=list)
    owner: str = "admin"
    version: int = 1
    environment: Environment = Environment.PAPER
    state: BotLifecycleState = BotLifecycleState.DRAFT
    
    # Provider & Routing Separation
    market_data_provider: str = "UPSTOX"
    fallback_market_data_provider: Optional[str] = None
    execution_broker: str = "PAPER"
    account_id: str = "default"
    currency: str = "INR"

    # Universe
    canonical_instrument_id: str = "NSE:NIFTY26MARFUT"
    display_symbol: str = "NIFTY FUT"
    asset_class: str = "FUTURES"

    # Contracts
    market_data_contract: MarketDataContract = field(default_factory=MarketDataContract)
    data_freshness_contract: DataFreshnessContract = field(default_factory=DataFreshnessContract)
    
    # Capital & Risk
    capital_allocation: float = 50000.0
    reservation_id: Optional[str] = None
    risk_per_trade_pct: float = 1.0
    max_position_size: float = 50.0
    max_daily_loss: float = 2000.0
    max_drawdown_pct: float = 5.0
    stop_loss_pct: float = 1.0
    take_profit_pct: float = 2.0
    trailing_stop_pct: Optional[float] = 0.5
    break_even_pct: Optional[float] = 1.0

    # Strategy & Execution
    strategy_id: str = "MOMENTUM_CONFLUENCE"
    rules: List[StrategyRuleNode] = field(default_factory=list)
    order_type: str = "MARKET"
    max_slippage_pct: float = 0.2
    retry_limit: int = 3
    timeout_seconds: float = 10.0

    # Health & Telemetry
    feed_age_ms: float = 0.0
    last_tick_price: float = 0.0
    last_decision: str = "INITIALIZED"
    positions_count: int = 0
    open_orders_count: int = 0
    realized_pnl: float = 0.0
    unrealized_pnl: float = 0.0
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "botId": self.bot_id,
            "name": self.name,
            "description": self.description,
            "groupName": self.group_name,
            "tags": self.tags,
            "owner": self.owner,
            "version": self.version,
            "environment": self.environment.value,
            "state": self.state.value,
            "marketDataProvider": self.market_data_provider,
            "fallbackMarketDataProvider": self.fallback_market_data_provider,
            "executionBroker": self.execution_broker,
            "accountId": self.account_id,
            "currency": self.currency,
            "canonicalInstrumentId": self.canonical_instrument_id,
            "displaySymbol": self.display_symbol,
            "assetClass": self.asset_class,
            "marketDataContract": self.market_data_contract.to_dict(),
            "dataFreshnessContract": self.data_freshness_contract.to_dict(),
            "capitalAllocation": self.capital_allocation,
            "reservationId": self.reservation_id,
            "riskPerTradePct": self.risk_per_trade_pct,
            "maxPositionSize": self.max_position_size,
            "maxDailyLoss": self.max_daily_loss,
            "maxDrawdownPct": self.max_drawdown_pct,
            "stopLossPct": self.stop_loss_pct,
            "takeProfitPct": self.take_profit_pct,
            "trailingStopPct": self.trailing_stop_pct,
            "breakEvenPct": self.break_even_pct,
            "strategyId": self.strategy_id,
            "rules": [r.to_dict() for r in self.rules],
            "orderType": self.order_type,
            "maxSlippagePct": self.max_slippage_pct,
            "retryLimit": self.retry_limit,
            "timeoutSeconds": self.timeout_seconds,
            "feedAgeMs": self.feed_age_ms,
            "lastTickPrice": self.last_tick_price,
            "lastDecision": self.last_decision,
            "positionsCount": self.positions_count,
            "openOrdersCount": self.open_orders_count,
            "realizedPnL": self.realized_pnl,
            "unrealizedPnL": self.unrealized_pnl,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
        }


@dataclass
class StrategyLegItem:
    """Canonical representation of an individual leg within a multi-leg options/futures strategy."""
    leg_id: str = field(default_factory=lambda: f"leg_{uuid.uuid4().hex[:8]}")
    canonical_instrument_id: str = ""
    provider_instrument_id: str = ""
    underlying_canonical_id: str = ""
    underlying_symbol: str = ""
    exchange: str = "NSE"
    segment: str = "NSE_FNO"
    expiry: str = ""
    strike: float = 0.0
    option_type: str = "CE"  # 'CE', 'PE', 'CALL', 'PUT', 'FUT', 'EQUITY'
    side: str = "BUY"        # 'BUY', 'SELL'
    quantity: float = 1.0
    lots: int = 1
    lot_size: float = 50.0
    order_type: str = "MARKET"
    limit_price: Optional[float] = None
    market_data_provider: str = "UPSTOX"
    quote: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "legId": self.leg_id,
            "canonicalInstrumentId": self.canonical_instrument_id,
            "providerInstrumentId": self.provider_instrument_id,
            "underlyingCanonicalId": self.underlying_canonical_id,
            "underlyingSymbol": self.underlying_symbol,
            "exchange": self.exchange,
            "segment": self.segment,
            "expiry": self.expiry,
            "strike": self.strike,
            "optionType": self.option_type,
            "side": self.side,
            "quantity": self.quantity,
            "lots": self.lots,
            "lotSize": self.lot_size,
            "orderType": self.order_type,
            "limitPrice": self.limit_price,
            "marketDataProvider": self.market_data_provider,
            "quote": self.quote,
        }


@dataclass
class DefinedRiskMetrics:
    """Mathematical metrics for defined-risk multi-leg option combinations."""
    net_premium: float = 0.0          # Net debit (-ve) or credit (+ve)
    max_profit: float = 0.0
    max_loss: float = 0.0
    breakeven_points: List[float] = field(default_factory=list)
    required_margin: float = 0.0
    reward_to_risk_ratio: float = 0.0
    estimated_fees: float = 0.0
    estimated_slippage_bps: float = 5.0
    formula_notes: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "netPremium": self.net_premium,
            "maxProfit": self.max_profit,
            "maxLoss": self.max_loss,
            "breakevenPoints": self.breakeven_points,
            "requiredMargin": self.required_margin,
            "rewardToRiskRatio": self.reward_to_risk_ratio,
            "estimatedFees": self.estimated_fees,
            "estimatedSlippageBps": self.estimated_slippage_bps,
            "formulaNotes": self.formula_notes,
        }


@dataclass
class DepthLevelItem:
    """Individual depth level entry."""
    price: float
    quantity: float
    orders_count: int = 1

    def to_dict(self) -> Dict[str, Any]:
        return {"price": self.price, "quantity": self.quantity, "ordersCount": self.orders_count}


@dataclass
class OrderBookAnalytics:
    """Top liquidity, order flow imbalance, and wall detection for an instrument."""
    instrument_id: str
    provider: str
    best_bid: float = 0.0
    best_ask: float = 0.0
    spread_abs: float = 0.0
    spread_bps: float = 0.0
    total_bid_depth: float = 0.0
    total_ask_depth: float = 0.0
    depth_imbalance_pct: float = 0.0  # (bid - ask) / (bid + ask) * 100
    bid_wall: Optional[Dict[str, Any]] = None
    ask_wall: Optional[Dict[str, Any]] = None
    most_active_depth_level: float = 0.0
    recent_large_trades: List[Dict[str, Any]] = field(default_factory=list)
    liquidity_added_velocity: float = 0.0
    liquidity_removed_velocity: float = 0.0
    feed_age_ms: float = 0.0
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "instrumentId": self.instrument_id,
            "provider": self.provider,
            "bestBid": self.best_bid,
            "bestAsk": self.best_ask,
            "spreadAbs": self.spread_abs,
            "spreadBps": self.spread_bps,
            "totalBidDepth": self.total_bid_depth,
            "totalAskDepth": self.total_ask_depth,
            "depthImbalancePct": self.depth_imbalance_pct,
            "bidWall": self.bid_wall,
            "askWall": self.ask_wall,
            "mostActiveDepthLevel": self.most_active_depth_level,
            "recentLargeTrades": self.recent_large_trades,
            "liquidityAddedVelocity": self.liquidity_added_velocity,
            "liquidityRemovedVelocity": self.liquidity_removed_velocity,
            "feedAgeMs": self.feed_age_ms,
            "timestamp": self.timestamp,
        }


@dataclass
class PreflightGateItem:
    """Individual objective deployment validation gate with structured explanation."""
    gate_id: str
    name: str
    category: str  # 'INTEGRITY', 'STRATEGY', 'MARKET_DATA', 'ACCOUNT', 'RISK', 'OMS'
    status: str    # 'PASS', 'FAIL', 'WARNING', 'NOT_REQUIRED'
    expected: str = ""
    actual: str = ""
    source: str = ""
    correction: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "gateId": self.gate_id,
            "name": self.name,
            "category": self.category,
            "status": self.status,
            "expected": self.expected,
            "actual": self.actual,
            "source": self.source,
            "correction": self.correction,
        }


@dataclass
class PreflightGateReport:
    """Complete 16-Gate pre-flight deployment readiness audit report."""
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    bot_id: str = ""
    is_deployable: bool = False
    total_gates: int = 16
    passed_gates: int = 0
    failed_gates: int = 0
    warning_gates: int = 0
    gates: List[PreflightGateItem] = field(default_factory=list)
    blocking_reasons: List[str] = field(default_factory=list)
    defined_risk_metrics: Optional[DefinedRiskMetrics] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "botId": self.bot_id,
            "isDeployable": self.is_deployable,
            "totalGates": self.total_gates,
            "passedGates": self.passed_gates,
            "failedGates": self.failed_gates,
            "warningGates": self.warning_gates,
            "gates": [g.to_dict() for g in self.gates],
            "blockingReasons": self.blocking_reasons,
            "definedRiskMetrics": self.defined_risk_metrics.to_dict() if self.defined_risk_metrics else None,
        }


@dataclass
class BotDeploymentSpec:
    """
    Canonical Strategy Deployment Specification.
    Single authoritative contract containing all fields required to deploy, validate, and execute a bot.
    """
    bot_id: str = field(default_factory=lambda: f"bot_{uuid.uuid4().hex[:8]}")
    bot_version: str = "v1.0.0"
    bot_name: str = "NIFTY Directional Strategy Bot"
    description: str = ""
    environment: Environment = Environment.PAPER
    strategy_type: str = "BULL_CALL_SPREAD"  # 'BULL_CALL_SPREAD', 'BEAR_PUT_SPREAD', 'IRON_CONDOR', 'STRADDLE', etc.
    underlying_canonical_id: str = "NSE:NIFTY50"
    underlying_symbol: str = "NIFTY"
    expiry: str = "2026-03-27"
    legs: List[StrategyLegItem] = field(default_factory=list)
    market_data_provider: str = "UPSTOX"
    fallback_market_data_provider: Optional[str] = None
    execution_broker: str = "PAPER"
    execution_account_id: str = "paper_primary"
    currency: str = "INR"
    capital_allocation: float = 50000.0
    capital_reservation_id: Optional[str] = None
    market_data_contract: MarketDataContract = field(default_factory=MarketDataContract)
    data_freshness_contract: DataFreshnessContract = field(default_factory=DataFreshnessContract)
    stop_loss_pct: float = 2.0
    take_profit_pct: float = 5.0
    trailing_stop_pct: float = 0.0
    max_slippage_pct: float = 0.5
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    validated_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "botId": self.bot_id,
            "botVersion": self.bot_version,
            "botName": self.bot_name,
            "description": self.description,
            "environment": self.environment.value,
            "strategyType": self.strategy_type,
            "underlyingCanonicalId": self.underlying_canonical_id,
            "underlyingSymbol": self.underlying_symbol,
            "expiry": self.expiry,
            "legs": [leg.to_dict() for leg in self.legs],
            "marketDataProvider": self.market_data_provider,
            "fallbackMarketDataProvider": self.fallback_market_data_provider,
            "executionBroker": self.execution_broker,
            "executionAccountId": self.execution_account_id,
            "currency": self.currency,
            "capitalAllocation": self.capital_allocation,
            "capitalReservationId": self.capital_reservation_id,
            "marketDataContract": self.market_data_contract.to_dict(),
            "dataFreshnessContract": self.data_freshness_contract.to_dict(),
            "stopLossPct": self.stop_loss_pct,
            "takeProfitPct": self.take_profit_pct,
            "trailingStopPct": self.trailing_stop_pct,
            "maxSlippagePct": self.max_slippage_pct,
            "createdAt": self.created_at,
            "validatedAt": self.validated_at,
        }

