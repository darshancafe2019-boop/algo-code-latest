/**
 * Unified Options Trading Strategy Types & Contracts
 * ===================================================
 * Defines the core interfaces, option legs, trade proposals,
 * market context, risk metrics, and execution structures.
 */

export type OptionType = "CALL" | "PUT" | "CE" | "PE";
export type LegAction = "BUY" | "SELL";
export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT";
export type ExecutionMode = "PAPER" | "LIVE";

export type MarketRegime =
  | "STRONG_BULLISH"
  | "BULLISH"
  | "NEUTRAL"
  | "BEARISH"
  | "STRONG_BEARISH"
  | "RANGE_BOUND"
  | "HIGH_VOLATILITY"
  | "LOW_VOLATILITY"
  | "EVENT_RISK";

export type VolatilityExpectation = "RISING" | "FALLING" | "HIGH" | "LOW" | "NEUTRAL";
export type DirectionalBias = "BULLISH" | "BEARISH" | "NEUTRAL" | "UNCERTAIN";
export type ExpectedMagnitude = "SMALL" | "MODERATE" | "LARGE";

export interface OptionLeg {
  legId: string;
  symbol: string;
  underlying: string;
  optionType: OptionType;
  side: LegAction;
  strike: number;
  expiry: string;
  quantity: number;
  lots?: number;
  premium: number;
  orderType: OrderType;
  limitPrice?: number;
  iv?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  rho?: number;
}

export interface GreeksSummary {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho?: number;
}

export interface StrategyPayoffPoint {
  price: number;
  pnl: number;
}

export interface TradeProposal {
  proposalId: string;
  strategyId: string;
  strategyName: string;
  underlying: string;
  assetClass: "EQUITY" | "INDEX" | "CRYPTO";
  legs: OptionLeg[];
  entryReason: string;
  marketRegime: MarketRegime;
  confidence: number;
  spotPrice: number;
  netDebitOrCredit: number; // Positive = Debit, Negative = Credit
  isCredit: boolean;
  maxProfit: number | "UNLIMITED";
  maxLoss: number | "UNLIMITED";
  breakevens: number[];
  riskReward?: number | string;
  requiredMargin: number;
  greeks: GreeksSummary;
  payoffCurve?: StrategyPayoffPoint[];
  liquidityScore: number;
  validationStatus: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReasons: string[];
  executionMode: ExecutionMode;
  createdAt: string;
}

export interface MarketContext {
  underlying: string;
  assetClass: "EQUITY" | "INDEX" | "CRYPTO";
  spotPrice: number;
  timestamp: string;
  ohlcv?: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timeframe: string;
  };
  indicators?: {
    ema20?: number;
    ema50?: number;
    ema200?: number;
    rsi14?: number;
    macd?: { value: number; signal: number; histogram: number };
    atr14?: number;
    vwap?: number;
    adx14?: number;
  };
  volatility?: {
    historicalVol?: number;
    impliedVol?: number;
    ivRank?: number;
    ivPercentile?: number;
  };
  optionChain?: {
    selectedExpiry: string;
    availableExpiries: string[];
    maxPain: number;
    pcrOi: number;
    pcrVolume: number;
    totalCallOi: number;
    totalPutOi: number;
    atmStrike: number;
    stepSize: number;
    strikes: Array<{
      strike: number;
      isAtm: boolean;
      call: { price: number; iv: number; oi: number; volume: number; delta: number; theta: number; vega: number };
      put: { price: number; iv: number; oi: number; volume: number; delta: number; theta: number; vega: number };
    }>;
  };
  dataQuality: {
    spotAvailable: boolean;
    indicatorsAvailable: boolean;
    chainAvailable: boolean;
    isStale: boolean;
    latencyMs?: number;
  };
}

export interface StrategySignal {
  strategyId: string;
  strategyName: string;
  underlying: string;
  action: "ENTER" | "WAIT" | "EXIT" | "ADJUST";
  bias: DirectionalBias;
  confidence: number;
  reasons: string[];
  recommendedExpiry: string;
  suggestedStrikes: number[];
  timestamp: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  timestamp: string;
}

export interface RiskAnalysis {
  approved: boolean;
  maxRiskAmount: number;
  accountRiskPct: number;
  marginUtilizationPct: number;
  rejectionReasons: string[];
  warnings: string[];
}

export interface ExitDecision {
  shouldExit: boolean;
  reason?: string;
  exitType?: "PROFIT_TARGET" | "STOP_LOSS" | "TIME_STOP" | "STRATEGY_INVALIDATION" | "EMERGENCY";
  recommendedUrgency?: "NORMAL" | "HIGH" | "IMMEDIATE";
}

export interface AdjustmentDecision {
  shouldAdjust: boolean;
  reason?: string;
  adjustmentAction?: "ROLL_UP" | "ROLL_DOWN" | "ROLL_OUT" | "ADD_WING" | "CONVERT_TO_SPREAD";
  suggestedLegs?: OptionLeg[];
}

export interface StrategyConfig {
  enabled: boolean;
  maxPositions: number;
  riskPerTradePercent: number;
  minConfidence: number;
  takeProfitPercent: number;
  stopLossPercent: number;
  maxDaysToExpiry: number;
  minLiquidityScore: number;
  paperTrading: boolean;
  customParams?: Record<string, any>;
}

export interface StrategyAnalysis {
  strategyId: string;
  strategyName: string;
  marketMatch: boolean;
  suitabilityScore: number; // 0 - 100
  regime: MarketRegime;
  rationale: string[];
  proposal?: TradeProposal;
}

export type PositionState =
  | "PENDING"
  | "OPENING"
  | "OPEN"
  | "PARTIALLY_CLOSED"
  | "CLOSING"
  | "CLOSED"
  | "REJECTED"
  | "ERROR";

export interface ActiveOptionPosition {
  positionId: string;
  strategyId: string;
  strategyName: string;
  underlying: string;
  executionMode: ExecutionMode;
  state: PositionState;
  legs: OptionLeg[];
  entrySpotPrice: number;
  currentSpotPrice: number;
  entryNetCost: number;
  currentNetValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  roiPct: number;
  aggregateGreeks: GreeksSummary;
  openedAt: string;
  updatedAt: string;
  closedAt?: string;
  breakevens: number[];
  maxProfit: number | "UNLIMITED";
  maxLoss: number | "UNLIMITED";
  takeProfitPrice?: number;
  stopLossPrice?: number;
  expiryDate: string;
  daysToExpiry: number;
  exitHistory?: Array<{ timestamp: string; reason: string; pnl: number }>;
}

export interface TradingStrategy {
  id: string;
  name: string;
  category: "options";
  description: string;
  config: StrategyConfig;

  analyze(context: MarketContext): Promise<StrategyAnalysis>;
  validate(signal: StrategySignal): Promise<ValidationResult>;
  buildTrade(signal: StrategySignal, context: MarketContext): Promise<TradeProposal>;
  shouldEnter(context: MarketContext): Promise<boolean>;
  shouldExit(position: ActiveOptionPosition, context: MarketContext): Promise<ExitDecision>;
  shouldAdjust?(position: ActiveOptionPosition, context: MarketContext): Promise<AdjustmentDecision>;
  getRisk(proposal: TradeProposal, accountBalance: number): Promise<RiskAnalysis>;
  updateConfig(newConfig: Partial<StrategyConfig>): void;
}
