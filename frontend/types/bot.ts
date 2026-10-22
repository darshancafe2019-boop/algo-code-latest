export type BotStatus =
  | "DRAFT"
  | "VALIDATING"
  | "READY"
  | "STARTING"
  | "RUNNING"
  | "PAUSING"
  | "PAUSED"
  | "RESUMING"
  | "STOPPING"
  | "STOPPED"
  | "ERROR"
  | "DISABLED";

export type AssetClass = "CRYPTO" | "EQUITY" | "FUTURES" | "OPTIONS" | "FOREX";
export type Exchange = "DELTA" | "UPSTOX" | "DHAN" | "BINANCE" | "PAPER";
export type ProviderType = "PAPER" | "DELTA" | "UPSTOX" | "DHAN" | "SIMULATED";
export type ExecutionMode = "PAPER" | "LIVE" | "SHADOW";

export interface MarketConfig {
  asset_class: AssetClass;
  exchange: Exchange;
  symbol: string;
  instrument_id: string;
  instrument_type: string;
}

export interface DataProviderConfig {
  provider: ProviderType;
  connection_id: string | null;
}

export interface ExecutionConfig {
  provider: ProviderType;
  mode: ExecutionMode;
}

export interface StrategyConfig {
  type: string;
  timeframe: string;
  parameters: Record<string, any>;
}

export interface RiskConfig {
  quantity: number;
  max_position_size: number;
  max_order_notional?: number;
  max_loss_per_trade: number;
  max_daily_loss: number;
  stop_loss?: number | null;
  take_profit?: number | null;
  max_market_data_age_ms?: number;
}

export interface BotConfig {
  id: string;
  name: string;
  status: BotStatus;
  market: MarketConfig;
  data_provider: DataProviderConfig;
  execution: ExecutionConfig;
  strategy: StrategyConfig;
  risk: RiskConfig;
  kill_switch: "ARMED" | "TRIGGERED" | "RESET_REQUIRED";
  created_at: string;
  updated_at: string;
  currency?: string;
  open_contracts?: number;
  pnl?: {
    realized_pnl: number;
    unrealized_pnl: number;
    net_pnl: number;
    gross_pnl?: number;
    fees: number;
    currency?: string;
  };
  positions_count?: number;
  trades_count?: number;
}

export interface BotValidationCheck {
  name: string;
  status: "PASS" | "FAIL" | "WARN";
  message?: string | null;
}

export interface BotValidationResult {
  valid: boolean;
  checks: BotValidationCheck[];
}

export interface BotSnapshot {
  bot: BotConfig;
  market?: {
    provider: ProviderType;
    symbol: string;
    bid: number;
    ask: number;
    last: number;
    volume: number;
    source: string;
    mode: string;
    timestamp_received: string;
  } | null;
  provider_health: {
    provider: ProviderType;
    status: string;
    authenticated: boolean;
    last_seen: string | null;
    latency_ms: number | null;
    message: string | null;
  };
  execution_health: {
    provider: ProviderType;
    status: string;
    authenticated: boolean;
    latency_ms: number | null;
  };
  risk: {
    kill_switch: {
      global_status: string;
      global_reason: string | null;
      bot_status?: string;
      bot_reason?: string | null;
    };
    config: RiskConfig;
  };
  open_orders: any[];
  orders: any[];
  positions: any[];
  latest_trades: any[];
  pnl: {
    realized_pnl: number;
    unrealized_pnl: number;
    fees: number;
    net_pnl: number;
    currency: string;
  };
  latest_events: Array<{
    id: string;
    event_type: string;
    severity: string;
    message: string;
    timestamp: string;
  }>;
}
