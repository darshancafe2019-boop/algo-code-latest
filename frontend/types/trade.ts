import { OrderSide } from "./order";
import { ProviderType } from "./bot";

export interface CanonicalTrade {
  id: string;
  order_id: string;
  bot_id: string;
  provider_trade_id?: string | null;
  provider: ProviderType;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  fees: number;
  timestamp: string;
  metadata?: Record<string, any>;
}
