"""
Canonical Option Order Intent Model & Validation Specification
==============================================================
Centralized data model for all option order actions across Quant.OS.
Enforces rigorous validation, type coercions, and serialization.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Optional, Literal, Dict, Any


OptionTypeLiteral = Literal["CALL", "PUT"]
OrderSideLiteral = Literal["BUY", "SELL"]
OrderTypeLiteral = Literal["MARKET", "LIMIT", "SL", "SL-M"]
ProductTypeLiteral = Literal["INTRADAY", "DELIVERY", "NORMAL", "MARGIN"]
TradingModeLiteral = Literal["PAPER", "LIVE"]


@dataclass
class OptionOrderIntent:
    """
    Canonical Option Order Intent representing a single direct option order action.
    """
    broker: str
    exchange: str
    underlying: str
    securityId: str
    tradingSymbol: str
    expiry: str
    strike: float
    optionType: OptionTypeLiteral
    side: OrderSideLiteral
    quantity: float
    lots: int
    lotSize: int
    orderType: OrderTypeLiteral = "MARKET"
    price: float = 0.0
    triggerPrice: Optional[float] = None
    stopLoss: Optional[float] = None
    target: Optional[float] = None
    productType: ProductTypeLiteral = "INTRADAY"
    mode: TradingModeLiteral = "PAPER"
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    # Ancillary execution & telemetry fields (optional, strictly non-secret)
    clientOrderId: Optional[str] = None
    correlationId: Optional[str] = None
    ltp: Optional[float] = None
    bid: Optional[float] = None
    ask: Optional[float] = None
    iv: Optional[float] = None
    oi: Optional[float] = None
    quoteStatus: Optional[str] = "LIVE"

    def __post_init__(self):
        # Normalize fields
        self.broker = str(self.broker or "PAPER").strip().upper()
        self.exchange = str(self.exchange or "NSE").strip().upper()
        self.underlying = str(self.underlying or "").strip().upper()
        self.securityId = str(self.securityId or "").strip()
        self.tradingSymbol = str(self.tradingSymbol or "").strip()
        self.expiry = str(self.expiry or "").strip()
        self.strike = float(self.strike)

        # Normalize optionType
        opt_type = str(self.optionType or "").strip().upper()
        if opt_type in ("CE", "CALL"):
            self.optionType = "CALL"
        elif opt_type in ("PE", "PUT"):
            self.optionType = "PUT"
        else:
            raise ValueError(f"Invalid optionType '{self.optionType}'. Must be 'CALL' or 'PUT'.")

        # Normalize side
        raw_side = str(self.side or "").strip().upper()
        if raw_side in ("BUY", "LONG"):
            self.side = "BUY"
        elif raw_side in ("SELL", "SHORT"):
            self.side = "SELL"
        else:
            raise ValueError(f"Invalid side '{self.side}'. Must be 'BUY' or 'SELL'.")

        self.lots = max(1, int(self.lots))
        self.lotSize = max(1, int(self.lotSize))
        if self.quantity <= 0:
            self.quantity = float(self.lots * self.lotSize)
        else:
            self.quantity = float(self.quantity)

        # Normalize orderType
        ord_type = str(self.orderType or "MARKET").strip().upper()
        if ord_type in ("LIMIT", "LMT"):
            self.orderType = "LIMIT"
        elif ord_type in ("SL", "STOP_LOSS", "STOP_LIMIT"):
            self.orderType = "SL"
        elif ord_type in ("SL-M", "SLM", "STOP_LOSS_MARKET"):
            self.orderType = "SL-M"
        else:
            self.orderType = "MARKET"

        self.price = float(self.price or 0.0)
        if self.triggerPrice is not None:
            self.triggerPrice = float(self.triggerPrice)
        if self.stopLoss is not None:
            self.stopLoss = float(self.stopLoss)
        if self.target is not None:
            self.target = float(self.target)

        # Normalize productType
        prod_type = str(self.productType or "INTRADAY").strip().upper()
        if prod_type in ("DELIVERY", "CNC"):
            self.productType = "DELIVERY"
        elif prod_type in ("NORMAL", "NRML"):
            self.productType = "NORMAL"
        elif prod_type in ("MARGIN", "MTF"):
            self.productType = "MARGIN"
        else:
            self.productType = "INTRADAY"

        # Normalize mode
        raw_mode = str(self.mode or "PAPER").strip().upper()
        self.mode = "LIVE" if raw_mode == "LIVE" else "PAPER"

        if not self.clientOrderId:
            self.clientOrderId = f"OPT_{self.broker}_{int(time.time() * 1000)}"
        if not self.correlationId:
            self.correlationId = self.clientOrderId

    def to_dict(self) -> Dict[str, Any]:
        """Returns standard serialized dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> OptionOrderIntent:
        """Parses and standardizes incoming dictionary."""
        # Normalize key naming variations (camelCase and snake_case)
        broker = data.get("broker") or data.get("provider") or "PAPER"
        exchange = data.get("exchange") or data.get("exchange_segment") or ("DELTA" if "DELTA" in str(broker).upper() else "NSE")
        underlying = data.get("underlying") or ""
        security_id = str(data.get("securityId") or data.get("security_id") or data.get("instrumentId") or data.get("instrument_id") or "")
        trading_symbol = data.get("tradingSymbol") or data.get("trading_symbol") or data.get("symbol") or ""
        expiry = str(data.get("expiry") or "")
        strike = float(data.get("strike", 0.0))

        raw_opt = data.get("optionType") or data.get("option_type") or ("CALL" if "CE" in trading_symbol or "CALL" in trading_symbol else "PUT")
        raw_side = data.get("side") or data.get("direction") or "BUY"

        lots = int(data.get("lots", 1))
        lot_size = int(data.get("lotSize") or data.get("lot_size") or 1)
        quantity = float(data.get("quantity", lots * lot_size))

        order_type = data.get("orderType") or data.get("order_type") or "MARKET"
        price = float(data.get("price", 0.0))
        trigger_price = float(data.get("triggerPrice") or data.get("trigger_price")) if (data.get("triggerPrice") or data.get("trigger_price")) is not None else None
        stop_loss = float(data.get("stopLoss") or data.get("stop_loss")) if (data.get("stopLoss") or data.get("stop_loss")) is not None else None
        target = float(data.get("target") or data.get("take_profit") or data.get("takeProfit")) if (data.get("target") or data.get("take_profit") or data.get("takeProfit")) is not None else None

        product_type = data.get("productType") or data.get("product_type") or data.get("product") or "INTRADAY"
        mode = data.get("mode") or data.get("execution_mode") or "PAPER"
        timestamp = data.get("timestamp") or datetime.now(timezone.utc).isoformat()

        return cls(
            broker=broker,
            exchange=exchange,
            underlying=underlying,
            securityId=security_id,
            tradingSymbol=trading_symbol,
            expiry=expiry,
            strike=strike,
            optionType=raw_opt,
            side=raw_side,
            quantity=quantity,
            lots=lots,
            lotSize=lot_size,
            orderType=order_type,
            price=price,
            triggerPrice=trigger_price,
            stopLoss=stop_loss,
            target=target,
            productType=product_type,
            mode=mode,
            timestamp=timestamp,
            clientOrderId=data.get("clientOrderId") or data.get("client_order_id"),
            correlationId=data.get("correlationId") or data.get("correlation_id"),
            ltp=float(data["ltp"]) if data.get("ltp") is not None else None,
            bid=float(data["bid"]) if data.get("bid") is not None else None,
            ask=float(data["ask"]) if data.get("ask") is not None else None,
            iv=float(data["iv"]) if data.get("iv") is not None else None,
            oi=float(data["oi"]) if data.get("oi") is not None else None,
            quoteStatus=data.get("quoteStatus") or data.get("quote_status") or "LIVE",
        )
