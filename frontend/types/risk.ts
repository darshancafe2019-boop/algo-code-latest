export interface ActiveRiskLimits {
  max_daily_loss_pct?: number;
  max_portfolio_risk_pct?: number;
  max_single_trade_risk_pct?: number;
  max_leverage?: number;
  max_symbol_concentration_pct?: number;
  max_asset_class_concentration_pct?: number;
  drawdown_halt_threshold_pct?: number;
  circuit_breaker_cooldown_mins?: number;
  max_daily_loss?: number;
  max_position_size?: number;
  max_order_value?: number;
  max_open_positions?: number;
  confluence_threshold?: number;
  max_market_data_age_seconds?: number;
  kill_switch_active?: boolean;
  position_mismatch_locked?: boolean;
  reserve_cash?: number;
}

export interface RiskPosition {
  id: number | string;
  bot_id: string;
  symbol: string;
  direction: "LONG" | "SHORT" | string;
  quantity: number;
  entry_price: number;
  current_price?: number;
  stop_loss: number;
  take_profit?: number;
  position_value: number;
  margin_used: number;
  risk_amount: number;
  risk_pct?: number;
  leverage: number;
  asset_class: string;
  unrealized_pnl: number;
  distance_to_sl_pct?: number;
  distance_to_tp_pct?: number;
  risk_status?: "SAFE" | "WARNING" | "NEAR_SL";
}

export interface RiskHeatmapItem {
  entity: string;
  type: "Symbol" | "Asset Class" | "Bot" | string;
  exposure: number;
  exposure_pct: number;
  risk_level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | string;
}

export interface RiskOverviewState {
  account_balance: number;
  available_capital: number;
  capital_used: number;
  margin_used: number;
  margin_usage_pct: number;
  gross_exposure: number;
  net_exposure: number;
  long_exposure?: number;
  short_exposure?: number;
  portfolio_risk_dollars: number;
  portfolio_risk_pct: number;
  daily_pnl: number;
  daily_loss_used_pct?: number;
  daily_drawdown_pct: number;
  peak_equity?: number;
  open_positions_count: number;
  risk_score: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | string;
  risk_score_numeric?: number;
  risk_status: "OPTIMAL" | "NORMAL" | "HIGH RISK WARNING" | "CRITICAL RISK" | "TRADING BLOCKED" | string;
  score_factors: string[];
  kill_switch_active: boolean;
  active_limits?: ActiveRiskLimits;
  gate_passed_count?: number;
  gate_total_count?: number;
}

export interface RiskOverviewResponse {
  status: string;
  overview: RiskOverviewState;
  positions: RiskPosition[];
  symbol_exposure: Record<string, number>;
  asset_class_exposure: Record<string, number>;
  heatmap: RiskHeatmapItem[];
}

export interface RiskProfile {
  id?: number;
  profile_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  max_daily_loss_pct: number;
  max_portfolio_risk_pct: number;
  max_single_trade_risk_pct: number;
  max_leverage: number;
  max_symbol_concentration_pct: number;
  max_asset_class_concentration_pct: number;
  drawdown_halt_threshold_pct: number;
  circuit_breaker_cooldown_mins: number;
}

export interface RiskRule {
  id?: number;
  rule_id: string;
  name: string;
  category: string;
  condition_type: string;
  threshold: number;
  action: string;
  is_enabled: boolean;
  description?: string;
}

export interface RiskGateEvaluation {
  id?: number;
  risk_event_id: string;
  gate_id: string;
  gate_name: string;
  status: "PASS" | "WARNING" | "FAIL" | "SKIPPED" | "NOT_APPLICABLE" | "ERROR" | string;
  observed_value: number;
  threshold_value: number;
  unit: string;
  reason_code: string;
  message: string;
  evaluated_at: string;
}

export interface RiskDecision {
  risk_event_id: string;
  decision_id: string;
  correlation_id?: string;
  order_intent_id?: string;
  order_id?: string;
  position_id?: string;
  trade_id?: string;
  bot_id: string;
  bot_version?: string;
  strategy_id?: string;
  strategy_version?: string;
  account_id: string;
  account_mode: "LIVE" | "PAPER" | string;
  instrument_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  instrument_type: string;
  decision: "APPROVED" | "APPROVED_WITH_WARNING" | "MODIFIED" | "BLOCKED" | "ESCALATED" | "OVERRIDDEN" | "CANCELLED" | "ERROR" | string;
  severity: "INFO" | "WARNING" | "BLOCKED" | "CRITICAL" | string;
  category: "PRE_TRADE" | "PORTFOLIO" | "CAPITAL" | "POSITION_SIZE" | "MARGIN" | "LEVERAGE" | "CONCENTRATION" | "DAILY_LOSS" | "DRAWDOWN" | "MARKET_DATA" | "KILL_SWITCH" | "OVERRIDE" | "RECONCILIATION" | "SYSTEM" | string;
  blocking_gate?: string;
  blocking_reason?: string;
  plain_explanation: string;
  required_action?: string;
  max_passing_exposure?: number;
  policy_name?: string;
  policy_version: string;
  risk_engine_version: string;
  requested_quantity: number;
  requested_notional: number;
  requested_risk_usd: number;
  requested_risk_pct: number;
  observed_value: number;
  threshold_value: number;
  threshold_unit: string;
  data_source: string;
  data_timestamp?: string;
  data_age_ms: number;
  execution_status: "NOT_SUBMITTED" | "SUBMITTED" | "BROKER_REJECTED" | "FILLED" | "PARTIAL_FILL" | string;
  execution_message?: string;
  is_overridden: number | boolean;
  override_by?: string;
  override_reason?: string;
  override_timestamp?: string;
  is_acknowledged: number | boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  notes?: string;
  gates_summary?: Record<string, string>;
  portfolio_before?: {
    portfolio_exposure?: number;
    symbol_exposure?: number;
    margin_used_pct?: number;
    capital_used?: number;
  };
  portfolio_after?: {
    portfolio_exposure?: number;
    symbol_exposure?: number;
    margin_used_pct?: number;
    capital_used?: number;
  };
  risk_delta?: {
    capital_used_diff?: number;
    symbol_exposure_diff?: number;
    margin_diff_pct?: number;
    daily_risk_diff_pct?: number;
  };
  timeline?: Array<{ time: string; event: string }>;
  integrity_hash?: string;
  created_at: string;
  evaluated_at: string;
  source_timestamp?: string;
  gate_evaluations?: RiskGateEvaluation[];
}

export interface RiskAnalytics {
  total_events: number;
  approved_count: number;
  blocked_count: number;
  warnings_count: number;
  critical_count: number;
  overrides_count: number;
  live_events_count: number;
  approval_rate_pct: number;
  top_blocking_gates: Array<{ gate: string; count: number }>;
  policy_version: string;
  risk_engine_status: string;
  kill_switch_state: string;
}

export interface RiskEvent {
  id: number | string;
  timestamp: string;
  event_type: string;
  message: string;
  severity: "INFO" | "WARNING" | "CRITICAL" | "EMERGENCY" | string;
  symbol?: string;
  bot_id?: string;
  rule?: string;
  result?: "APPROVED" | "BLOCKED" | "WARNING" | "EXECUTED";
  order_id?: string;
  details?: any;
}

export interface PositionSizeResult {
  status: string;
  method: string;
  position_quantity: number;
  risk_amount: number;
  notional_value: number;
  margin_required: number;
  is_capital_capped?: boolean;
  capital_used?: number;
  maximum_loss?: number;
  potential_profit?: number;
  suggested_take_profit?: number;
  risk_reward_ratio?: number;
  cap_reason?: string;
  parameters_evaluated?: Record<string, any>;
}

export interface PreOrderRiskCheckResult {
  is_approved: boolean;
  risk_score: number;
  rejection_reasons: string[];
  warnings: string[];
  stage_results: Record<string, "PASSED" | "FAILED" | "WARNING">;
  reductions?: Record<string, number>;
  projected_exposure?: {
    current_exposure: number;
    additional_exposure: number;
    projected_exposure: number;
    exposure_limit: number;
  };
}

export interface WhatIfScenarioResult {
  scenario_id: string;
  scenario_name: string;
  price_shock_pct: number;
  vol_shock_pct: number;
  projected_pnl: number;
  projected_pnl_pct: number;
  projected_equity: number;
  risk_status: "NORMAL" | "WARNING" | "HIGH RISK" | "CRITICAL";
}

export interface WhatIfResult {
  status: string;
  mode: string;
  current: {
    exposure: number;
    exposure_pct: number;
    margin_used: number;
    margin_used_pct: number;
    portfolio_risk: number;
    portfolio_risk_pct: number;
  };
  after_trade: {
    exposure: number;
    exposure_pct: number;
    margin_used: number;
    margin_used_pct: number;
    portfolio_risk: number;
    portfolio_risk_pct: number;
  };
  change: {
    exposure_diff: number;
    exposure_pct_diff: number;
    margin_diff: number;
    risk_diff: number;
    risk_pct_diff: number;
  };
}

export interface OptionsRiskItem {
  underlying: string;
  expiry: string;
  strike: number;
  option_type: "CALL" | "PUT";
  quantity: number;
  premium: number;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  open_interest?: number;
  margin: number;
  max_profit: number;
  max_loss: number;
  breakeven: number;
}

export interface FuturesRiskItem {
  contract: string;
  expiry: string;
  quantity: number;
  entry_price: number;
  current_price: number;
  notional: number;
  margin: number;
  leverage: number;
  funding_rate_pct: number;
  open_interest?: number;
  liquidation_buffer_pct: number;
  stop_loss: number;
  max_loss: number;
}
