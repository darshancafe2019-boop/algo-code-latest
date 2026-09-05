"""
Canonical Bot Configuration Specification & Migration Engine
============================================================
Provides an authoritative, strictly typed, versioned configuration schema
for all trading bot instances across Quant.OS / Alpha Algo Terminal.
Ensures seamless bi-directional serialization, validation, deterministic hashing,
and forward/backward migration compatibility.
"""

import enum
import hashlib
import json
import logging
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

logger = logging.getLogger("CanonicalBotConfig")

CURRENT_CONFIG_VERSION = 2


class BotExecutionMode(str, enum.Enum):
    PAPER = "PAPER"
    LIVE = "LIVE"


class SizingMethod(str, enum.Enum):
    PERCENT_EQUITY = "PERCENT_EQUITY"
    FIXED_QUANTITY = "FIXED_QUANTITY"
    FIXED_NOTIONAL = "FIXED_NOTIONAL"
    RISK_PER_TRADE = "RISK_PER_TRADE"
    VOLATILITY_ATR = "VOLATILITY_ATR"


class ExecutionTrigger(str, enum.Enum):
    CANDLE_CLOSE = "CANDLE_CLOSE"
    INTRABAR = "INTRABAR"


class OrderType(str, enum.Enum):
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP = "STOP"
    STOP_LIMIT = "STOP-LIMIT"
    BRACKET = "BRACKET"
    OCO = "OCO"


class TimeInForce(str, enum.Enum):
    GTC = "GTC"
    IOC = "IOC"
    FOK = "FOK"
    DAY = "DAY"


def generate_slug(name: str) -> str:
    """Generate clean URL-safe slug from bot instance name."""
    s = str(name).strip().lower()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s.strip("-") or "unnamed-bot"


@dataclass
class BotIdentityConfig:
    bot_id: str
    name: str
    slug: str = ""
    description: str = ""
    group_name: str = "Crypto Scalping Bots"
    tags: List[str] = field(default_factory=list)
    owner_id: str = "primary_trader"
    customer_id: str = "cust_default"
    department_id: str = "dept_algo_trading"
    broker_folder_id: str = "bf_paper"
    broker_account_id: str = "ba_paper_primary"
    broker_provider: str = "paper_simulator"
    strategy_id: str = "EMA_MACD_VP"
    capital_source: str = "broker_cash"
    last_reconciliation_timestamp: str = ""
    version: int = CURRENT_CONFIG_VERSION
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def __post_init__(self):
        if not self.slug:
            self.slug = generate_slug(self.name)


@dataclass
class BotEnvironmentConfig:
    execution_mode: BotExecutionMode = BotExecutionMode.PAPER
    data_provider_id: str = "ccxt_binance"
    execution_broker_id: str = "paper_simulator"
    account_alias: str = "primary"
    exchange: str = "BINANCE"
    timezone: str = "UTC"
    trading_sessions: List[str] = field(default_factory=lambda: ["24x7"])
    allowed_trading_days: List[str] = field(
        default_factory=lambda: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
    )
    start_time: str = "00:00"
    end_time: str = "23:59"


@dataclass
class BotUniverseConfig:
    asset_class: str = "CRYPTO"  # INDEX, STOCKS, OPTIONS, FUTURES, CRYPTO, CRYPTO_OPTIONS, COMMODITIES, FOREX, ETF
    canonical_instrument_id: str = "BINANCE:BTCUSDT:SPOT"
    display_symbol: str = "BTC/USDT"
    provider_symbol: str = "BTC/USDT"
    exchange_symbol: str = "BTCUSDT"
    quantity_unit: str = "BTC"
    tick_size: float = 0.01
    lot_size: float = 1.0
    contract_multiplier: float = 1.0
    currency: str = "USDT"
    expiry: Optional[str] = None
    strike: Optional[float] = None
    option_type: Optional[str] = None  # CALL, PUT, BOTH
    strike_offset: Optional[float] = 0.0
    settlement_asset: str = "USDT"
    liquidity_filter_min_volume_24h: float = 0.0
    max_spread_pct: float = 1.0


@dataclass
class IndicatorParamConfig:
    id: str
    name: str
    category: str
    timeframe: str = "5m"
    params: Dict[str, Any] = field(default_factory=dict)


@dataclass
class StrategyRule:
    id: str
    left_indicator: str
    operator: str  # >, <, >=, <=, ==, !=, CROSS_ABOVE, CROSS_BELOW
    right_type: str = "THRESHOLD"  # THRESHOLD, INDICATOR, PRICE
    right_value: Optional[float] = None
    right_indicator: Optional[str] = None
    is_mandatory: bool = True


@dataclass
class StrategyRuleGroup:
    conjunction: str = "AND"  # AND, OR
    rules: List[StrategyRule] = field(default_factory=list)


@dataclass
class BotStrategyConfig:
    strategy_id: str = "DETERMINISTIC_RULES"
    strategy_version: str = "1.0.0"
    long_enabled: bool = True
    short_enabled: bool = False
    primary_timeframe: str = "5m"
    confirmation_timeframes: List[str] = field(default_factory=lambda: ["15m", "1h"])
    execution_trigger: ExecutionTrigger = ExecutionTrigger.CANDLE_CLOSE
    warm_up_bars: int = 50
    cooldown_bars: int = 2
    re_entry_policy: str = "WAIT_FOR_OPPOSITE_OR_RESET"
    max_signals_per_session: int = 10
    no_lookahead_enforced: bool = True
    indicators: List[IndicatorParamConfig] = field(default_factory=list)
    entry_rules: StrategyRuleGroup = field(default_factory=StrategyRuleGroup)
    exit_rules: StrategyRuleGroup = field(default_factory=StrategyRuleGroup)
    short_entry_rules: StrategyRuleGroup = field(default_factory=StrategyRuleGroup)
    short_exit_rules: StrategyRuleGroup = field(default_factory=StrategyRuleGroup)


@dataclass
class BotCapitalConfig:
    total_capital: float = 50000.0
    allocated_capital: float = 10000.0
    risk_reserve: float = 0.0
    department_budget: float = 5000000.0
    reserved_margin: float = 0.0
    sizing_method: SizingMethod = SizingMethod.RISK_PER_TRADE
    fixed_quantity: float = 0.0
    fixed_notional: float = 0.0
    percentage_of_equity: float = 20.0
    risk_per_trade_pct: float = 2.0
    min_quantity: float = 0.0001
    max_quantity: float = 1000.0
    min_notional: float = 10.0
    currency: str = "USDT"
    leverage: float = 1.0
    estimated_fees_pct: float = 0.075
    expected_slippage_pct: float = 0.05

    @property
    def remaining_capital(self) -> float:
        return max(0.0, round(self.total_capital - self.allocated_capital, 2))

    @property
    def allocation_pct(self) -> float:
        return (
            min(100.0, max(0.0, round((self.allocated_capital / self.total_capital) * 100.0, 1)))
            if self.total_capital > 0
            else 0.0
        )


@dataclass
class BotTrailingStopConfig:
    enabled: bool = True
    method: str = "percent"  # percent, atr, points
    distance_pct: float = 0.5
    activation_pct: float = 1.0


@dataclass
class BotRiskConfig:
    stop_loss_pct: float = 1.5
    profit_target_pct: float = 3.0
    trailing_stop: BotTrailingStopConfig = field(default_factory=BotTrailingStopConfig)
    max_daily_drawdown_pct: float = 3.0
    max_daily_loss_amount: float = 300.0
    max_portfolio_drawdown_pct: float = 10.0
    max_open_positions: int = 1
    max_portfolio_exposure_pct: float = 30.0
    max_leverage: float = 5.0
    max_spread_pct: float = 1.0
    max_slippage_pct: float = 0.2
    max_consecutive_losses: int = 4
    max_orders_per_minute: int = 5
    stale_data_timeout_seconds: float = 60.0
    broker_disconnect_behavior: str = "FAIL_CLOSED_HOLD"
    global_kill_switch_behavior: str = "CANCEL_PENDING_AND_HOLD"
    auto_square_off_time: Optional[str] = None  # e.g. "15:15" for intraday NSE


@dataclass
class BotExecutionConfig:
    order_type: OrderType = OrderType.MARKET
    time_in_force: TimeInForce = TimeInForce.GTC
    reduce_only: bool = False
    post_only: bool = False
    max_slippage_pct: float = 0.2
    retry_policy_max_retries: int = 3
    timeout_seconds: float = 10.0
    partial_fill_policy: str = "ALLOW"
    idempotency_key: str = ""
    client_order_id_prefix: str = "QOS"
    reconciliation_policy: str = "AUTHORITATIVE_LEDGER"


@dataclass
class BotMonitoringConfig:
    health_check_interval_seconds: int = 10
    heartbeat_enabled: bool = True
    alerts_enabled: bool = True
    error_notifications_enabled: bool = True
    audit_logging_level: str = "INFO"


@dataclass
class CanonicalBotConfig:
    """Consolidated Authoritative Configuration for a Quant.OS Bot Instance."""

    identity: BotIdentityConfig
    environment: BotEnvironmentConfig = field(default_factory=BotEnvironmentConfig)
    universe: BotUniverseConfig = field(default_factory=BotUniverseConfig)
    strategy: BotStrategyConfig = field(default_factory=BotStrategyConfig)
    capital: BotCapitalConfig = field(default_factory=BotCapitalConfig)
    risk: BotRiskConfig = field(default_factory=BotRiskConfig)
    execution: BotExecutionConfig = field(default_factory=BotExecutionConfig)
    monitoring: BotMonitoringConfig = field(default_factory=BotMonitoringConfig)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to fully serializable dictionary."""
        d = asdict(self)
        # Convert enums to string values
        def _enum_handler(obj):
            if isinstance(obj, dict):
                return {k: _enum_handler(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [_enum_handler(item) for item in obj]
            elif isinstance(obj, enum.Enum):
                return obj.value
            return obj
        return _enum_handler(d)

    def to_json(self, indent: Optional[int] = None) -> str:
        """Serialize configuration to JSON string."""
        return json.dumps(self.to_dict(), indent=indent, sort_keys=True)

    def compute_hash(self) -> str:
        """Compute deterministic SHA-256 hash of configuration content."""
        canonical_str = self.to_json()
        return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()

    @classmethod
    def from_dict(cls, data: Dict[str, Any], default_bot_id: str = "bot-unknown", default_name: str = "Trading Bot") -> "CanonicalBotConfig":
        """
        Parses dictionary data into CanonicalBotConfig with complete backwards compatibility
        for legacy config_json formats (V1 -> V2 auto-migration).
        """
        if not isinstance(data, dict):
            data = {}

        # 1. Identity
        ident_data = data.get("identity", {})
        bot_id = ident_data.get("bot_id") or data.get("bot_id") or data.get("id") or default_bot_id
        name = ident_data.get("name") or data.get("name") or default_name
        slug = ident_data.get("slug") or data.get("slug") or generate_slug(name)
        description = ident_data.get("description") or data.get("description") or ""
        group_name = ident_data.get("group_name") or data.get("group_name") or "Crypto Scalping Bots"
        tags = ident_data.get("tags") or data.get("tags") or []
        owner_id = ident_data.get("owner_id") or data.get("owner_id") or "primary_trader"
        customer_id = ident_data.get("customer_id") or data.get("customer_id") or "cust_default"
        department_id = ident_data.get("department_id") or data.get("department_id") or "dept_algo_trading"
        broker_folder_id = ident_data.get("broker_folder_id") or data.get("broker_folder_id") or "bf_paper"
        broker_account_id = ident_data.get("broker_account_id") or data.get("broker_account_id") or "ba_paper_primary"
        broker_provider = ident_data.get("broker_provider") or data.get("broker_provider") or data.get("broker_id") or "paper_simulator"
        strategy_id = ident_data.get("strategy_id") or data.get("strategy_id") or data.get("strategy") or "EMA_MACD_VP"
        capital_source = ident_data.get("capital_source") or data.get("capital_source") or "broker_cash"
        last_recon_ts = ident_data.get("last_reconciliation_timestamp") or data.get("last_reconciliation_timestamp") or ""
        version = int(ident_data.get("version") or data.get("version") or CURRENT_CONFIG_VERSION)
        created_at = ident_data.get("created_at") or data.get("created_at") or datetime.now(timezone.utc).isoformat()
        updated_at = ident_data.get("updated_at") or data.get("updated_at") or datetime.now(timezone.utc).isoformat()

        identity = BotIdentityConfig(
            bot_id=bot_id,
            name=name,
            slug=slug,
            description=description,
            group_name=group_name,
            tags=tags if isinstance(tags, list) else [],
            owner_id=owner_id,
            customer_id=customer_id,
            department_id=department_id,
            broker_folder_id=broker_folder_id,
            broker_account_id=broker_account_id,
            broker_provider=broker_provider,
            strategy_id=strategy_id,
            capital_source=capital_source,
            last_reconciliation_timestamp=last_recon_ts,
            version=version,
            created_at=created_at,
            updated_at=updated_at,
        )

        # 2. Environment
        env_data = data.get("environment", {})
        mode_str = str(env_data.get("execution_mode") or data.get("execution_mode") or "PAPER").upper()
        exec_mode = BotExecutionMode.LIVE if mode_str == "LIVE" else BotExecutionMode.PAPER
        data_provider = env_data.get("data_provider_id") or data.get("data_provider_id") or data.get("exchange") or "ccxt_binance"
        exec_broker = env_data.get("execution_broker_id") or data.get("broker_id") or data.get("execution_config", {}).get("broker_id") or "paper_simulator"
        account_alias = env_data.get("account_alias") or data.get("account_id") or data.get("execution_config", {}).get("account_id") or "primary"
        exchange = env_data.get("exchange") or data.get("exchange") or "BINANCE"
        timezone_str = env_data.get("timezone") or data.get("timezone") or "UTC"

        environment = BotEnvironmentConfig(
            execution_mode=exec_mode,
            data_provider_id=data_provider,
            execution_broker_id=exec_broker,
            account_alias=account_alias,
            exchange=exchange,
            timezone=timezone_str,
            trading_sessions=env_data.get("trading_sessions") or ["24x7"],
            allowed_trading_days=env_data.get("allowed_trading_days") or ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            start_time=env_data.get("start_time") or "00:00",
            end_time=env_data.get("end_time") or "23:59",
        )

        # 3. Universe
        univ_data = data.get("universe", {})
        display_sym = univ_data.get("display_symbol") or data.get("symbol") or "BTC/USDT"
        asset_class = (univ_data.get("asset_class") or data.get("asset_class") or "CRYPTO").upper()
        canon_inst_id = univ_data.get("canonical_instrument_id") or f"{exchange.upper()}:{display_sym.replace('/', '')}:SPOT"

        universe = BotUniverseConfig(
            asset_class=asset_class,
            canonical_instrument_id=canon_inst_id,
            display_symbol=display_sym,
            provider_symbol=univ_data.get("provider_symbol") or display_sym,
            exchange_symbol=univ_data.get("exchange_symbol") or display_sym.replace("/", ""),
            quantity_unit=univ_data.get("quantity_unit") or display_sym.split("/")[0],
            tick_size=float(univ_data.get("tick_size") or 0.01),
            lot_size=float(univ_data.get("lot_size") or data.get("lot_size") or 1.0),
            contract_multiplier=float(univ_data.get("contract_multiplier") or 1.0),
            currency=univ_data.get("currency") or ("INR" if asset_class in ["INDIAN_STOCKS", "NSE"] else "USDT"),
            expiry=univ_data.get("expiry") or data.get("derivatives", {}).get("expiry") or data.get("options_config", {}).get("expiry"),
            strike=float(univ_data["strike"]) if univ_data.get("strike") is not None else None,
            option_type=univ_data.get("option_type") or data.get("derivatives", {}).get("option_side") or data.get("options_config", {}).get("option_side"),
            strike_offset=float(univ_data.get("strike_offset") or data.get("derivatives", {}).get("strike_offset") or 0.0),
            settlement_asset=univ_data.get("settlement_asset") or "USDT",
            liquidity_filter_min_volume_24h=float(univ_data.get("liquidity_filter_min_volume_24h") or 0.0),
            max_spread_pct=float(univ_data.get("max_spread_pct") or 1.0),
        )

        # 4. Strategy
        strat_data = data.get("strategy", {})
        if isinstance(strat_data, str):
            strat_name = strat_data
            strat_data = {"strategy_id": strat_name}
        
        tf = strat_data.get("primary_timeframe") or data.get("timeframe") or "5m"
        ind_raw = strat_data.get("indicators") or data.get("indicators") or []
        parsed_indicators: List[IndicatorParamConfig] = []
        for i_item in ind_raw:
            if isinstance(i_item, dict):
                parsed_indicators.append(
                    IndicatorParamConfig(
                        id=i_item.get("id") or "ind",
                        name=i_item.get("name") or i_item.get("id") or "Indicator",
                        category=i_item.get("category") or "Trend",
                        timeframe=i_item.get("timeframe") or tf,
                        params=i_item.get("params") or {},
                    )
                )
            elif isinstance(i_item, str):
                parsed_indicators.append(
                    IndicatorParamConfig(
                        id=i_item,
                        name=i_item.upper(),
                        category="General",
                        timeframe=tf,
                        params={},
                    )
                )

        # Parse rules from indicator_combination / rule_tree / entry_rules
        raw_rules = (
            strat_data.get("entry_rules", {}).get("rules")
            or data.get("indicator_combination", {}).get("rules")
            or data.get("rule_tree", {}).get("rules")
            or []
        )
        parsed_rules: List[StrategyRule] = []
        for r in raw_rules:
            if isinstance(r, dict):
                parsed_rules.append(
                    StrategyRule(
                        id=str(r.get("id") or f"rule-{len(parsed_rules)+1}"),
                        left_indicator=r.get("left_indicator") or r.get("leftIndicatorId") or r.get("left") or "ema_fast",
                        operator=r.get("operator") or r.get("op") or ">",
                        right_type=r.get("right_type") or r.get("rightType") or "THRESHOLD",
                        right_value=float(r["right_value"]) if "right_value" in r and r["right_value"] is not None else (float(r["rightValue"]) if "rightValue" in r and r["rightValue"] is not None else None),
                        right_indicator=r.get("right_indicator") or r.get("rightIndicatorId") or r.get("right"),
                        is_mandatory=bool(r.get("is_mandatory", r.get("isMandatory", True))),
                    )
                )

        trig_str = str(strat_data.get("execution_trigger") or "CANDLE_CLOSE").upper()
        exec_trigger = ExecutionTrigger.INTRABAR if trig_str == "INTRABAR" else ExecutionTrigger.CANDLE_CLOSE

        strategy = BotStrategyConfig(
            strategy_id=strat_data.get("strategy_id") or data.get("strategy_type") or "DETERMINISTIC_RULES",
            strategy_version=strat_data.get("strategy_version") or "1.0.0",
            long_enabled=bool(strat_data.get("long_enabled", True)),
            short_enabled=bool(strat_data.get("short_enabled", False)),
            primary_timeframe=tf,
            confirmation_timeframes=strat_data.get("confirmation_timeframes") or data.get("multi_timeframe", {}).get("additional_tfs") or ["15m", "1h"],
            execution_trigger=exec_trigger,
            warm_up_bars=int(strat_data.get("warm_up_bars") or 50),
            cooldown_bars=int(strat_data.get("cooldown_bars") or 2),
            re_entry_policy=strat_data.get("re_entry_policy") or "WAIT_FOR_OPPOSITE_OR_RESET",
            max_signals_per_session=int(strat_data.get("max_signals_per_session") or 10),
            no_lookahead_enforced=bool(strat_data.get("no_lookahead_enforced", True)),
            indicators=parsed_indicators,
            entry_rules=StrategyRuleGroup(
                conjunction=data.get("indicator_combination", {}).get("operator") or "AND",
                rules=parsed_rules,
            ),
        )

        # 5. Capital
        cap_data = data.get("capital", {})
        alloc_cap = float(cap_data.get("allocated_capital") or data.get("allocated_capital") or 10000.0)
        tot_cap = float(cap_data.get("total_capital") or data.get("total_capital") or alloc_cap)
        risk_per_trade = float(cap_data.get("risk_per_trade_pct") or data.get("risk_pct") or data.get("risk_per_trade_pct") or 2.0)
        lev = float(cap_data.get("leverage") or data.get("leverage") or 1.0)

        sizing_str = str(cap_data.get("sizing_method", "RISK_PER_TRADE")).upper()
        sizing_method = SizingMethod.RISK_PER_TRADE
        for sm in SizingMethod:
            if sm.value == sizing_str:
                sizing_method = sm
                break

        capital = BotCapitalConfig(
            total_capital=tot_cap,
            allocated_capital=alloc_cap,
            risk_reserve=float(cap_data.get("risk_reserve") or data.get("risk_reserve") or 0.0),
            department_budget=float(cap_data.get("department_budget") or data.get("department_budget") or 5000000.0),
            reserved_margin=float(cap_data.get("reserved_margin") or 0.0),
            sizing_method=sizing_method,
            fixed_quantity=float(cap_data.get("fixed_quantity") or data.get("quantity") or 0.0),
            fixed_notional=float(cap_data.get("fixed_notional") or 0.0),
            percentage_of_equity=float(cap_data.get("percentage_of_equity") or 20.0),
            risk_per_trade_pct=risk_per_trade,
            min_quantity=float(cap_data.get("min_quantity") or 0.0001),
            max_quantity=float(cap_data.get("max_quantity") or 1000.0),
            min_notional=float(cap_data.get("min_notional") or 10.0),
            currency=cap_data.get("currency") or ("INR" if asset_class in ["INDIAN_STOCKS", "NSE"] else "USDT"),
            leverage=lev,
            estimated_fees_pct=float(cap_data.get("estimated_fees_pct") or 0.075),
            expected_slippage_pct=float(cap_data.get("expected_slippage_pct") or 0.05),
        )

        # 6. Risk
        risk_data = data.get("risk", {})
        trailing_raw = risk_data.get("trailing_stop") or data.get("trailing_stop") or {}
        if isinstance(trailing_raw, bool):
            trailing_cfg = BotTrailingStopConfig(enabled=trailing_raw, distance_pct=float(data.get("trailing_stop_pct") or 0.5))
        elif isinstance(trailing_raw, dict):
            trailing_cfg = BotTrailingStopConfig(
                enabled=bool(trailing_raw.get("enabled", True)),
                method=trailing_raw.get("method") or "percent",
                distance_pct=float(trailing_raw.get("distance_pct") or trailing_raw.get("trailing_stop_pct") or 0.5),
                activation_pct=float(trailing_raw.get("activation_pct") or 1.0),
            )
        else:
            trailing_cfg = BotTrailingStopConfig(enabled=False)

        sl_pct = float(risk_data.get("stop_loss_pct") or data.get("stop_loss_pct") or 1.5)
        tp_pct = float(risk_data.get("profit_target_pct") or data.get("profit_target_pct") or 3.0)
        max_dd_pct = float(risk_data.get("max_daily_drawdown_pct") or data.get("max_daily_drawdown_pct") or 3.0)

        risk = BotRiskConfig(
            stop_loss_pct=sl_pct,
            profit_target_pct=tp_pct,
            trailing_stop=trailing_cfg,
            max_daily_drawdown_pct=max_dd_pct,
            max_daily_loss_amount=float(risk_data.get("max_daily_loss_amount") or (alloc_cap * (max_dd_pct / 100.0))),
            max_portfolio_drawdown_pct=float(risk_data.get("max_portfolio_drawdown_pct") or 10.0),
            max_open_positions=int(risk_data.get("max_open_positions") or data.get("max_open_positions") or data.get("max_positions") or 1),
            max_portfolio_exposure_pct=float(risk_data.get("max_portfolio_exposure_pct") or 30.0),
            max_leverage=float(risk_data.get("max_leverage") or lev),
            max_spread_pct=float(risk_data.get("max_spread_pct") or 1.0),
            max_slippage_pct=float(risk_data.get("max_slippage_pct") or data.get("max_slippage_pct") or 0.2),
            max_consecutive_losses=int(risk_data.get("max_consecutive_losses") or 4),
            max_orders_per_minute=int(risk_data.get("max_orders_per_minute") or 5),
            stale_data_timeout_seconds=float(risk_data.get("stale_data_timeout_seconds") or 60.0),
            broker_disconnect_behavior=risk_data.get("broker_disconnect_behavior") or "FAIL_CLOSED_HOLD",
            global_kill_switch_behavior=risk_data.get("global_kill_switch_behavior") or "CANCEL_PENDING_AND_HOLD",
            auto_square_off_time=risk_data.get("auto_square_off_time"),
        )

        # 7. Execution
        exec_data = data.get("execution") or data.get("execution_config") or {}
        ot_str = str(exec_data.get("order_type") or "MARKET").upper()
        ot_map = {"MARKET": OrderType.MARKET, "LIMIT": OrderType.LIMIT, "STOP": OrderType.STOP, "STOP-LIMIT": OrderType.STOP_LIMIT}
        order_type = ot_map.get(ot_str, OrderType.MARKET)

        execution = BotExecutionConfig(
            order_type=order_type,
            time_in_force=TimeInForce.GTC,
            reduce_only=bool(exec_data.get("reduce_only", False)),
            post_only=bool(exec_data.get("post_only", False)),
            max_slippage_pct=float(exec_data.get("max_slippage_pct") or 0.2),
            retry_policy_max_retries=int(exec_data.get("retry_policy_max_retries") or 3),
            timeout_seconds=float(exec_data.get("timeout_seconds") or 10.0),
            partial_fill_policy=exec_data.get("partial_fill_policy") or "ALLOW",
            idempotency_key=exec_data.get("idempotency_key") or "",
            client_order_id_prefix=exec_data.get("client_order_id_prefix") or "QOS",
            reconciliation_policy=exec_data.get("reconciliation_policy") or "AUTHORITATIVE_LEDGER",
        )

        # 8. Monitoring
        mon_data = data.get("monitoring", {})
        monitoring = BotMonitoringConfig(
            health_check_interval_seconds=int(mon_data.get("health_check_interval_seconds") or 10),
            heartbeat_enabled=bool(mon_data.get("heartbeat_enabled", True)),
            alerts_enabled=bool(mon_data.get("alerts_enabled", True)),
            error_notifications_enabled=bool(mon_data.get("error_notifications_enabled", True)),
            audit_logging_level=mon_data.get("audit_logging_level") or "INFO",
        )

        return cls(
            identity=identity,
            environment=environment,
            universe=universe,
            strategy=strategy,
            capital=capital,
            risk=risk,
            execution=execution,
            monitoring=monitoring,
        )

    def validate(self) -> Tuple[bool, List[str]]:
        """Validate entire canonical configuration against safety invariants."""
        errors: List[str] = []
        if not self.identity.name or not self.identity.name.strip():
            errors.append("Bot Name cannot be empty.")
        if self.capital.allocated_capital <= 0:
            errors.append("Allocated capital must be greater than zero.")
        if self.risk.max_daily_loss_amount > self.capital.allocated_capital:
            errors.append("Max daily loss cannot exceed allocated capital.")
        if self.risk.max_daily_drawdown_pct <= 0 or self.risk.max_daily_drawdown_pct > 100:
            errors.append("Max drawdown percentage must be between 0% and 100%.")
        if self.risk.stop_loss_pct <= 0:
            errors.append("Stop loss percentage must be greater than zero.")
        if not self.universe.canonical_instrument_id:
            errors.append("Canonical Instrument ID is required.")
        return len(errors) == 0, errors


def generate_bot_slug(name: str, market: str = "", symbol: str = "") -> str:
    """Generate deterministic slug combining name, market, and symbol."""
    parts = [name]
    if market:
        parts.append(market)
    if symbol:
        parts.append(symbol)
    combined = " ".join(parts)
    return generate_slug(combined)


def compute_config_hash(config_data: Union[Dict[str, Any], CanonicalBotConfig]) -> str:
    """Compute SHA-256 hash of configuration."""
    if isinstance(config_data, CanonicalBotConfig):
        return config_data.compute_hash()
    elif isinstance(config_data, dict):
        canonical_str = json.dumps(config_data, sort_keys=True)
        return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()
    else:
        return hashlib.sha256(str(config_data).encode("utf-8")).hexdigest()


migrate_v1_to_canonical = CanonicalBotConfig.from_dict

