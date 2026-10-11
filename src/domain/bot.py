from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from .enums import (
    BotStatus,
    AssetClass,
    Exchange,
    ProviderType,
    ExecutionMode,
    KillSwitchStatus,
)


class MarketConfig(BaseModel):
    asset_class: AssetClass = AssetClass.CRYPTO
    exchange: Exchange = Exchange.DELTA
    symbol: str = "BTCUSD"
    instrument_id: str = "BTCUSD"
    instrument_type: str = "SPOT"


class DataProviderConfig(BaseModel):
    provider: ProviderType = ProviderType.DELTA
    connection_id: Optional[str] = None


class ExecutionConfig(BaseModel):
    provider: ProviderType = ProviderType.PAPER
    mode: ExecutionMode = ExecutionMode.PAPER


class StrategyConfig(BaseModel):
    type: str = "MANUAL"
    timeframe: str = "1m"
    parameters: Dict[str, Any] = Field(default_factory=dict)


class RiskConfig(BaseModel):
    quantity: float = 1.0
    max_position_size: float = 1.0
    max_order_notional: Optional[float] = 100000.0
    max_loss_per_trade: float = 500.0
    max_daily_loss: float = 2000.0
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    max_market_data_age_ms: float = 10000.0


class BotValidationCheck(BaseModel):
    name: str
    status: str  # "PASS" | "FAIL" | "WARN"
    message: Optional[str] = None


class BotValidationResult(BaseModel):
    valid: bool
    checks: List[BotValidationCheck] = Field(default_factory=list)


class BotConfig(BaseModel):
    id: str
    name: str
    status: BotStatus = BotStatus.DRAFT
    market: MarketConfig = Field(default_factory=MarketConfig)
    data_provider: DataProviderConfig = Field(default_factory=DataProviderConfig)
    execution: ExecutionConfig = Field(default_factory=ExecutionConfig)
    strategy: StrategyConfig = Field(default_factory=StrategyConfig)
    risk: RiskConfig = Field(default_factory=RiskConfig)
    kill_switch: KillSwitchStatus = KillSwitchStatus.ARMED
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
