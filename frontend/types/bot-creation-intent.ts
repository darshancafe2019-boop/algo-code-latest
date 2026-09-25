/**
 * Quant.OS Canonical Bot Creation Intent Types
 * ============================================
 * Strongly-typed data structure representing the authoritative instrument,
 * market context, strategy direction, and Greeks/derivatives metadata captured
 * when initiating Bot Creation from Option Chain, Futures Board, Screener,
 * Scanner, or AI Analysis.
 */

export type BotTradingDirection = "BUY" | "SELL" | "BOTH";

export type BotStrategyDirection =
  | "BUY_CALL"
  | "SELL_CALL"
  | "BUY_PUT"
  | "SELL_PUT"
  | "LONG_FUTURE"
  | "SHORT_FUTURE"
  | "BUY"
  | "SELL";

export type BotAssetClass =
  | "SPOT"
  | "FUTURE"
  | "FUTURES"
  | "INDIAN_FUTURES"
  | "CRYPTO_FUTURES"
  | "PERPETUAL"
  | "OPTION"
  | "OPTIONS"
  | "INDIAN_OPTIONS"
  | "CRYPTO"
  | "CRYPTO_OPTIONS"
  | "EQUITY"
  | "STOCKS"
  | "INDIAN_STOCKS"
  | "FOREX"
  | "COMMODITY"
  | "COMMODITIES"
  | "ETF"
  | "INDEX";

export interface BotCreationIntent {
  /** Display and Canonical Symbols */
  symbol: string;
  canonicalSymbol?: string;
  canonicalContractId?: string;
  tradingSymbol?: string;
  securityId?: string;
  instrumentId?: string;

  /** Strategy Direction & Side */
  side: "BUY" | "SELL";
  strategyDirection?: BotStrategyDirection;

  /** Asset Category */
  assetClass: BotAssetClass;
  market?: string;
  exchange?: string;
  segment?: string;

  /** Connectivity */
  broker?: string;
  marketDataSource?: string;

  /** Core Pricing & Depth */
  currentPrice?: number | null;
  ltp?: number | null;
  bid?: number | null;
  ask?: number | null;
  markPrice?: number | null;
  spotPrice?: number | null;

  /** Contract Specifications */
  underlying?: string;
  expiry?: string | null;
  strike?: number | null;
  optionType?: "CALL" | "PUT" | "CE" | "PE" | null;
  lotSize?: number | null;
  tickSize?: number | null;
  contractMultiplier?: number | null;

  /** Market Activity & Depth Metrics */
  openInterest?: number | null;
  oi?: number | null;
  changeOi?: number | null;
  oiChangePct?: number | null;
  volume?: number | null;

  /** Options Specific Analytics & Greeks */
  iv?: number | null;
  delta?: number | null;
  gamma?: number | null;
  theta?: number | null;
  vega?: number | null;
  pcr?: number | null;
  atmDistance?: number | null;
  underlyingPrice?: number | null;

  /** Futures Specific Analytics */
  basis?: number | null;
  fundingRate?: number | null;
  premiumDiscount?: number | null;
  daysToExpiry?: number | null;

  /** Risk & Leverage */
  maxLeverage?: number | null;
  timeframe?: string;
  stopLossPct?: number | null;
  takeProfitPct?: number | null;
  riskPerTradePct?: number | null;
  capitalAllocation?: number | null;

  /** Strategy Integration */
  strategyTemplateId?: string;
  initialStrategyName?: string;
  strategyDescription?: string;
  strategyConfig?: any;
  rawStrategyConfig?: any;
  indicators?: any[];
  rules?: any[];

  /** Metadata & Origin */
  origin: "LIVE_FEED" | "OPTIONS" | "FUTURES" | "SCREENER" | "SCANNER" | "AI_ANALYSIS" | "STRATEGY_CENTER" | "MANUAL";
  sourcePage?: string;
  mode?: "new" | "addLeg" | "strategy";
  creationIntentId?: string;
  uiDispatchTimestamp?: number;
  timestamp: number;
}
