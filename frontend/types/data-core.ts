/**
 * Authoritative Quant.OS Data Core Types
 * ======================================
 * Strict type contracts matching QuantDataCore backend domains.
 */

export type Environment = "PAPER" | "LIVE";

export type ProviderStatus =
  | "LIVE"
  | "CONNECTED"
  | "RECEIVING"
  | "STALE"
  | "RECONNECTING"
  | "AUTH_REQUIRED"
  | "NOT_ENTITLED"
  | "RATE_LIMITED"
  | "OFFLINE"
  | "ERROR";

export type EventDomain =
  | "MARKET_DATA"
  | "ACCOUNT"
  | "POSITION"
  | "ORDER"
  | "FILL"
  | "CAPITAL"
  | "RISK"
  | "SYSTEM";

export type EventType =
  | "MARKET_TICK"
  | "QUOTE"
  | "TRADE"
  | "DEPTH"
  | "CANDLE"
  | "OI"
  | "FUNDING"
  | "GREEKS"
  | "BALANCE_UPDATE"
  | "MARGIN_UPDATE"
  | "POSITION_OPENED"
  | "POSITION_UPDATED"
  | "POSITION_CLOSED"
  | "ORDER_CREATED"
  | "ORDER_ACCEPTED"
  | "ORDER_REJECTED"
  | "ORDER_OPEN"
  | "ORDER_PARTIAL_FILL"
  | "ORDER_FILLED"
  | "ORDER_CANCELLED"
  | "TRADE_FILL"
  | "PNL_UPDATE"
  | "CAPITAL_ALLOCATION"
  | "RECONCILIATION_HEALTHY"
  | "RECONCILIATION_DRIFT"
  | "PROVIDER_CONNECTED"
  | "PROVIDER_DISCONNECTED"
  | "PROVIDER_STALE"
  | "PROVIDER_ERROR";

export interface ProviderCapabilities {
  marketData: boolean;
  execution: boolean;
  account: boolean;
}

export interface ProviderInfo {
  providerId: string;
  name: string;
  capabilities: ProviderCapabilities;
  marketDataConnected: boolean;
  accountConnected: boolean;
  executionConnected: boolean;
  authenticated: boolean;
  environment: Environment;
  latencyMs: number;
  lastMarketPacket: string | null;
  lastAccountUpdate: string | null;
  lastOrderUpdate: string | null;
  subscriptionsCount: number;
  messagesPerSecond: number;
  errorsCount: number;
  reconnectCount: number;
  status: ProviderStatus;
  statusMessage: string;
}

export interface BrokerAccount {
  provider: string;
  broker: string;
  accountId: string;
  accountName: string;
  environment: Environment;
  currency: string;
  cashBalance: number;
  availableCash: number;
  collateral: number;
  marginUsed: number;
  availableMargin: number;
  buyingPower: number;
  realizedPnL: number;
  unrealizedPnL: number;
  fees: number;
  equity: number;
  positionsCount: number;
  openOrdersCount: number;
  lastUpdated: string;
  status: string;
  statusMessage: string;
}

export interface PositionItem {
  positionId: string;
  provider: string;
  marketDataProvider: string;
  executionBroker: string;
  accountId: string;
  environment: Environment;
  symbol: string;
  canonicalInstrumentId: string;
  instrumentId: string;
  exchange: string;
  assetClass: string;
  strategyId?: string | null;
  botId?: string | null;
  side: "LONG" | "SHORT" | "FLAT";
  quantity: number;
  lotSize: number;
  entryPrice: number;
  averageEntry: number;
  markPrice: number;
  feedAgeMs: number;
  marketValue: number;
  notionalValue: number;
  realizedPnL: number;
  realizedPnLScope: string;
  unrealizedPnL: number;
  marginUsed: number;
  maintenanceMargin: number;
  leverage: number;
  liquidationPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  rMultiple: number | null;
  greeks?: Record<string, number> | null;
  basisInfo?: Record<string, any> | null;
  currency: string;
  nativeCurrency: string;
  reportingCurrency: string;
  fxRate: number;
  fxProvider: string;
  fxTimestamp: string;
  openedAt: string;
  updatedAt: string;
  marketDataUpdatedAt: string;
  source: string;
  freshness: string;
  dataState: string;
  configState: string;
  configReason: string;
}

export interface RiskGateItem {
  gateId: number;
  name: string;
  category: string;
  status: "ARMED" | "TRIGGERED" | "BYPASS" | "NOT_CONFIGURED";
  reason: string;
  threshold: string;
  currentValue: string;
  lastEvaluation: string;
}

export interface RiskGateReport {
  timestamp: string;
  overallStatus: string;
  gatesEvaluated: number;
  gatesArmed: number;
  gatesTriggered: number;
  gates: RiskGateItem[];
}

export interface OrderItem {
  internalOrderId: string;
  provider: string;
  brokerOrderId: string | null;
  accountId: string;
  environment: Environment;
  instrument: string;
  canonicalInstrumentId: string;
  side: "BUY" | "SELL";
  orderType: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
  quantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  limitPrice: number | null;
  stopPrice: number | null;
  avgFillPrice: number | null;
  status: "PENDING" | "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED" | "REJECTED" | "EXPIRED";
  createdAt: string;
  updatedAt: string;
  rejectReason: string | null;
  clientTag: string | null;
}

export interface TradeFill {
  fillId: string;
  internalOrderId: string;
  brokerOrderId: string | null;
  provider: string;
  accountId: string;
  environment: Environment;
  instrument: string;
  side: "BUY" | "SELL";
  fillPrice: number;
  fillQuantity: number;
  fee: number;
  feeCurrency: string;
  timestamp: string;
}

export interface LedgerEntry {
  ledgerEntryId: string;
  timestamp: string;
  provider: string;
  accountId: string;
  environment: Environment;
  currency: string;
  amount: number;
  direction: "CREDIT" | "DEBIT";
  entryType: string;
  reason: string;
  referenceId: string | null;
  balanceAfter: number;
}

export interface ReconciliationReport {
  timestamp: string;
  status: "HEALTHY" | "DRIFT" | "STALE" | "ERROR";
  accountsAudited: number;
  positionsAudited: number;
  ordersAudited: number;
  driftsFound: number;
  drifts: Array<{
    provider: string;
    accountId: string;
    environment: Environment;
    entityType: string;
    entityId: string;
    internalValue: any;
    providerValue: any;
    driftAmount: number;
    status: string;
    detectedAt: string;
  }>;
  latencyMs: number;
}

export interface NormalizedEvent {
  eventId: string;
  eventType: EventType;
  domain: EventDomain;
  provider: string;
  accountId: string | null;
  environment: Environment;
  exchange: string | null;
  instrumentId: string | null;
  canonicalInstrumentId: string | null;
  providerTimestamp: string | null;
  exchangeTimestamp: string | null;
  receivedTimestamp: string;
  sequence: number;
  latencyMs: number;
  payload: Record<string, any>;
}

export interface PortfolioSummaryResponse {
  environment: Environment;
  accounts: BrokerAccount[];
  byCurrency: Record<
    string,
    {
      totalCash: number;
      availableCash: number;
      marginUsed: number;
      availableMargin: number;
      realizedPnL: number;
      unrealizedPnL: number;
      equity: number;
      buyingPower: number;
      accountsCount: number;
    }
  >;
  normalizedTotalEquityUsd: number;
  fxConversionSource: string;
  asOf: string;
}

export interface CanonicalInstrument {
  canonicalInstrumentId: string;
  symbol: string;
  displayName: string;
  exchange: string;
  segment: string;
  assetClass: string;
  underlying?: string | null;
  expiry?: string | null;
  strike?: number | null;
  optionType?: "CE" | "PE" | null;
  currency: string;
  settlementCurrency: string;
  lotSize: number;
  contractMultiplier: number;
  tickSize: number;
  providerMappings: Record<string, string>;
}

export interface OptionContractData {
  instrumentId: string;
  symbol: string;
  strike: number;
  optionType: "CE" | "PE";
  expiry: string;
  ltp: number;
  bid: number;
  ask: number;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  oi: number;
  oiChange: number;
  volume: number;
  feedAgeMs: number;
  provider: string;
}

export interface OptionStrikeRow {
  strike: number;
  call: OptionContractData | null;
  put: OptionContractData | null;
}

export interface OptionChainSnapshot {
  underlying: string;
  spotPrice: number;
  expiry: string;
  timestamp: string;
  pcrOi: number;
  pcrVolume: number;
  atmStrike: number;
  atmIv: number;
  maxPain: number;
  totalCallOi: number;
  totalPutOi: number;
  strikes: OptionStrikeRow[];
  expiries: string[];
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  orderCount: number;
}

export interface NormalizedOrderBook {
  provider: string;
  canonicalInstrumentId: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  bestBid: number;
  bestAsk: number;
  spread: number;
  spreadBps: number;
  cumulativeBidDepth: number;
  cumulativeAskDepth: number;
  depthImbalancePct: number;
  timestamp: string;
  feedAgeMs: number;
  depthTier: string;
}

export interface SubscriptionEntry {
  instrument_id: string;
  provider: string;
  symbol: string;
  depth_level: string;
  ref_count: number;
  subscribers: string[];
  uptime_seconds: number;
}
