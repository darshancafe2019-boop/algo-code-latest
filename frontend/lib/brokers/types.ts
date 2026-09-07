/**
 * Normalized Multi-Broker Types & Common Broker Interfaces
 * Supports: Dhan, Upstox, Delta Exchange India
 */

export type BrokerName = "dhan" | "upstox" | "delta" | "paper";

export type TradingMode = "PAPER" | "LIVE";

export type OrderSide = "BUY" | "SELL";

export type OrderType = "MARKET" | "LIMIT" | "STOP_LOSS" | "STOP_LOSS_MARKET";

export type TimeInForce = "DAY" | "IOC" | "GTC";

export type OrderStatus =
  | "CREATED"
  | "SUBMITTING"
  | "SUBMITTED"
  | "OPEN"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "CANCEL_PENDING"
  | "CANCELLED"
  | "REJECTED"
  | "FAILED";

export interface AccountProfile {
  broker: BrokerName;
  clientId: string;
  clientIdMasked: string;
  accountName?: string;
  email?: string;
  tradingMode: TradingMode;
  connected: boolean;
  tokenExpiryUtc?: string;
  dataPlanActive?: boolean;
  lastUpdated: number;
}

export interface AccountFunds {
  broker: BrokerName;
  connected: boolean;
  availableBalance: number;
  availableMargin: number;
  usedMargin: number;
  collateral: number;
  withdrawable: number;
  currency: string;
  lastUpdated: number;
}

export interface Position {
  broker: BrokerName;
  symbol: string;
  instrumentId: string;
  side: OrderSide;
  quantity: number;
  averagePrice: number;
  ltp: number;
  unrealizedPnl: number;
  realizedPnl: number;
  productType: string;
  exchange: string;
  updatedAt: number;
}

export interface Holding {
  broker: BrokerName;
  symbol: string;
  isin?: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercentage: number;
  exchange: string;
}

export interface NormalizedOrder {
  clientOrderId: string;
  broker: BrokerName;
  symbol: string;
  instrumentId: string;
  side: OrderSide;
  quantity: number;
  orderType: OrderType;
  price?: number;
  triggerPrice?: number;
  timeInForce?: TimeInForce;
  productType?: string;
  strategyId?: string;
  tag?: string;
}

export interface OrderModification {
  quantity?: number;
  price?: number;
  triggerPrice?: number;
  orderType?: OrderType;
}

export interface OrderResult {
  success: boolean;
  clientOrderId: string;
  brokerOrderId?: string;
  status: OrderStatus;
  message?: string;
  errorCode?: string;
  filledQuantity?: number;
  averageFillPrice?: number;
  timestamp: number;
}

export interface Trade {
  tradeId: string;
  orderId: string;
  clientOrderId?: string;
  broker: BrokerName;
  symbol: string;
  instrumentId: string;
  side: OrderSide;
  quantity: number;
  price: number;
  executionTime: number;
}

export interface Instrument {
  broker: BrokerName;
  exchange: string;
  symbol: string;
  instrumentId: string;
  securityId?: string;
  instrumentKey?: string;
  segment: string;
  lotSize: number;
  tickSize: number;
  expiry?: string;
  strike?: number;
  optionType?: "CE" | "PE";
}

export interface MarketPrice {
  instrumentId: string;
  symbol: string;
  ltp: number;
  change?: number;
  changePct?: number;
  timestamp: number;
}

export interface OHLC {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface NormalizedTick {
  broker: BrokerName;
  instrumentId: string;
  symbol: string;
  exchange: string;
  timestamp: number;
  ltp?: number;
  bid?: number;
  ask?: number;
  volume?: number;
  openInterest?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

export type MarketDataCallback = (tick: NormalizedTick) => void;

export interface BrokerCapability {
  broker: BrokerName;
  brokerName: string;
  supportsOptions: boolean;
  supportsFutures: boolean;
  supportsEquities: boolean;
  supportsHoldings: boolean;
  supportsOrderModification: boolean;
  supportsWebSocket: boolean;
  supportsOptionChain: boolean;
  supportsSandbox: boolean;
  supportsLiveOrders: boolean;
  requiresStaticIp: boolean;
}

export interface BrokerError {
  broker: BrokerName;
  category:
    | "AUTH"
    | "NETWORK"
    | "RATE_LIMIT"
    | "VALIDATION"
    | "ORDER_REJECTED"
    | "INSUFFICIENT_FUNDS"
    | "MARKET_CLOSED"
    | "STALE_DATA"
    | "WEBSOCKET"
    | "BROKER_ERROR"
    | "UNKNOWN";
  code: string;
  message: string;
  retryable: boolean;
  timestamp: number;
}

export interface BrokerAdapter {
  readonly broker: BrokerName;
  readonly capabilities: BrokerCapability;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isAuthenticated(): boolean;

  getProfile(): Promise<AccountProfile>;
  getFunds(): Promise<AccountFunds>;
  getPositions(): Promise<Position[]>;
  getHoldings(): Promise<Holding[]>;
  getOrders(): Promise<OrderResult[]>;
  getTrades(): Promise<Trade[]>;

  getLTP(instruments: Instrument[]): Promise<MarketPrice[]>;
  getOHLC(instrument: Instrument, timeframe: string, count?: number): Promise<OHLC[]>;

  subscribeMarketData(instruments: Instrument[], callback: MarketDataCallback): Promise<void>;
  unsubscribeMarketData(instruments: Instrument[]): Promise<void>;

  placeOrder(order: NormalizedOrder): Promise<OrderResult>;
  modifyOrder(orderId: string, changes: OrderModification): Promise<OrderResult>;
  cancelOrder(orderId: string): Promise<OrderResult>;
}
