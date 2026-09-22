/**
 * Canonical Option Order Intent & Direct Execution Types
 * ======================================================
 * Strict specification for Option Chain Direct Order Execution.
 */

export type OptionType = "CALL" | "PUT";
export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT" | "SL" | "SL-M";
export type ProductType = "INTRADAY" | "DELIVERY" | "NORMAL" | "MARGIN";
export type TradingMode = "PAPER" | "LIVE";

export type OrderExecutionStatus =
  | "SUBMITTING"
  | "SUBMITTED"
  | "PENDING"
  | "PART_TRADED"
  | "TRADED"
  | "FILLED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

export interface OptionOrderIntent {
  broker: string;
  exchange: string;
  underlying: string;
  securityId: string;
  tradingSymbol: string;
  expiry: string;
  strike: number;
  optionType: OptionType;
  side: OrderSide;
  quantity: number;
  lots: number;
  lotSize: number;
  orderType: OrderType;
  price: number;
  triggerPrice?: number;
  stopLoss?: number;
  target?: number;
  productType: ProductType;
  mode: TradingMode;
  timestamp: string;

  // Ancillary telemetry / quote data (strictly non-sensitive)
  clientOrderId?: string;
  correlationId?: string;
  ltp?: number;
  bid?: number;
  ask?: number;
  iv?: number;
  oi?: number;
  quoteStatus?: "LIVE" | "DELAYED" | "STALE" | "UNKNOWN" | "INVALID" | "NO_DATA";
}

export interface OptionOrderPreview {
  broker: string;
  symbol: string;
  expiry: string;
  strike: number;
  optionType: OptionType;
  side: OrderSide;
  quantity: number;
  lots: number;
  lotSize: number;
  price: number;
  orderType: OrderType;
  requiredMargin: number;
  estimatedFees: number;
  availableCapital: number;
  riskAmount: number;
  mode: TradingMode;
}

export interface DirectOrderResult {
  status: "success" | "rejected" | "error";
  orderId: string;
  broker: string;
  timestamp: string;
  filledQty: number;
  remainingQty: number;
  averagePrice: number;
  executionStatus: OrderExecutionStatus;
  mode: TradingMode;
  symbol: string;
  side: OrderSide;
  optionType: OptionType;
  strike: number;
  errorReason?: string;
  errorCode?: string;
  message?: string;
}

export interface RecentDirectOrder {
  orderId: string;
  time: string;
  broker: string;
  symbol: string;
  strike: number;
  optionType: OptionType;
  side: OrderSide;
  qty: number;
  price: number;
  status: OrderExecutionStatus;
  mode: TradingMode;
  fees?: number;
}

/**
 * Standard Lot Size Resolver based on Indian and Crypto exchange specs.
 */
export function getStandardOptionLotSize(underlying: string): number {
  const u = (underlying || "").toUpperCase().replace(".NS", "").replace(" ", "");
  if (["BTC", "ETH", "SOL", "XRP", "BNB", "DOGE"].includes(u)) return 1;
  if (u === "BANKNIFTY" || u === "BANK_NIFTY") return 15;
  if (u === "FINNIFTY" || u === "FIN_NIFTY") return 25;
  if (u === "MIDCPNIFTY" || u === "MIDCP_NIFTY") return 75;
  if (u === "SENSEX") return 10;
  if (u === "BANKEX") return 15;
  if (u === "RELIANCE") return 250;
  if (u === "TCS") return 175;
  if (u === "INFY") return 400;
  if (u === "HDFCBANK") return 550;
  if (u === "ICICIBANK") return 700;
  if (u === "SBIN") return 750;
  if (u === "TATAMOTORS") return 575;
  if (u.includes("NIFTY")) return 50;
  return 1;
}
