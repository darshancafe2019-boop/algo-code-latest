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
  provider: string;
  accountId: string;
  instrumentId: string;
  canonicalInstrumentId: string;
  symbol: string;
  environment: Environment;
  quantity: number;
  side: "LONG" | "SHORT" | "FLAT";
  averageEntry: number;
  marketPrice: number;
  marketValue: number;
  realizedPnL: number;
  unrealizedPnL: number;
  marginUsed: number;
  currency: string;
  openedAt: string;
  updatedAt: string;
  source: string;
  freshness: string;
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
