export type AssetClass = "OPTION" | "FUTURES" | "EQUITY" | "CRYPTO";

export type MoneynessClassification = "ITM" | "ATM" | "OTM";

export type OIBuildupType = "LONG_BUILDUP" | "SHORT_BUILDUP" | "SHORT_COVERING" | "LONG_UNWINDING" | "NEUTRAL";

export type TradeSetupState = "BULLISH" | "BEARISH" | "MIXED" | "NO_SETUP" | "INSUFFICIENT_DATA";

export interface TradeAnalysisInstrument {
  underlying: string;
  symbol: string;
  securityId?: string;
  exchangeSegment?: string;
  assetClass: AssetClass;
  expiry?: string;
  strike?: number;
  optionType?: "CE" | "PE";
  side: "BUY" | "SELL";
  ltp: number;
  bid?: number;
  ask?: number;
  spread?: number;
  volume?: number;
  openInterest?: number;
  oiChange?: number;
  oiChangePct?: number;
  basis?: number;
  iv?: number;
  dayHigh?: number;
  dayLow?: number;
  prevClose?: number;
  lotSize?: number;
  tickSize?: number;
  greeks?: {
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
    rho?: number;
  };
}

export interface UnderlyingMarketData {
  symbol: string;
  spotPrice: number;
  changePct: number;
  dayHigh: number;
  dayLow: number;
  prevClose: number;
  volume?: number;
  vwap?: number;
  status: "LIVE" | "STALE" | "DISCONNECTED";
  lastUpdate: string;
}

export interface FuturesMarketData {
  symbol: string;
  ltp: number;
  changePct: number;
  volume: number;
  openInterest: number;
  oiChangePct: number;
  basis: number; // Futures LTP - Spot Price
  regime: "CONTANGO" | "BACKWARDATION" | "PARITY";
  isConfirmed: boolean;
}

export interface OptionChainMacroStats {
  totalCallOI: number;
  totalPutOI: number;
  totalCallVolume: number;
  totalPutVolume: number;
  pcr: number; // Put/Call Ratio
  highestCallOIStrike: number; // Major Resistance
  highestPutOIStrike: number; // Major Support
  maxPainStrike: number;
  atmStrike: number;
  moneyness: MoneynessClassification;
  oiBuildup: {
    type: OIBuildupType;
    label: string;
    description: string;
    color: string;
  };
}

export interface CallPutComparisonData {
  strike: number;
  call: {
    symbol: string;
    ltp: number;
    changePct: number;
    oi: number;
    oiChangePct: number;
    volume: number;
    iv: number;
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
  put: {
    symbol: string;
    ltp: number;
    changePct: number;
    oi: number;
    oiChangePct: number;
    volume: number;
    iv: number;
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
}

export interface ActiveIndicator {
  id: string;
  name: string;
  category: "Trend" | "Momentum" | "Volatility" | "Volume" | "Market Structure" | "Options";
  seriesTarget: "UNDERLYING" | "OPTION_PREMIUM";
  enabled: boolean;
  timeframe: string;
  params: Record<string, any>;
  color: string;
  calculatedValue?: number | string;
  signal?: "BULLISH" | "BEARISH" | "NEUTRAL";
  description?: string;
}

export interface ConfirmationMatrixItem {
  id: string;
  title: string;
  targetSeries: "UNDERLYING" | "OPTION_PREMIUM" | "FUTURES" | "CHAIN";
  passed: boolean;
  valueDisplay: string;
  interpretation: "BULLISH" | "BEARISH" | "NEUTRAL";
  description: string;
  evidence: string;
}

export interface TradeSetupAnalysis {
  state: TradeSetupState;
  score: number;
  totalCriteria: number;
  confidencePct: number;
  confirmations: ConfirmationMatrixItem[];
  summary: string;
  underlyingSummary: string;
  premiumSummary: string;
  futuresSummary: string;
}

export interface RiskRewardCalculation {
  entryPrice: number;
  stopLoss: number;
  targetPrice: number;
  riskPerUnit: number;
  rewardPerUnit: number;
  riskRewardRatio: number;
  lotSize: number;
  lots: number;
  totalQuantity: number;
  totalEstimatedPremium: number;
  totalCapitalAtRisk: number;
  totalPotentialProfit: number;
  isStopLossValid: boolean;
  isTargetValid: boolean;
}

export interface OrderPreviewData {
  symbol: string;
  underlying: string;
  side: "BUY" | "SELL";
  product: "MIS" | "NRML" | "CNC";
  orderType: "MARKET" | "LIMIT" | "SL" | "SL-M";
  quantity: number;
  lots: number;
  lotSize: number;
  price: number;
  triggerPrice?: number;
  stopLoss?: number;
  target?: number;
  estimatedValue: number;
  maxRiskAmount: number;
  potentialRewardAmount: number;
  riskRewardRatio: number;
  executionMode: "PAPER";
}

export interface ExecutionStatusRecord {
  orderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  status: "SUBMITTED" | "OPEN" | "FILLED" | "REJECTED" | "FAILED";
  filledQuantity: number;
  remainingQuantity: number;
  averagePrice: number;
  totalValue?: number;
  timestamp: string;
  message?: string;
}
