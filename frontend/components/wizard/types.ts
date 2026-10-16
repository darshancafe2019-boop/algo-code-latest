export type MarketType =
  | "INDIA_STOCK"
  | "INDIA_FUTURE"
  | "INDIA_OPTION"
  | "MCX_FUTURE"
  | "CRYPTO_SPOT"
  | "CRYPTO_FUTURE"
  | "CRYPTO_OPTION"
  | "FOREX"
  | "US_STOCK";

export type ExecutionMode = "PAPER" | "LIVE";
export type ProviderType = "DELTA" | "BINANCE" | "UPSTOX" | "DHAN" | "ALPACA" | "FYERS" | "ANGEL" | "ZERODHA" | "PAPER";

export interface SelectedLeg {
  symbol: string;
  strike: number;
  option_type: "CE" | "PE";
  side: "BUY" | "SELL";
  ratio: number;
  premium: number;
  lot_size: number;
  expiry: string;
  greeks?: {
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
    iv?: number;
    greeks_source?: string;
  };
}

export interface SelectedContract {
  instrument_id: string;
  symbol: string;
  underlying: string;
  expiry: string;
  strike: number | null;
  option_type: "CE" | "PE" | null;
  premium: number;
  bid: number;
  ask: number;
  volume: number;
  open_interest: number;
  lot_size: number;
  tick_size: number;
  provider: string;
  exchange: string;
  timestamp: string;
  is_live: boolean;
  greeks?: {
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
    iv?: number;
    greeks_source?: string;
  };
}

export interface IndicatorCondition {
  id: string;
  indicator_id: string;
  indicator_name: string;
  timeframe: string;
  params: Record<string, any>;
  operator: "ABOVE" | "BELOW" | "CROSS_ABOVE" | "CROSS_BELOW" | "EQUAL" | "GREATER_THAN" | "LESS_THAN" | "BETWEEN";
  target_type: "VALUE" | "INDICATOR" | "PRICE";
  target_value?: number;
  target_indicator_id?: string;
  logical_operator: "AND" | "OR" | "NOT";
}

export interface StrategyConfig {
  strategy_id: string;
  strategy_name: string;
  category: string;
  timeframe: string;
  parameters: Record<string, any>;
  entry_logic: string;
  exit_logic: string;
  compatible: boolean;
  compatibility_reason?: string;
}

export interface OptionStrategyConfig {
  strategy_id: string;
  strategy_name: string;
  market_view: string;
  enabled: boolean;
  legs: SelectedLeg[];
  net_cost: number;
  cost_type: "DEBIT" | "CREDIT";
  max_profit: number | "UNLIMITED";
  max_loss: number | "UNLIMITED";
  breakevens: number[];
  greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
  payoff_points: Array<{ underlying_price: number; pnl: number }>;
}

export interface RiskConfig {
  stop_loss_mode: "FIXED_POINTS" | "PERCENTAGE" | "ATR" | "PREMIUM_PCT" | "SWING_HIGH_LOW" | "INDICATOR_BASED";
  stop_loss_value: number;
  take_profit_mode: "FIXED_POINTS" | "PERCENTAGE" | "RISK_REWARD" | "TARGET_LEVEL" | "INDICATOR_BASED";
  take_profit_value: number;
  trailing_stop_mode: "OFF" | "POINTS" | "PERCENTAGE" | "ATR" | "STEP_TRAILING";
  trailing_stop_value: number;
  max_daily_loss: number;
  max_drawdown_pct: number;
  risk_per_trade: number;
  max_position_size: number;
  max_trades_per_day: number;
  max_open_positions: number;
  max_total_exposure: number;
  order_type: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
  trading_style: "SCALPING" | "INTRADAY" | "SWING" | "POSITIONAL";
  auto_square_off_time: string; // e.g. "15:15"
}

export interface BotWizardDraft {
  // Step 1: Identity & Capital
  bot_name: string;
  market_type: MarketType;
  underlying: string;
  timeframe: string;
  broker: ProviderType;
  execution_mode: ExecutionMode;
  capital_allocation: number;
  available_funds: number | "UNAVAILABLE";
  available_funds_reason?: string;

  // Step 2: Live Selected Contract
  contract: SelectedContract | null;

  // Step 3: Indicators
  indicators: IndicatorCondition[];

  // Step 4: Option Strategy
  option_strategy: OptionStrategyConfig | null;

  // Step 5: Trading Strategy
  trading_strategy: StrategyConfig | null;

  // Step 6: Risk Management
  risk: RiskConfig;
}

export function formatPositionBotName(symbolOrPosition?: string | null, typeOrStrat?: string | null): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day} ${hours}:${minutes}`;

  const cleanSym = (symbolOrPosition || "POSITION").trim();
  if (typeOrStrat && !cleanSym.includes(typeOrStrat)) {
    return `${cleanSym} ${typeOrStrat} [${dateStr}]`;
  }
  return `${cleanSym} [${dateStr}]`;
}
