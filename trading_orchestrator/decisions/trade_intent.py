"""
TradeIntent Data Contract
=========================
Standardized proposal schema emitted by the AI Strategy Agent.
The AI Strategy Agent produces TradeIntent proposals only; it never calls broker APIs directly.
"""

from __future__ import annotations

import uuid
import hashlib
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone
from enum import Enum


class DecisionType(str, Enum):
    NO_TRADE = "NO_TRADE"
    WATCH = "WATCH"
    PROPOSE_ENTRY = "PROPOSE_ENTRY"
    PROPOSE_EXIT = "PROPOSE_EXIT"
    MANAGE = "MANAGE"


class ActionType(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    SQUARE_OFF = "SQUARE_OFF"
    HOLD = "HOLD"
    NO_TRADE = "NO_TRADE"


class TimeInForce(str, Enum):
    DAY = "DAY"
    IOC = "IOC"
    GTC = "GTC"


class DataQualityStatus(str, Enum):
    FRESH = "FRESH"
    STALE = "STALE"
    UNAVAILABLE = "UNAVAILABLE"


@dataclass
class TradeIntent:
    decisionId: str = field(default_factory=lambda: f"DEC-{uuid.uuid4().hex[:8].upper()}")
    decision: str = "PROPOSE_ENTRY"  # NO_TRADE, WATCH, PROPOSE_ENTRY, PROPOSE_EXIT, MANAGE
    instrumentId: str = ""
    symbol: str = ""
    exchange: str = "NSE"
    broker: str = "PAPER"
    brokerAccountId: str = "DEFAULT"
    marketDataSource: str = "AUTO"  # DHAN, DELTA, UPSTOX, BINANCE, AUTO
    provider: str = "AUTO"
    action: str = "BUY"  # BUY, SELL, SQUARE_OFF, HOLD, NO_TRADE
    side: str = "BUY"
    strategy: str = "INTRADAY_MOMENTUM"
    strategyId: str = "STRAT_MOMENTUM_v1"
    strategyVersion: str = "1.0.0"
    entryPrice: float = 0.0
    quantity: float = 1.0
    stopLoss: float = 0.0
    takeProfit: float = 0.0
    expiry: Optional[str] = None
    strike: Optional[float] = None
    optionType: Optional[str] = None  # CE, PE
    timeInForce: str = "DAY"
    validityWindowSec: int = 300
    reason: str = ""
    riskExplanation: str = ""
    confidence: float = 0.0  # 0.0 to 1.0 (Informational only, not auto-auth)
    marketRegime: str = "NORMAL"
    riskScore: float = 0.0
    dataQualityStatus: str = "FRESH"  # FRESH, STALE, UNAVAILABLE
    evidenceIds: List[str] = field(default_factory=list)
    sourceTimestamps: Dict[str, str] = field(default_factory=dict)
    idempotencyKey: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    paperOnly: bool = True
    checkpointId: str = "MANUAL"
    executionDetails: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if not self.side:
            self.side = self.action
        if not self.action:
            self.action = self.side
        if not self.provider:
            self.provider = self.marketDataSource
        if not self.idempotencyKey:
            raw = f"{self.broker}:{self.brokerAccountId}:{self.strategyId}:{self.symbol}:{self.instrumentId}:{self.side}:{self.checkpointId}:{self.decisionId}"
            self.idempotencyKey = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> TradeIntent:
        return cls(
            decisionId=data.get("decisionId") or f"DEC-{uuid.uuid4().hex[:8].upper()}",
            decision=data.get("decision") or data.get("decision_type", "PROPOSE_ENTRY"),
            instrumentId=data.get("instrumentId") or data.get("instrument_id", ""),
            symbol=data.get("symbol", ""),
            exchange=data.get("exchange", "NSE"),
            broker=data.get("broker", "PAPER"),
            brokerAccountId=data.get("brokerAccountId") or data.get("broker_account_id", "DEFAULT"),
            marketDataSource=data.get("marketDataSource") or data.get("market_data_source") or data.get("provider", "AUTO"),
            provider=data.get("provider", "AUTO"),
            action=data.get("action", "BUY"),
            side=data.get("side") or data.get("action", "BUY"),
            strategy=data.get("strategy", "INTRADAY_MOMENTUM"),
            strategyId=data.get("strategyId") or data.get("strategy_id", "STRAT_MOMENTUM_v1"),
            strategyVersion=data.get("strategyVersion") or data.get("strategy_version", "1.0.0"),
            entryPrice=float(data.get("entryPrice") or data.get("entry_price", 0.0)),
            quantity=float(data.get("quantity", 1.0)),
            stopLoss=float(data.get("stopLoss") or data.get("stop_loss", 0.0)),
            takeProfit=float(data.get("takeProfit") or data.get("take_profit", 0.0)),
            expiry=data.get("expiry"),
            strike=float(data.get("strike")) if data.get("strike") is not None else None,
            optionType=data.get("optionType") or data.get("option_type"),
            timeInForce=data.get("timeInForce") or data.get("time_in_force", "DAY"),
            validityWindowSec=int(data.get("validityWindowSec") or data.get("validity_window_sec", 300)),
            reason=data.get("reason", ""),
            riskExplanation=data.get("riskExplanation") or data.get("risk_explanation", ""),
            confidence=float(data.get("confidence", 0.0)),
            marketRegime=data.get("marketRegime") or data.get("market_regime", "NORMAL"),
            riskScore=float(data.get("riskScore") or data.get("risk_score", 0.0)),
            dataQualityStatus=data.get("dataQualityStatus") or data.get("data_quality_status", "FRESH"),
            evidenceIds=data.get("evidenceIds") or data.get("evidence_ids", []),
            sourceTimestamps=data.get("sourceTimestamps") or data.get("source_timestamps", {}),
            idempotencyKey=data.get("idempotencyKey") or data.get("idempotency_key", ""),
            timestamp=data.get("timestamp") or datetime.now(timezone.utc).isoformat(),
            paperOnly=bool(data.get("paperOnly", True)),
            checkpointId=data.get("checkpointId") or data.get("checkpoint_id", "MANUAL"),
            executionDetails=data.get("executionDetails") or data.get("execution_details", {}),
        )
