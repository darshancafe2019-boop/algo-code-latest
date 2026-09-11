/**
 * Authoritative P&L Journal & Accounting Desk - TypeScript Definitions
 */

export type AssetClass =
  | "EQUITY"
  | "OPTIONS"
  | "FUTURES"
  | "CRYPTO"
  | "COMMODITY"
  | "CURRENCY"
  | "ALL";

export type InstrumentType = "EQUITY" | "CE" | "PE" | "FUT" | "PERP";

export type TradeDirection = "LONG" | "SHORT" | "BUY" | "SELL" | "ALL";

export type TradeStatus = "OPEN" | "CLOSED" | "PARTIAL";

export type BrokerType =
  | "ALL"
  | "DHAN"
  | "DELTA"
  | "UPSTOX"
  | "ZERODHA"
  | "BINANCE"
  | "PAPER"
  | string;

export type ExecutionMode = "ALL" | "LIVE" | "PAPER" | "BACKTEST";

export type ExitReason =
  | "TARGET"
  | "STOP_LOSS"
  | "TRAILING_STOP"
  | "TIME_EXIT"
  | "EXPIRY"
  | "MANUAL"
  | "PARTIAL_EXIT"
  | "BROKER_FORCED"
  | "UNKNOWN";

export type AccountingMethod = "FIFO" | "AVERAGE_COST";

export type CapitalEventType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "TRANSFER"
  | "BROKER_CREDIT"
  | "BROKER_DEBIT"
  | "INTEREST"
  | "ADJUSTMENT"
  | "DIVIDEND"
  | "BONUS"
  | "OTHER";

export type ReconciliationStatus = "RECONCILED" | "WARNING" | "MISMATCH" | "DISCREPANCY";

export interface FeeBreakdown {
  brokerage: number;
  stt: number;
  exchangeCharges: number;
  gst: number;
  stampDuty: number;
  sebiCharges: number;
  ipft: number;
  dpCharges: number;
  otherCharges?: number;
  totalFees?: number;
  totalCharges: number;
}

export interface FillRecord {
  fillId: string;
  orderId: string;
  tradeId?: string;
  symbol: string;
  assetClass?: AssetClass;
  broker?: string;
  account?: string;
  side: "BUY" | "SELL";
  price: number;
  quantity: number;
  timestamp: string;
  fee?: number;
  executionMode?: ExecutionMode;
}

export interface TradeRecord {
  id: string;
  orderId?: string;
  tradeId?: string;
  symbol: string;
  assetClass: AssetClass;
  broker: string;
  account?: string;
  accountId?: string;
  mode: ExecutionMode;
  side: "BUY" | "SELL" | "LONG" | "SHORT";
  entryTimestamp: string;
  entryTime?: string;
  exitTimestamp?: string;
  exitTime?: string;
  entryPrice: number;
  exitPrice?: number;
  currentPrice?: number;
  quantity: number;
  lotSize?: number;
  multiplier?: number;
  status: TradeStatus;
  grossPnl: number;
  netPnl: number;
  totalCharges: number;
  feeBreakdown: FeeBreakdown;
  fees?: FeeBreakdown;
  strategy: string;
  setup?: string;
  timeframe?: string;
  tags?: string[];
  notes?: string;
  mae?: number;
  mfe?: number;
  rMultiple?: number;
  riskRewardTarget?: number;
  holdingDurationSeconds?: number;
  durationSeconds?: number;
  currency?: string;
}

export interface PositionRecord {
  id?: string;
  positionId?: string;
  symbol: string;
  assetClass?: AssetClass;
  broker?: string;
  account?: string;
  side: "BUY" | "SELL" | "LONG" | "SHORT";
  quantity: number;
  entryPrice?: number;
  averageEntryPrice: number;
  avgEntryPrice?: number;
  currentPrice: number;
  currentLtp?: number;
  unrealizedPnl: number;
  grossUnrealizedPnl?: number;
  marginUsed?: number;
  exposure?: number;
  entryTime?: string;
  currency?: string;
}

export interface PnlSummary {
  netPnl: number;
  grossPnl: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalCharges: number;
  totalFees?: number;
  totalProfitAmount: number;
  totalLossAmount: number;
  winningTradesCount: number;
  losingTradesCount: number;
  breakevenTradesCount: number;
  totalTrades: number;
  winRate: number;
  lossRate: number;
  profitFactor: number;
  tradeExpectancy: number;
  expectancy?: number;
  winLossRatio: number;
  averageWinAmount: number;
  averageLossAmount: number;
  largestWinAmount: number;
  largestLossAmount: number;
  maxDrawdownAmount: number;
  maxDrawdownPercent: number;
  recoveryFactor: number;
  averageRMultiple: number;
  maxWinStreak: number;
  maxLossStreak: number;
  averageHoldingDurationSeconds: number;
  totalBrokerage: number;
  totalStt: number;
  totalExchangeCharges: number;
  totalSebiCharges: number;
  totalGst: number;
  totalStampDuty: number;
  initialCapital: number;
  returnOnCapitalPercent: number;
}

export interface AccountingBalance {
  broker: string;
  currency: string;
  totalBalance: number;
  availableMargin: number;
  usedMargin: number;
  collateralValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  pendingSettlement: number;
  lastUpdated: string;
}

export interface CapitalEvent {
  id: string;
  timestamp: string;
  broker: BrokerType;
  type: "DEPOSIT" | "WITHDRAWAL" | "DIVIDEND" | "INTEREST" | "ADJUSTMENT";
  amount: number;
  currency: string;
  reference: string;
  status: "SETTLED" | "PENDING" | "FAILED";
  notes?: string;
}

export interface BrokerReconciliation {
  broker: string;
  account: string;
  mode: ExecutionMode;
  localNetPnl: number;
  brokerReportedPnl: number;
  discrepancy: number;
  localOpenPositionsCount: number;
  brokerOpenPositionsCount: number;
  lastReconciledTime: string;
  status: ReconciliationStatus;
  unmatchedOrdersCount: number;
}

export interface DayPnlRecord {
  date: string; // YYYY-MM-DD
  grossPnl: number;
  netPnl: number;
  charges: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  profitFactor: number;
  bestTradePnl: number;
  worstTradePnl: number;
  volume: number;
  instrumentsTraded: string[];
  journalNote?: string;
  tags?: string[];
}

export interface EquityCurvePoint {
  timestamp: string; // YYYY-MM-DD
  equity: number;
  realizedEquity: number;
  cashBalance: number;
  marginUsed: number;
  drawdownAmount: number;
  drawdownPercent: number;
  highWaterMark: number;
  dailyNetPnl: number;
}

export interface StrategyPerformance {
  strategy: string;
  totalTrades: number;
  winRate: number;
  netPnl: number;
  charges: number;
  profitFactor?: number;
}

export interface InstrumentPerformance {
  symbol: string;
  totalTrades: number;
  winRate: number;
  netPnl: number;
  charges: number;
  profitFactor?: number;
}

export interface AssetClassPerformance {
  assetClass: AssetClass;
  totalTrades: number;
  winRate: number;
  netPnl: number;
  charges: number;
}

export interface PnlFilterState {
  period: "TODAY" | "7D" | "30D" | "THIS_MONTH" | "LAST_MONTH" | "3M" | "6M" | "YTD" | "1Y" | "ALL";
  broker: BrokerType;
  mode: ExecutionMode;
  assetClass: AssetClass;
  strategy: string;
  direction: "ALL" | "BUY" | "SELL" | "LONG" | "SHORT";
  searchQuery?: string;
  currency: "INR" | "USD";
}

export interface PnlJournalDashboardPayload {
  summary: PnlSummary;
  trades: TradeRecord[];
  positions: PositionRecord[];
  equityCurve: EquityCurvePoint[];
  calendarRecords: DayPnlRecord[];
  strategyPerformance: StrategyPerformance[];
  instrumentPerformance: InstrumentPerformance[];
  assetClassPerformance: AssetClassPerformance[];
  reconciliations: BrokerReconciliation[];
  balances: AccountingBalance[];
  capitalEvents: CapitalEvent[];
  metadata?: {
    serverTimestamp: string;
    version: string;
    dataCompleteness: string;
    calculationEngine: string;
  };
}
