export type DecisionStateType =
  | "INITIALIZING"
  | "WAITING_FOR_DATA"
  | "WAITING_FOR_CANDLE"
  | "WATCHING"
  | "SETUP_FORMING"
  | "WAITING_FOR_CONFIRMATION"
  | "NO_SIGNAL"
  | "SIGNAL_CANDIDATE"
  | "SIGNAL_READY"
  | "RISK_CHECKING"
  | "RISK_BLOCKED"
  | "ENTRY_APPROVED"
  | "ORDER_PENDING"
  | "POSITION_OPEN"
  | "EXIT_WATCH"
  | "EXIT_SIGNAL"
  | "INVALIDATED"
  | "DATA_STALE"
  | "ERROR";

export type RuleStatusType =
  | "PASS"
  | "WAITING"
  | "FAIL"
  | "INVALIDATED"
  | "WAITING_FOR_CANDLE_CLOSE"
  | "NOT_READY"
  | "NOT_APPLICABLE"
  | "STALE"
  | "ERROR";

export type DistanceStatusType =
  | "FAR"
  | "APPROACHING"
  | "NEAR_TRIGGER"
  | "TRIGGERED"
  | "INVALIDATED";

export interface PillarConfluenceItem {
  pillar: string;
  earned: number;
  max: number;
  status: "PASS" | "PARTIAL" | "WAITING" | "LOW" | "NEUTRAL" | "MODERATE" | "MIXED";
}

export interface ConfluenceBreakdown {
  formula_version: string;
  strategy_version: string;
  calculated_at: string;
  rule_score: number;
  model_confidence: number;
  calibrated_probability: string;
  pillars: PillarConfluenceItem[];
  total_score: number;
  required_score: number;
  status?: string;
  note?: string;
}

export interface TimeframeMatrixItem {
  timeframe: string;
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  score: number;
  rsi: number;
  ema_trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  macd_hist: number;
  close: number;
}

export interface TimeframeMatrixResponse {
  symbol: string;
  overall_regime: "BULLISH" | "BEARISH" | "NEUTRAL";
  alignment: string;
  conflict: string;
  matrix: TimeframeMatrixItem[];
  bull_score: number;
  bear_score: number;
}

export interface RuleEvaluationItem {
  rule_id?: string;
  rule: string;
  category: "TREND" | "MOMENTUM" | "VOLUME" | "STRUCTURE" | "RISK";
  rule_type?: "GREATER_THAN" | "GREATER_EQUAL" | "LESS_THAN" | "LESS_EQUAL" | "CROSS_ABOVE" | "CROSS_BELOW" | string;
  comparator?: string;
  passed: boolean;
  status?: RuleStatusType | string;
  live_value: string;
  prev_value?: string;
  threshold: string;
  distance_to_trigger?: number;
  completion_pct?: number;
  distance_status?: DistanceStatusType | string;
  distance_label?: string;
  candle_state?: "LIVE" | "CLOSED" | string;
  eval_mode?: "CLOSED_CANDLE" | "LIVE_CANDLE" | string;
  details: string;
  last_changed?: string;
}

export interface RankedBlockerItem {
  priority: number;
  type: string;
  name: string;
  reason: string;
}

export interface PrimaryBlockerData {
  name: string;
  category: string;
  current_value: string;
  required_threshold: string;
  difference: string;
  distance: number;
  completion_pct: number;
  distance_status: DistanceStatusType | string;
  candle_state: "LIVE" | "CLOSED" | string;
  candle_mode: string;
  time_remaining: string;
  next_evaluation: string;
  ranked_priority?: number;
  ranked_blockers?: RankedBlockerItem[];
  action_required: string;
}

export interface EntryReadinessData {
  trend: "READY" | "INVALIDATED" | "WAITING" | string;
  ema_alignment: "READY" | "WAITING" | "INVALIDATED" | string;
  momentum: "READY" | "WAITING" | "FAIL" | string;
  volume: "READY" | "WAITING" | "LOW" | string;
  risk: "READY" | "BLOCKED" | "WARNING" | string;
  overall_state: string;
  strategy_rules_ready: number;
  strategy_rules_total: number;
  risk_gates_passed: number;
  risk_gates_total: number;
}

export interface RiskGateItem {
  gate: string;
  status: "PASS" | "FAIL" | "WARNING";
  current: string;
  limit: string;
  details: string;
}

export interface RiskAssessmentData {
  overall_status: "PASS" | "BLOCKED" | "WARNING";
  all_passed: boolean;
  blocking_gate?: string | null;
  blocking_reason: string;
  gates: RiskGateItem[];
  open_exposure: number;
  symbol_exposure: number;
  daily_loss_used_pct: number;
  drawdown_pct: number;
}

export interface MarketContextData {
  symbol: string;
  asset_class: "CRYPTO" | "EQUITY" | "FUTURES" | "OPTIONS";
  last_price: number;
  mark_price: number;
  index_price: number;
  change_24h_pct: number;
  volume_24h: number;
  atr_14: number;
  volatility: string;
  funding_rate: string;
  open_interest: string;
  basis: string;
  session: string;
  spread: string;
}

export interface IndicatorSnapshotData {
  price: number;
  ema9: number;
  ema21: number;
  ema50: number;
  ema200: number;
  rsi: number;
  prev_rsi?: number;
  macd: {
    line: number;
    signal: number;
    hist: number;
  };
  adx: number;
  atr: number;
  vwap: number;
  volume: number;
  avg_volume: number;
  provenance?: {
    engine: string;
    provider: string;
    timeframe: string;
    source: string;
    candle_timestamp?: string;
    calculated_at: string;
  };
}

export interface RecentChangeItem {
  timestamp: string;
  field: string;
  from_val: string;
  to_val: string;
  summary: string;
}

export interface StructuredExplanation {
  fact: string;
  derived: string;
  what_needs_to_happen?: string;
  what_would_trigger_entry?: string[];
  ai_summary: string;
}

export interface IntelligenceSnapshot {
  snapshot_id: string;
  evaluation_id?: string;
  timestamp: string;
  evaluation_time_ms: number;
  bot: {
    id: string;
    name: string;
    symbol: string;
    timeframe: string;
    strategy: string;
    strategy_version: string;
    bot_version: string;
    execution_mode: "PAPER" | "LIVE";
    account_id: string;
    status: string;
  };
  data_health: {
    status: "HEALTHY" | "DEGRADED" | "STALE";
    provider: string;
    age_ms: number;
    latency_label: string;
    is_stale: boolean;
  };
  decision: {
    state: DecisionStateType;
    why_no_trade: string;
    blocking_rule: string;
    next_condition_required: string;
    structured_explanation: StructuredExplanation;
  };
  primary_blocker?: PrimaryBlockerData;
  entry_readiness?: EntryReadinessData;
  rules_evaluation: RuleEvaluationItem[];
  confluence: ConfluenceBreakdown;
  timeframe_matrix: TimeframeMatrixResponse;
  risk_assessment: RiskAssessmentData;
  market_context: MarketContextData;
  indicators: IndicatorSnapshotData;
  recent_changes: RecentChangeItem[];
}

export interface WhatIfSimulationResponse {
  status: string;
  is_simulation: boolean;
  disclaimer: string;
  simulated_inputs: {
    rsi: number;
    price: number;
    volume: number;
  };
  simulated_state: string;
  rules_ready: string;
  rules_evaluation: RuleEvaluationItem[];
  fresh_risk_required: boolean;
  explanation: string;
}

export interface SafeActionPreview {
  action_type: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  order_type: "LIMIT" | "MARKET";
  quantity: number;
  estimated_price: number;
  stop_loss: number;
  take_profit: number;
  required_margin: number;
  maximum_risk: number;
  execution_mode: "PAPER" | "LIVE";
  risk_status: "APPROVED" | "BLOCKED";
  risk_message: string;
  requires_explicit_confirmation: boolean;
}

export interface AssistantCommandResponse {
  command_id: string;
  timestamp: string;
  prompt: string;
  intent_type: string;
  target_tab: string;
  is_action: number;
  requires_confirmation: boolean;
  explanation: string;
  response: {
    intent_type: string;
    explanation: string;
    action_preview?: SafeActionPreview;
    decision?: any;
    rules?: any[];
    confluence?: any;
    risk?: any;
    timeframe_matrix?: any;
    route?: string;
  };
}
