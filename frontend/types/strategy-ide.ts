/**
 * Canonical Type Definitions for Quant.OS Strategy Research & Deployment Workstation
 */

export type RuleTimeframe = "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "4h" | "8h" | "1d" | "1w";

export type StrategyMarketType = "crypto" | "equity" | "futures" | "options" | "forex" | "commodity" | "etf";

export type StrategyDirection = "LONG" | "SHORT" | "BOTH";

export type StrategyStatus =
  | "DRAFT"
  | "VALIDATED"
  | "SAVED"
  | "APPROVED"
  | "PUBLISHED"
  | "DEPLOYED"
  | "PAUSED"
  | "RETIRED";

export type TradingExecutionMode = "PAPER" | "SHADOW" | "LIVE_LOCKED" | "LIVE";

export type RuleOperator =
  | ">"
  | "<"
  | ">="
  | "<="
  | "=="
  | "!="
  | "crosses_above"
  | "crosses_below"
  | "in_range"
  | "outside_range"
  | "above_for_n_bars"
  | "below_for_n_bars"
  | "rising_for_n_bars"
  | "falling_for_n_bars";

export interface StrategyIdeRule {
  id: string;
  group?: string;
  timeframe: RuleTimeframe;
  left: string;
  leftLabel: string;
  op: RuleOperator | string;
  right: string;
  rightLabel: string;
  category: "PRICE" | "TREND" | "MOMENTUM" | "VOLATILITY" | "VOLUME" | "STRUCTURE" | "DERIVATIVES" | "OPTIONS" | "GREEKS" | "FUNDING" | "RISK" | "CUSTOM";
  enabled: boolean;
  required?: boolean;
  weight?: number;
  logicConnector?: "AND" | "OR" | "NOT";
  dataSource?: string;
  description?: string;
  lookbackBars?: number;
}

export interface StrategyIdeRuleGroup {
  conjunction: "AND" | "OR" | "CUSTOM";
  customLogic?: string;
  rules: StrategyIdeRule[];
}

export interface StrategyIdeEntry {
  setup: StrategyIdeRuleGroup;
  confirmation: StrategyIdeRuleGroup;
  trigger: StrategyIdeRuleGroup;
}

export type PositionSizingMethod =
  | "FIXED_QTY"
  | "FIXED_CAPITAL"
  | "PCT_CAPITAL"
  | "PCT_RISK_PER_TRADE"
  | "ATR_SIZING"
  | "VOLATILITY_ADJUSTED"
  | "KELLY_DERIVED"
  | "CUSTOM_FORMULA";

export interface PositionSizingConfig {
  method: PositionSizingMethod;
  value: number;
  atr_period?: number;
  atr_multiplier?: number;
  volatility_target_pct?: number;
  kelly_fraction?: number;
  custom_formula?: string;
  // Estimated metrics derived deterministically
  available_capital: number;
  allocated_capital: number;
  estimated_margin: number;
  estimated_exposure: number;
  effective_leverage: number;
}

export interface PartialExitTarget {
  id: string;
  target_rr: number; // e.g. 1.0 (1R), 2.0 (2R)
  exit_pct: number;  // e.g. 25 (%)
  label?: string;
}

export interface TradeManagementConfig {
  partial_exits: PartialExitTarget[];
  move_sl_to_be_on_target: boolean;
  scale_in_enabled: boolean;
  scale_in_max_steps: number;
  scale_out_enabled: boolean;
  pyramiding_max: number;
  reentry_enabled: boolean;
  cooldown_bars: number;
  max_trades_per_day: number;
  max_consecutive_losses: number;
}

export interface ExecutionFiltersConfig {
  market_open_check: boolean;
  broker_connected_check: boolean;
  market_data_fresh_check: boolean;
  max_spread_pct: number;
  min_liquidity_usd: number;
  max_slippage_pct: number;
  orderbook_depth_check: boolean;
  no_risk_lock_check: boolean;
  no_kill_switch_check: boolean;
  api_healthy_check: boolean;
  execution_timing: "CLOSED_BAR" | "INTRABAR" | "TICK_EVENT";
}

export interface OrderConfiguration {
  order_type: "MARKET" | "LIMIT" | "SL" | "SL_M";
  limit_offset_ticks: number;
  trigger_offset_ticks: number;
  validity: "DAY" | "IOC" | "GTC";
  product_type: "CNC" | "MIS" | "NRML" | "MARGIN";
  slippage_tolerance_pct: number;
  retry_policy: {
    max_retries: number;
    retry_delay_ms: number;
  };
}

export interface BrokerCapabilityConfig {
  execution_broker: "Dhan" | "Upstox" | "Delta" | "Paper";
  data_provider: "Binance" | "Delta" | "Dhan" | "Upstox";
  mode: TradingExecutionMode;
}

export interface MultiTargetExit {
  ratio: number;
  pct: number;
}

export interface StrategyIdeExit {
  stop_loss_type: "ATR" | "PERCENT" | "FIXED_PRICE" | "SWING_HL" | "STRUCTURE" | "VOLATILITY" | "TRAILING";
  stop_loss_value: number;
  stop_loss_atr_mult?: number;
  take_profit_type: "RR_RATIO" | "ATR" | "PERCENT" | "FIXED_PRICE" | "TARGET_LEVEL";
  take_profit_value: number;
  take_profit_atr_mult?: number;
  multi_target?: MultiTargetExit[];
  trailing_stop_enabled: boolean;
  trailing_stop_type?: "PERCENT" | "ATR_TRAIL" | "STEP_TRAIL" | "BREAK_EVEN";
  trailing_stop_activation?: number;
  trailing_stop_callback?: number;
  auto_square_off_enabled?: boolean;
  auto_square_off_time?: string;
}

export interface StrategyIdeRisk {
  capital: number;
  risk_per_trade_pct: number;
  max_position_size_pct: number;
  max_daily_loss: number;
  max_weekly_loss?: number;
  max_drawdown_pct: number;
  max_open_positions: number;
  max_asset_exposure_pct?: number;
  max_broker_exposure_pct?: number;
  max_concurrent_bots?: number;
  max_orders_per_minute?: number;
  leverage: number;
  cooldown_bars: number;
}

export interface OptionLegConfig {
  id: string;
  side: "BUY" | "SELL";
  option_type: "CALL" | "PUT";
  strike_selection: "ATM" | "ITM" | "OTM" | "DELTA" | "PREMIUM" | "CUSTOM";
  strike_offset?: number;
  delta_target?: number;
  ratio: number;
}

export interface OptionsStrategyConfig {
  underlying: string;
  expiry: string;
  option_type: "CALL" | "PUT";
  strike_selection: "ATM" | "ITM" | "OTM" | "DELTA" | "PREMIUM" | "CUSTOM";
  strike_offset?: number;
  delta_target?: number;
  template_type:
    | "SINGLE_LEG"
    | "LONG_CALL"
    | "LONG_PUT"
    | "BULL_CALL_SPREAD"
    | "BEAR_PUT_SPREAD"
    | "BULL_PUT_SPREAD"
    | "BEAR_CALL_SPREAD"
    | "STRADDLE"
    | "STRANGLE"
    | "IRON_CONDOR"
    | "IRON_BUTTERFLY"
    | "BUTTERFLY"
    | "CALENDAR"
    | "DIAGONAL"
    | "RATIO_SPREAD"
    | "CUSTOM_MULTI_LEG";
  legs: OptionLegConfig[];
}

export interface FuturesStrategyConfig {
  basis_filter_enabled: boolean;
  basis_threshold: number;
  oi_filter_enabled: boolean;
  oi_change_min_pct: number;
  funding_rate_filter_enabled: boolean;
  funding_rate_max_pct: number;
  margin_type: "ISOLATED" | "CROSS";
  leverage: number;
}

export interface StrategyIdeDefinition {
  strategy_id: string;
  id?: string;
  name: string;
  description: string;
  status: StrategyStatus;
  active_version: string;
  version?: string;
  market_type: StrategyMarketType;
  symbol: string;
  exchange?: string;
  base_timeframe: RuleTimeframe;
  direction: StrategyDirection;
  entry: StrategyIdeEntry;
  exit: StrategyIdeExit;
  risk: StrategyIdeRisk;
  position_sizing?: PositionSizingConfig;
  trade_management?: TradeManagementConfig;
  execution_filters?: ExecutionFiltersConfig;
  order_config?: OrderConfiguration;
  broker_config?: BrokerCapabilityConfig;
  options_config?: OptionsStrategyConfig;
  futures_config?: FuturesStrategyConfig;
  author?: string;
  tags?: string[];
  config_hash?: string;
  compiled_expression?: string;
  created_at?: string;
  updated_at?: string;
  // Legacy compatibility fields
  entry_rules?: StrategyIdeRule[];
  timeframe?: string;
}

export interface PillarScore {
  score: number;
  max: number;
  label: string;
  status: "PASS" | "WARN" | "FAIL";
  details: string[];
}

export interface StrategyIdeReadiness {
  total_score: number;
  max_score: number;
  status: "READY" | "NEEDS_REVIEW" | "REJECTED";
  pillars: {
    rule_completeness: PillarScore;
    risk_protection: PillarScore;
    data_availability: PillarScore;
    backtest_coverage: PillarScore;
    execution_compatibility: PillarScore;
    logic_validation: PillarScore;
  };
  checklist?: {
    setup: "PASS" | "WARNING" | "FAIL" | "NOT_CONFIGURED";
    confirm: "PASS" | "WARNING" | "FAIL" | "NOT_CONFIGURED";
    trigger: "PASS" | "WARNING" | "FAIL" | "NOT_CONFIGURED";
    sizing: "PASS" | "WARNING" | "FAIL" | "NOT_CONFIGURED";
    risk: "PASS" | "WARNING" | "FAIL" | "NOT_CONFIGURED";
    execution: "PASS" | "WARNING" | "FAIL" | "NOT_CONFIGURED";
    market_data: "PASS" | "WARNING" | "FAIL" | "NOT_CONFIGURED";
    broker: "PASS" | "WARNING" | "FAIL" | "NOT_CONFIGURED";
    oms: "PASS" | "WARNING" | "FAIL" | "NOT_CONFIGURED";
    closed_bar: "PASS" | "WARNING" | "FAIL" | "NOT_CONFIGURED";
  };
  disclaimer: string;
}

export interface PreflightStage {
  stage: number;
  name: string;
  status: "PASS" | "FAIL" | "WARN";
  msg: string;
}

export interface StrategyIdePreflight {
  status: "APPROVED" | "REJECTED";
  pass_count: number;
  fail_count: number;
  stages: PreflightStage[];
}

export interface RuleEvaluationResult {
  rule_id: string | null;
  timeframe: string;
  condition: string;
  left_key: string;
  left_val: number;
  op: string;
  right_val: number;
  passed: boolean;
  category: string;
}

export interface StrategyIdeObservation {
  strategy_id: string;
  version_semver: string;
  symbol: string;
  timeframe: string;
  market_price: number;
  hypothetical_action: string;
  decision_summary: string;
  passed_count: number;
  total_rules: number;
  all_passed: boolean;
  blocking_reasons: string[];
  rule_evaluations: RuleEvaluationResult[];
  indicator_snapshot: Record<string, number>;
  timestamp: string;
}

export interface StrategyIdeVersion {
  id: number;
  strategy_id: string;
  version_semver: string;
  parent_version?: string;
  status: string;
  strategy_json: StrategyIdeDefinition | string;
  ast_json: any;
  config_hash: string;
  change_summary: string;
  created_at: string;
  created_by: string;
  is_deployed: number;
  is_immutable: number;
}

export interface VersionDifferenceItem {
  type: "ADDED" | "REMOVED" | "CHANGED";
  category: "MARKET" | "RULES" | "EXIT" | "RISK" | "INDICATOR" | "SIZING" | "EXECUTION";
  field: string;
  old: any;
  new: any;
}

export interface StrategyIdeDiffResult {
  status: "success" | "error";
  strategy_id: string;
  version_old: string;
  version_new: string;
  diff_count: number;
  differences: VersionDifferenceItem[];
  old_hash?: string;
  new_hash?: string;
  message?: string;
}

export interface BacktestTradeItem {
  trade_id: number;
  side: "LONG" | "SHORT";
  entry_time: string;
  entry_price: number;
  exit_time: string;
  exit_price: number;
  quantity: number;
  gross_pnl: number;
  net_pnl: number;
  fees: number;
  slippage: number;
  return_pct: number;
  exit_reason: string;
  holding_bars: number;
}

export interface BacktestMetrics {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate_pct: number;
  initial_capital: number;
  ending_equity: number;
  total_net_profit: number;
  return_pct: number;
  profit_factor: number;
  max_drawdown_pct: number;
  max_drawdown_usd: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  expectancy: number;
  avg_win: number;
  avg_loss: number;
  largest_win?: number;
  largest_loss?: number;
  total_fees?: number;
  exposure_pct?: number;
  in_sample_return_pct?: number;
  out_of_sample_return_pct?: number;
}

export interface BacktestResultPayload {
  status: string;
  backtest_id: string;
  metrics: BacktestMetrics;
  trades: BacktestTradeItem[];
  equity_curve: Array<{ time: string; equity: number; drawdown_pct: number }>;
  config: any;
  executed_at: string;
}
