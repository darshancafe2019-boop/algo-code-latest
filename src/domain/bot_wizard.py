from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field
from .enums import AssetClass, Exchange, ProviderType, ExecutionMode, BotStatus
from .indicator_registry import IndicatorCondition
from .strategy_registry import OptionLeg


class SelectedContractPayload(BaseModel):
    instrument_id: Optional[str] = None
    canonical_instrument_id: Optional[str] = None
    symbol: str
    underlying: Optional[str] = None
    exchange: Optional[str] = "DELTA"
    asset_class: Optional[str] = "CRYPTO"
    contract_type: Optional[str] = "OPTION"
    expiry: Optional[str] = None
    strike: Optional[float] = None
    option_type: Optional[str] = None
    premium: Optional[float] = 0.0
    selected_premium: Optional[float] = 0.0
    bid: Optional[float] = 0.0
    ask: Optional[float] = 0.0
    volume: Optional[float] = 0.0
    open_interest: Optional[float] = 0.0
    lot_size: Optional[float] = 1.0
    tick_size: Optional[float] = 0.01
    provider: Optional[str] = "DELTA"
    timestamp: Optional[str] = None
    is_live: Optional[bool] = True


class OptionStrategyPayload(BaseModel):
    enabled: Optional[bool] = True
    strategy_id: Optional[str] = None
    strategy_name: Optional[str] = None
    market_view: Optional[str] = None
    legs: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    net_cost: Optional[float] = 0.0
    cost_type: Optional[str] = "DEBIT"
    max_profit: Optional[Union[float, str]] = None
    max_loss: Optional[Union[float, str]] = None
    breakevens: Optional[List[float]] = Field(default_factory=list)
    greeks: Optional[Dict[str, Any]] = Field(default_factory=dict)
    payoff_points: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


class TradingStrategyPayload(BaseModel):
    strategy_id: Optional[str] = "trend_pullback_ema"
    strategy_name: Optional[str] = "Trend Pullback to EMA"
    category: Optional[str] = "TREND"
    timeframe: Optional[str] = "5m"
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict)
    entry_logic: Optional[str] = None
    exit_logic: Optional[str] = None
    compatible: Optional[bool] = True
    compatibility_reason: Optional[str] = None


class RiskPayload(BaseModel):
    stop_loss_mode: Optional[str] = "PERCENTAGE"
    stop_loss_value: Optional[float] = 2.0
    take_profit_mode: Optional[str] = "PERCENTAGE"
    take_profit_value: Optional[float] = 5.0
    trailing_stop_mode: Optional[str] = "OFF"
    trailing_stop_value: Optional[float] = 0.0
    max_daily_loss: Optional[float] = 500.0
    max_drawdown_pct: Optional[float] = 10.0
    risk_per_trade: Optional[float] = 100.0
    max_position_size: Optional[float] = 2.0
    max_trades_per_day: Optional[int] = 10
    max_open_positions: Optional[int] = 2
    max_total_exposure: Optional[float] = 2000.0
    order_type: Optional[str] = "MARKET"
    trading_style: Optional[str] = "INTRADAY"
    auto_square_off_time: Optional[str] = "15:15"
    quantity: Optional[float] = 1.0


class BotWizardPayload(BaseModel):
    bot_name: Optional[str] = None
    name: Optional[str] = None
    market_type: Optional[str] = "CRYPTO_OPTION"
    underlying: Optional[str] = "BTC"
    timeframe: Optional[str] = "5m"
    broker: Optional[str] = "DELTA"
    execution_mode: Optional[ExecutionMode] = ExecutionMode.PAPER
    capital_allocation: Optional[float] = 1000.0
    available_funds: Optional[Union[float, str]] = "UNAVAILABLE"

    contract: Optional[SelectedContractPayload] = None
    indicators: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    option_strategy: Optional[OptionStrategyPayload] = None
    trading_strategy: Optional[TradingStrategyPayload] = None
    risk: Optional[RiskPayload] = None
    auto_start: Optional[bool] = False
    force: Optional[bool] = False


class PreDeploymentCheck(BaseModel):
    name: str
    status: str  # "PASS", "WARN", "FAIL"
    message: str


class PreDeploymentResult(BaseModel):
    ready: bool
    valid: bool = True
    checks: List[PreDeploymentCheck]
    bot_id: Optional[str] = None
