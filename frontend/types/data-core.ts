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
  | "SYSTEM"
  | "BOT"
  | "STRATEGY"
  | "RECONCILIATION"
  | "AUDIT";

export type EventType =
  | "BOT_CREATED"
  | "BOT_STARTING"
  | "BOT_STARTED"
  | "BOT_WAITING_SIGNAL"
  | "BOT_PAUSED"
  | "BOT_RESUMED"
  | "BOT_STOPPED"
  | "BOT_FAILED"
  | "BOT_RECOVERED"
  | "FEED_CONNECTING"
  | "FEED_CONNECTED"
  | "FEED_DISCONNECTED"
  | "FEED_RECONNECTING"
  | "DATA_STALE"
  | "DATA_RECOVERED"
  | "TICK_RECEIVED"
  | "CANDLE_CLOSED"
  | "MARKET_TICK"
  | "QUOTE"
  | "TRADE"
  | "DEPTH"
  | "CANDLE"
  | "OI"
  | "FUNDING"
  | "GREEKS"
  | "STRATEGY_EVALUATED"
  | "SIGNAL_LONG"
  | "SIGNAL_SHORT"
  | "SIGNAL_HOLD"
  | "SIGNAL_REJECTED"
  | "RISK_CHECK_STARTED"
  | "RISK_APPROVED"
  | "RISK_REJECTED"
  | "POSITION_SIZE_CALCULATED"
  | "ORDER_CREATED"
  | "ORDER_PENDING"
  | "ORDER_SENT"
  | "ORDER_ACKNOWLEDGED"
  | "ORDER_ACCEPTED"
  | "ORDER_PARTIALLY_FILLED"
  | "ORDER_PARTIAL_FILL"
  | "ORDER_FILLED"
  | "ORDER_REJECTED"
  | "ORDER_CANCELLED"
  | "ORDER_OPEN"
  | "TRADE_FILL"
  | "POSITION_OPENED"
  | "POSITION_UPDATED"
  | "POSITION_REDUCED"
  | "POSITION_CLOSED"
  | "PNL_UPDATE"
  | "PNL_UPDATED"
  | "REALIZED_PNL_UPDATED"
  | "UNREALIZED_PNL_UPDATED"
  | "STOP_LOSS_TRIGGERED"
  | "TAKE_PROFIT_TRIGGERED"
  | "BREAK_EVEN_MOVED"
  | "TRAILING_STOP_UPDATED"
  | "BALANCE_UPDATE"
  | "MARGIN_UPDATE"
  | "CAPITAL_ALLOCATION"
  | "CAPITAL_RESERVATION"
  | "CAPITAL_RELEASE"
  | "PROVIDER_AUTH_OK"
  | "PROVIDER_AUTH_FAILED"
  | "PROVIDER_RECONNECTED"
  | "PROVIDER_CONNECTED"
  | "PROVIDER_DISCONNECTED"
  | "PROVIDER_STALE"
  | "PROVIDER_ERROR"
  | "OMS_HEALTHY"
  | "OMS_DEGRADED"
  | "RECONCILIATION_STARTED"
  | "RECONCILIATION_MATCHED"
  | "RECONCILIATION_MISMATCH"
  | "RECONCILIATION_HEALTHY"
  | "RECONCILIATION_DRIFT"
  | "BOT_RUNTIME_ERROR"
  | "ORDER_TIMEOUT"
  | "DATABASE_ERROR"
  | "WEBSOCKET_ERROR"
  | "INVALID_MARKET_DATA"
  | "RETRY_STARTED"
  | "RETRY_FAILED"
  | "RETRY_SUCCESS";

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
  // Identity, Monotonic Sequence & Timestamps
  eventId: string;
  event_id?: string;
  sequence: number;
  eventTime?: string;
  event_time?: string;
  receivedTime?: string;
  received_time?: string;
  receivedTimestamp?: string;
  environment: Environment;
  provider: string;
  domain: EventDomain;
  eventType: EventType;
  event_type?: EventType;
  severity: "INFO" | "WARN" | "ERROR" | "CRITICAL";

  // Bot & Strategy Context
  botId?: string | null;
  bot_id?: string | null;
  botName?: string | null;
  bot_name?: string | null;
  strategyId?: string | null;
  strategy_id?: string | null;
  strategyName?: string | null;
  strategy_name?: string | null;

  // Market & Asset Taxonomy
  symbol?: string | null;
  exchange?: string | null;
  timeframe?: string | null;
  instrumentId?: string | null;
  instrument_id?: string | null;
  canonicalInstrumentId?: string | null;
  canonical_instrument_id?: string | null;

  // Account & Entity IDs
  accountId?: string | null;
  account_id?: string | null;
  orderId?: string | null;
  order_id?: string | null;
  tradeId?: string | null;
  trade_id?: string | null;
  positionId?: string | null;
  position_id?: string | null;

  // Order / Position Pricing & Sizing
  side?: "BUY" | "SELL" | "LONG" | "SHORT" | string | null;
  quantity?: number | null;
  marketPrice?: number | null;
  market_price?: number | null;
  entryPrice?: number | null;
  entry_price?: number | null;
  exitPrice?: number | null;
  exit_price?: number | null;
  stopLoss?: number | null;
  stop_loss?: number | null;
  takeProfit?: number | null;
  take_profit?: number | null;

  // P&L & Cost Accounting
  realizedPnL?: number | null;
  realized_pnl?: number | null;
  unrealizedPnL?: number | null;
  unrealized_pnl?: number | null;
  commission?: number | null;
  fees?: number | null;
  slippage?: number | null;

  // Decision & Scoring
  strategyScore?: number | null;
  strategy_score?: number | null;
  confidence?: number | null;
  status?: string | null;
  decisionReason?: string | null;
  decision_reason?: string | null;

  // Diagnostics & Errors
  errorCode?: string | null;
  error_code?: string | null;
  errorMessage?: string | null;
  error_message?: string | null;
  latencyMs: number;
  latency_ms?: number;
  dataAgeMs?: number;
  data_age_ms?: number;

  // Tracing & Reconciliation
  correlationId?: string | null;
  correlation_id?: string | null;
  causationId?: string | null;
  causation_id?: string | null;
  idempotencyKey?: string | null;
  idempotency_key?: string | null;
  reconciliationStatus?: "MATCHED" | "MISMATCH" | "PENDING" | string | null;
  reconciliation_status?: "MATCHED" | "MISMATCH" | "PENDING" | string | null;

  metadata?: Record<string, any>;
  rawPayload?: Record<string, any>;
  raw_payload?: Record<string, any>;
  providerTimestamp?: string | null;
  exchangeTimestamp?: string | null;
  payload: Record<string, any>;
}

export interface TradeJournalEntry {
  tradeId: string;
  trade_id?: string;
  correlationId?: string | null;
  correlation_id?: string | null;
  bot: string;
  botId?: string;
  bot_name?: string;
  strategy: string;
  strategy_name?: string;
  provider: string;
  broker: string;
  account: string;
  symbol: string;
  timeframe: string;
  side: "BUY" | "SELL" | "LONG" | "SHORT" | string;
  signal_score?: number;
  signalScore?: number;
  signal_reason?: string;
  signalReason?: string;
  entryTime: string;
  entry_time?: string;
  entryPrice: number;
  entry_price?: number;
  quantity: number;
  stop?: number | null;
  target?: number | null;
  plannedRisk?: number;
  planned_risk?: number;
  riskPercentage?: number;
  risk_percentage?: number;
  exitTime?: string | null;
  exit_time?: string | null;
  exitPrice?: number | null;
  exit_price?: number | null;
  grossPnL: number;
  gross_pnl?: number;
  fees: number;
  commission: number;
  slippage: number;
  netPnL: number;
  net_pnl?: number;
  rMultiple?: number | null;
  r_multiple?: number | null;
  mfe: number;
  mae: number;
  holdingDuration: string;
  holding_duration?: string;
  exitReason?: string;
  exit_reason?: string;
  status: "OPEN" | "CLOSED";
  paper_live: "PAPER" | "LIVE";
  environment?: "PAPER" | "LIVE";
  order_ids: string[];
  reconciliation_status: string;
  timeline: Array<{
    eventId: string;
    sequence: number;
    time: string;
    type: string;
    status: string;
    price?: number;
    reason?: string;
  }>;
}

export interface FailureJournalEntry {
  failureId: string;
  failure_id?: string;
  component: string;
  bot?: string;
  botId?: string;
  provider: string;
  errorCode: string;
  error_code?: string;
  exception: string;
  exceptionMessage?: string;
  firstSeen: string;
  first_seen?: string;
  lastSeen: string;
  last_seen?: string;
  occurrenceCount: number;
  occurrence_count?: number;
  automaticAction: string;
  automatic_action?: string;
  retryCount: number;
  retry_count?: number;
  recoveryTime?: string | null;
  recovery_time?: string | null;
  downtime: string;
  downtimeSeconds?: number;
  resolved: boolean;
  status: "RESOLVED" | "UNRESOLVED";
  metadata?: Record<string, any>;
}

export interface ProviderObservatoryTelemetry {
  providerId: string;
  name: string;
  connected: boolean;
  authenticated: boolean;
  status: ProviderStatus | string;
  statusMessage: string;
  subscriptions: number;
  instruments: number;
  ticksPerSec: number;
  messagesPerSec: number;
  lastMessage: string | null;
  latencyMs: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  staleInstruments: number;
  droppedMessages: number;
  errors: number;
  reconnectCount: number;
  uptime: string;
}

export interface TopLiveEntities {
  topActiveBot?: { botId: string; name: string; activityCount: number } | null;
  topPnlBot?: { botId: string; name: string; allocation: number } | null;
  worstDrawdownBot?: { botId: string; name: string; drawdownPct: number } | null;
  mostActiveStrategy?: string | null;
  mostTradedInstrument?: string | null;
  largestPosition?: { instrument: string; side: string; notional: number; pnl: number } | null;
  largestOrder?: { orderId: string; instrument: string; quantity: number; status: string } | null;
  highestAccountExposure?: { broker: string; currency: string; marginUsed: number; equity: number } | null;
  highestVolumeInstrument?: string | null;
  highestOiInstrument?: string | null;
  fastestProvider?: { provider: string; latencyMs: number } | null;
  slowestProvider?: { provider: string; latencyMs: number } | null;
  highestSlippageExecution?: { fillId: string; instrument: string; slippage: number } | null;
  mostProviderErrors?: { provider: string; errorCount: number } | null;
}

export interface ObservatoryHeaderMetrics {
  eventsPerSec: number;
  bufferSize: number;
  providersLive: number;
  totalProviders: number;
  botsRunning: number;
  botsFailed: number;
  ordersPending: number;
  positionsOpen: number;
  realizedPnL: number;
  unrealizedPnL: number;
  riskRejected: number;
  providerReconnects: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  maxDataAgeMs: number;
  omsStatus: "HEALTHY" | "DEGRADED" | string;
  reconciliationStatus: "HEALTHY" | "MISMATCH" | string;
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
