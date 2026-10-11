import { ProviderType } from "./bot";

export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
export type OrderStatus =
  | "CREATED"
  | "VALIDATING"
  | "SUBMITTED"
  | "ACKNOWLEDGED"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "CANCEL_PENDING"
  | "CANCELLED"
  | "REJECTED"
  | "EXPIRED"
  | "ERROR"
  | "UNKNOWN";

export type TimeInForce = "GTC" | "IOC" | "FOK" | "DAY";

export interface CanonicalOrder {
  id: string;
  client_order_id: string;
  bot_id: string;
  provider: ProviderType;
  broker_order_id?: string | null;
  symbol: string;
  instrument_id: string;
  side: OrderSide;
  order_type: OrderType;
  quantity: number;
  filled_quantity: number;
  remaining_quantity: number;
  price?: number | null;
  average_fill_price?: number | null;
  trigger_price?: number | null;
  time_in_force: TimeInForce;
  status: OrderStatus;
  created_at: string;
  submitted_at?: string | null;
  updated_at: string;
  rejected_reason?: string | null;
  latency_ms?: number | null;
  metadata?: Record<string, any>;
}
