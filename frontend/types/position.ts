import { ProviderType } from "./bot";

export type PositionDirection = "LONG" | "SHORT" | "FLAT";

export interface CanonicalPosition {
  id: string;
  bot_id: string;
  provider: ProviderType;
  symbol: string;
  instrument_id: string;
  direction: PositionDirection;
  quantity: number;
  average_entry_price: number;
  current_price: number;
  realized_pnl: number;
  unrealized_pnl: number;
  total_pnl: number;
  opened_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface PnLSummary {
  bot_id: string;
  realized_pnl: number;
  unrealized_pnl: number;
  fees: number;
  net_pnl: number;
  currency: string;
  updated_at: string;
}
