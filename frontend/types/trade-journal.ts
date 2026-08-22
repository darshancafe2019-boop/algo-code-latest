export interface TradeReview {
  trade_id: number;
  setup_quality: number;
  execution_quality: number;
  discipline_rating: number;
  confidence_before?: number;
  emotion_before?: string;
  emotion_during?: string;
  emotion_after?: string;
  entry_reasoning?: string;
  exit_reasoning?: string;
  mistakes?: string;
  lessons_learned?: string;
  emotional_state?: string;
  tags?: string[];
  playbook_id?: string;
  chart_snapshot_url?: string;
  follow_up_actions?: string;
  what_went_well?: string;
  what_went_wrong?: string;
  take_again_verdict?: string;
  automated_system_review?: string;
  strategy_compliance_score?: number;
  updated_at?: string;
}

export interface SystemReview {
  compliance_score: number;
  setup_grade: "A+ Setup" | "A Setup" | "B Setup" | "C Setup" | "Invalid Setup";
  good_points: string[];
  problem_points: string[];
  action_points: string[];
  system_review_text: string;
}

export interface TradeJournalRecord {
  id: number;
  trade_ref_id?: string;
  timestamp: string;
  symbol: string;
  canonical_symbol?: string;
  direction: string;
  side?: string;
  position_side?: string;
  entry_price: number;
  stop_loss?: number;
  take_profit?: number;
  position_size: number;
  quantity?: number;
  status: "OPEN" | "CLOSED" | "CANCELLED" | "REJECTED" | string;
  trade_status?: string;
  exit_price?: number;
  exit_timestamp?: string;
  result_pnl?: number;
  gross_pnl?: number;
  net_pnl?: number;
  fees?: number;
  taxes?: number;
  slippage?: number;
  r_multiple?: number;
  mae?: number;
  mfe?: number;
  bot_id?: string;
  bot_instance_id?: string;
  bot_instance_name?: string;
  strategy?: string;
  strategy_name?: string;
  strategy_version?: string;
  execution_mode?: "PAPER" | "LIVE" | string;
  exchange?: string;
  asset_class?: string;
  market?: string;
  timeframe?: string;
  leverage?: number;
  margin?: number;
  margin_used?: number;
  planned_risk?: number;
  actual_risk?: number;
  risk_amount?: number;
  risk_pct?: number;
  risk_percentage?: number;
  risk_reward_ratio?: number;
  return_pct?: number;
  duration_seconds?: number;
  duration_formatted?: string;
  market_regime?: string;
  signal_confidence?: number;
  confidence_score?: number;
  entry_reason?: string;
  exit_reason?: string;
  remarks?: string;
  metadata?: string;
  config_version?: string;
  emotion_tag?: string;
  is_reviewed?: boolean;
  review?: TradeReview | null;
  system_review?: SystemReview;
  strategy_compliance_score?: number;
  setup_grade?: string;
  indicator_snapshot_json?: string;
  signal_snapshot_json?: string;
  market_snapshot_json?: string;
  risk_snapshot_json?: string;
  exit_snapshot_json?: string;
}

export interface TradeJournalSummary {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  breakeven_trades: number;
  win_rate_pct: number;
  net_pnl: number;
  gross_profit: number;
  gross_loss: number;
  profit_factor: number;
  expectancy: number;
  average_win: number;
  average_loss: number;
  largest_win: number;
  largest_loss: number;
  max_drawdown_pct: number;
  average_holding_time: string;
  total_fees: number;
  total_slippage: number;
  average_risk_reward: number;
}

export interface TradeDetailPayload {
  success: boolean;
  trade_id: number;
  trade_ref_id?: string;
  overview: TradeJournalRecord;
  execution: {
    expected_entry: number;
    actual_entry: number;
    expected_exit?: number;
    actual_exit?: number;
    slippage: number;
    fees: number;
    latency_ms: number;
    order_type: string;
    fill_count: number;
    broker: string;
    exchange: string;
    execution_quality_score: number;
  };
  strategy: {
    name: string;
    signal_direction: string;
    signal_score: number;
    timeframe: string;
    indicators: Record<string, any>;
    conditions_met: string[];
    entry_reason: string;
    exit_reason: string;
  };
  risk: {
    risk_per_trade_dollars: number;
    risk_per_trade_pct: number;
    capital_before: number;
    capital_after: number;
    exposure_before: number;
    exposure_after: number;
    margin_used: number;
    leverage: number;
    drawdown_pct: number;
    daily_loss_pct: number;
    risk_gate_status: string;
  };
  pnl: {
    gross_pnl: number;
    net_pnl: number;
    return_pct: number;
    holding_duration: string;
    exit_reason: string;
  };
  fills: any[];
  lifecycle: any[];
  latencies: Record<string, number>;
  audit_events: any[];
  notes?: string;
  tag?: string;
}

export interface StrategyLeaderboardItem {
  strategy?: string;
  strategy_name?: string;
  trades_count?: number;
  total_trades?: number;
  win_rate_pct: number;
  net_pnl: number;
  profit_factor: number;
  expectancy: number;
  max_drawdown_pct?: number;
  sharpe_ratio?: number;
  avg_risk_reward?: number;
  avg_duration?: string;
}

export interface BotPerformanceItem {
  bot_id: string;
  bot_name: string;
  strategy?: string;
  trades_count?: number;
  total_trades?: number;
  win_rate_pct: number;
  net_pnl: number;
  status: string;
  execution_quality_score?: number;
  execution_quality?: number;
  drawdown_pct?: number;
  risk_status?: string;
  fees?: number;
}

export interface MarketPerformanceItem {
  symbol?: string;
  market_name?: string;
  asset_class: string;
  trades_count?: number;
  total_trades?: number;
  win_rate_pct: number;
  net_pnl: number;
  avg_volume?: number;
  profit_factor?: number;
}

export interface TimePerformanceItem {
  time_bucket?: string;
  period_label?: string;
  trades_count?: number;
  total_trades?: number;
  win_rate_pct: number;
  net_pnl: number;
  avg_return_pct?: number;
}

export interface PrimaryKPIs {
  net_pnl: number;
  win_rate_pct: number;
  profit_factor: number;
  expectancy_usd: number;
  total_closed_trades: number;
  open_positions_count: number;
  avg_risk_reward: number;
  max_drawdown_pct: number;
  review_completion_pct: number;
  reviewed_count: number;
}

export interface SecondaryKPIs {
  gross_profit: number;
  gross_loss: number;
  avg_win_usd: number;
  avg_loss_usd: number;
  largest_win_usd: number;
  largest_loss_usd: number;
  avg_hold_time: string;
  avg_slippage_usd: number;
  avg_mae_usd: number;
  avg_mfe_usd: number;
  fees_paid_usd: number;
  long_win_rate_pct: number;
  short_win_rate_pct: number;
  current_streak: number;
  current_streak_type: string;
}

export interface JournalKPISummary {
  primary: PrimaryKPIs;
  secondary: SecondaryKPIs;
}

export interface JournalCalendarDay {
  date: string;
  pnl: number;
  trades_count: number;
  win_rate: number;
  symbols: string[];
}

export interface MistakeStat {
  mistake: string;
  occurrences: number;
  total_pnl_impact: number;
  avg_loss: number;
  win_rate_pct: number;
  sample_evidence: string;
}

export interface EmotionStat {
  emotion: string;
  trades_count: number;
  win_rate_pct: number;
  net_pnl: number;
  avg_pnl_per_trade: number;
}

export interface StrategyStat {
  strategy: string;
  version: string;
  trades_count: number;
  win_rate_pct: number;
  profit_factor: number;
  expectancy_usd: number;
  net_pnl: number;
  trending_pnl: number;
  ranging_pnl: number;
  status: string;
}

export interface PlaybookRecord {
  id: string;
  name: string;
  category: string;
  description: string;
  required_conditions: string[];
  invalidation_rules: string[];
  target_rr: number;
  preferred_regime: string;
  mistakes_to_avoid: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ExecutionQualityAnalytics {
  r_distribution: Record<string, number>;
  avg_slippage: number;
  avg_mae: number;
  avg_mfe: number;
  total_samples: number;
}
