"""
TradeIntent Data Contract
=========================
Standardized proposal schema emitted by the AI Strategy Agent.
The AI Strategy Agent produces TradeIntent proposals only; it never calls broker APIs directly.
"""

from __future__ import annotations

import uuid
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone


from enum import Enum


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


@dataclass
class TradeIntent:
    decisionId: str = field(default_factory=lambda: f"DEC-{uuid.uuid4().hex[:8].upper()}")
    instrumentId: str = ""
    symbol: str = ""
    exchange: str = "NSE"
    provider: str = "AUTO"  # DHAN, DELTA, FYERS, UPSTOX, SIMULATION
    action: str = "BUY"  # BUY, SELL, SQUARE_OFF, HOLD, NO_TRADE
    strategy: str = "INTRADAY_MOMENTUM"
    entryPrice: float = 0.0
    quantity: float = 1.0
    stopLoss: float = 0.0
    takeProfit: float = 0.0
    timeInForce: str = "DAY"  # DAY, IOC, GTC
    reason: str = ""
    confidence: float = 0.0  # 0.0 to 1.0 (Informational only, not auto-auth)
    marketRegime: str = "NORMAL"
    riskScore: float = 0.0
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    paperOnly: bool = True
    checkpointId: str = "MANUAL"
    executionDetails: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> TradeIntent:
        return cls(
            decisionId=data.get("decisionId") or f"DEC-{uuid.uuid4().hex[:8].upper()}",
            instrumentId=data.get("instrumentId", ""),
            symbol=data.get("symbol", ""),
            exchange=data.get("exchange", "NSE"),
            provider=data.get("provider", "AUTO"),
            action=data.get("action", "BUY"),
            strategy=data.get("strategy", "INTRADAY_MOMENTUM"),
            entryPrice=float(data.get("entryPrice", 0.0)),
            quantity=float(data.get("quantity", 1.0)),
            stopLoss=float(data.get("stopLoss", 0.0)),
            takeProfit=float(data.get("takeProfit", 0.0)),
            timeInForce=data.get("timeInForce", "DAY"),
            reason=data.get("reason", ""),
            confidence=float(data.get("confidence", 0.0)),
            marketRegime=data.get("marketRegime", "NORMAL"),
            riskScore=float(data.get("riskScore", 0.0)),
            timestamp=data.get("timestamp") or datetime.now(timezone.utc).isoformat(),
            paperOnly=bool(data.get("paperOnly", True)),
            checkpointId=data.get("checkpointId", "MANUAL"),
            executionDetails=data.get("executionDetails") or {},
        )
