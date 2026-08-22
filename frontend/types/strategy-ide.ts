/**
 * Canonical Type Definitions for World-Class Strategy Research & Deployment IDE
 */

export type RuleTimeframe = "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w";

export type StrategyMarketType = "crypto" | "equity" | "futures" | "options" | "forex" | "commodity";

export type StrategyDirection = "LONG" | "SHORT" | "BOTH";

export type StrategyStatus = "DRAFT" | "VALIDATED" | "SAVED" | "APPROVED" | "PUBLISHED" | "DEPLOYED" | "PAUSED" | "RETIRED";

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
  | "outside_range";

export interface StrategyIdeRule {
  id: string;
  timeframe: RuleTimeframe;
  left: string;
  leftLabel: string;
  op: RuleOperator | string;
  right: string;
  rightLabel: string;
  category: "PRICE" | "TREND" | "MOMENTUM" | "VOLATILITY" | "VOLUME" | "STRUCTURE" | "RISK";
  enabled: boolean;
  description?: string;
}

export interface StrategyIdeRuleGroup {
  conjunction: "AND" | "OR";
  rules: StrategyIdeRule[];
}

export interface StrategyIdeEntry {
  setup: StrategyIdeRuleGroup;
  confirmation: StrategyIdeRuleGroup;
  trigger: StrategyIdeRuleGroup;
}

export interface MultiTargetExit {
  ratio: number;
  pct: number;
}

export interface StrategyIdeExit {
  stop_loss_type: "ATR" | "PERCENT" | "FIXED_PRICE" | "TRAILING";
  stop_loss_value: number;
  take_profit_type: "RR_RATIO" | "ATR" | "PERCENT" | "FIXED_PRICE";
  take_profit_value: number;
  multi_target?: MultiTargetExit[];
  trailing_stop_enabled: boolean;
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
  max_drawdown_pct: number;
  max_open_positions: number;
  leverage: number;
  cooldown_bars: number;
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
  base_timeframe: RuleTimeframe;
  direction: StrategyDirection;
  entry: StrategyIdeEntry;
  exit: StrategyIdeExit;
  risk: StrategyIdeRisk;
  author?: string;
  tags?: string[];
  config_hash?: string;
  compiled_expression?: string;
  created_at?: string;
  updated_at?: string;
  // Legacy support
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
  category: "MARKET" | "RULES" | "EXIT" | "RISK" | "INDICATOR";
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
