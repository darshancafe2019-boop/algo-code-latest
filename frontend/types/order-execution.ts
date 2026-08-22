export type OrderSide = "BUY" | "SELL";

export type OrderType = "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT" | "TRAILING_STOP" | "BRACKET";

export type QuantityMode = "UNITS" | "LOTS" | "NOTIONAL";

export type ExecutionMode = "PAPER" | "LIVE";

export interface RiskGateCheck {
  gate_id: string;
  gate_name: string;
  status: "PASS" | "WARNING" | "FAIL";
  message: string;
  current_value?: string | number;
  limit_value?: string | number;
}

export interface OrderRiskPreview {
  symbol: string;
  direction: "LONG" | "SHORT";
  order_type: OrderType;
  quantity: number;
  lots?: number;
  lot_size?: number;
  entry_price: number;
  notional_value: number;
  required_margin: number;
  available_margin: number;
  margin_utilization_pct: number;
  leverage: number;
  stop_loss_price: number;
  stop_loss_risk_usd: number;
  stop_loss_pct: number;
  take_profit_price: number;
  take_profit_potential_usd: number;
  take_profit_pct: number;
  risk_reward_ratio: number;
  estimated_slippage_pct: number;
  portfolio_exposure_pct: number;
  liquidation_price?: number;
  checks: Record<string, RiskGateCheck>;
  can_execute: boolean;
  block_reason?: string;
}

export interface PositionSnapshot {
  symbol: string;
  direction: "LONG" | "SHORT" | "FLAT";
  quantity: number;
  entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  margin_used: number;
  liquidation_price?: number;
  leverage: number;
}

export interface OrderExecutionResult {
  status: "success" | "rejected" | "error";
  order_id?: string;
  trade_id?: number | string;
  client_order_id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  execution_mode: ExecutionMode;
  message?: string;
  timestamp: string;
  latency_ms?: number;
}
