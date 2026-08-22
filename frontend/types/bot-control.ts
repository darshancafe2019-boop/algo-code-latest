export type BotStatus =
  | "RUNNING"
  | "PAUSED"
  | "STOPPED"
  | "CREATED"
  | "STARTING"
  | "PAUSING"
  | "RESUMING"
  | "STOPPING"
  | "ERROR"
  | "RISK_HALTED"
  | "HALTED"
  | "STALLED"
  | "DISCONNECTED";

export type BotExecutionMode = "PAPER" | "LIVE";

export type MarketAssetClass =
  | "crypto"
  | "equity"
  | "futures"
  | "options"
  | "forex"
  | "commodity";

export interface BotHealthInfo {
  is_process_alive: boolean;
  pid?: number;
  uptime_formatted?: string;
  uptime_seconds?: number;
  last_checked_seconds_ago?: number;
  last_heartbeat?: string;
  error_count?: number;
  last_error_message?: string;
  memory_usage_mb?: number;
  cpu_usage_pct?: number;
  latency_ms?: number;
}

export interface BotRiskConfig {
  allocated_capital: number;
  current_equity?: number;
  risk_per_trade_pct: number;
  max_position_size_pct: number;
  max_daily_loss: number;
  max_drawdown_pct: number;
  max_open_positions: number;
  leverage: number;
  lot_size?: number;
  stop_loss_type: "ATR" | "PERCENT" | "FIXED_PRICE";
  stop_loss_value: number;
  take_profit_type: "RR_RATIO" | "ATR" | "PERCENT" | "FIXED_PRICE";
  take_profit_value: number;
  trailing_stop_enabled: boolean;
  trailing_stop_activation?: number;
  trailing_stop_callback?: number;
  auto_square_off_enabled: boolean;
  auto_square_off_time?: string;
  cooldown_bars?: number;
  kill_switch_active?: boolean;
}

export interface BotInstanceExtended {
  id: string;
  name: string;
  symbol: string;
  strategy: string;
  timeframe: string;
  asset_class?: MarketAssetClass;
  exchange?: string;
  execution_mode: BotExecutionMode;
  status: BotStatus;
  allocated_capital: number;
  current_equity?: number;
  live_pnl?: number;
  realized_pnl?: number;
  unrealized_pnl?: number;
  open_trades?: number;
  required_confidence?: number;
  created_at?: string;
  updated_at?: string;
  last_heartbeat?: string;
  template_id?: string;
  group_name?: string;
  config?: Record<string, any>;
  risk?: BotRiskConfig;
  health?: BotHealthInfo;
  indicators?: string[];
  last_signal?: {
    direction: "BUY" | "SELL" | "HOLD" | "WAIT";
    confidence: number;
    score?: number;
    timestamp: string;
    reason: string;
    regime?: string;
    factors?: Record<string, any>;
  };
  last_order?: {
    id: string;
    side: "BUY" | "SELL";
    price: number;
    qty: number;
    status: string;
    timestamp: string;
  };
  last_trade?: {
    id: string | number;
    pnl: number;
    exit_reason: string;
    timestamp: string;
  };
}

export interface BotMetricsSummary {
  total_bots: number;
  running: number;
  paused: number;
  stopped: number;
  paper: number;
  live: number;
  error: number;
  risk_halted?: number;
  total_capital?: number;
  allocated_capital?: number;
  available_capital?: number;
  current_exposure?: number;
  start_balance: number;
  current_balance: number;
  current_equity: number;
  total_trades: number;
  open_trades: number;
  closed_trades: number;
  wins: number;
  losses: number;
  breakeven: number;
  win_rate_pct: number;
  profit_factor: number;
  profit_factor_display?: string;
  w_l_be: string;
  today_pnl: number;
  total_pnl: number;
  system_latency_ms?: number;
  websocket_status?: "CONNECTED" | "CONNECTING" | "DISCONNECTED";
  worker_health_pct?: number;
  last_updated?: string;
}

export interface BotDecisionLogItem {
  id: string | number;
  timestamp: string;
  bot_id: string;
  bot_name?: string;
  symbol: string;
  event_type: "SIGNAL_EVAL" | "ORDER_SUBMITTED" | "ORDER_FILLED" | "STOP_LOSS_UPDATED" | "RISK_CHECK" | "SYSTEM_EVENT" | "ERROR";
  decision: "BUY_READY" | "SELL_READY" | "HOLD" | "WAIT" | "ORDER_SENT" | "RISK_REJECTED" | "ERROR";
  reason: string;
  score: number;
  confidence?: number;
  price?: number;
  risk_status: "PASSED" | "BLOCKED" | "WARNING";
  order_id?: string;
  indicators?: Record<string, number | string>;
  regime?: string;
}

export interface BotOrderLifecycleItem {
  id: string;
  bot_id: string;
  bot_name?: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT" | "STOP_MARKET";
  qty: number;
  price: number;
  filled_qty?: number;
  avg_fill_price?: number;
  status:
    | "CREATED"
    | "VALIDATING"
    | "RISK_CHECK"
    | "SUBMITTED"
    | "OPEN"
    | "PARTIAL"
    | "FILLED"
    | "REJECTED"
    | "CANCELLED"
    | "FAILED";
  timestamp: string;
  reject_reason?: string;
}

export interface BotPositionItem {
  id: string;
  bot_id: string;
  bot_name?: string;
  symbol: string;
  side: "LONG" | "SHORT";
  qty: number;
  entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  realized_pnl: number;
  stop_loss?: number;
  take_profit?: number;
  margin?: number;
  leverage?: number;
  duration?: string;
  entry_time: string;
}

export interface MarketContextData {
  symbol: string;
  price: number;
  change_24h_pct: number;
  high_24h: number;
  low_24h: number;
  volume_24h: number;
  trend_regime: "TRENDING_BULL" | "TRENDING_BEAR" | "RANGING" | "HIGH_VOLATILITY" | "CHOPPY";
  volatility_atr: number;
  funding_rate_pct?: number;
  open_interest?: number;
  session_status: "OPEN" | "CLOSED" | "PRE_MARKET" | "AFTER_HOURS";
  data_quality: "EXCELLENT" | "DEGRADED" | "STALE" | "DISCONNECTED";
  last_updated: string;
}
