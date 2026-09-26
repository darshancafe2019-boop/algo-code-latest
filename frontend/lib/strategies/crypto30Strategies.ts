/**
 * QUANT.OS AUTHORITATIVE 30 CRYPTO STRATEGIES CATALOG
 * ====================================================
 * Authoritative source for the 30 strategy names, organization, terminology,
 * timeframes, market conditions, indicators, entry logic, stop logic, target logic,
 * management rules, and "when not to trade" rules.
 *
 * Ground Rules:
 * 1. Zero invented strategy rules.
 * 2. Zero predictive AI claims or fabricated win rates.
 * 3. Performance is strictly calculated from actual backtest, paper-trading, or forward-test results.
 */

export type StrategyCategory =
  | "Trend & Continuation"
  | "Breakout & Expansion"
  | "Pullback & Mean Reversion"
  | "Structure & Reversal"
  | "Momentum & Volume"
  | "Crypto-Specific & Multi-Factor"
  | "Multi-Leg Options & Income";

export type StrategyPart =
  | "PART I — TREND & CONTINUATION"
  | "PART II — BREAKOUT & EXPANSION"
  | "PART III — PULLBACK & MEAN REVERSION"
  | "PART IV — STRUCTURE & REVERSAL"
  | "PART V — MOMENTUM & VOLUME"
  | "PART VI — CRYPTO-SPECIFIC & MULTI-FACTOR"
  | "PART VII — MULTI-LEG OPTIONS & INCOME";

export type StrategySignalState =
  | "NO_SETUP"
  | "WATCHING"
  | "SETUP_FORMING"
  | "READY"
  | "ENTRY_PENDING"
  | "POSITION_OPEN"
  | "TARGET_REACHED"
  | "STOPPED"
  | "INVALIDATED"
  | "BLOCKED"
  | "DISABLED";

export type MarketRegimeType =
  | "TRENDING"
  | "RANGING"
  | "BREAKOUT / EXPANSION"
  | "HIGH VOLATILITY"
  | "LOW VOLATILITY"
  | "STRUCTURAL REVERSAL"
  | "UNKNOWN";

export type ExecutionStatus = "READY" | "WAITING" | "BLOCKED" | "ACTIVE";

export type StrategyComplexity = "Introductory" | "Intermediate" | "Advanced" | "Institutional";

export interface StrategyIndicatorSpec {
  name: string;
  parameter: string;
  purpose: string;
  defaultSetting: string;
}

export interface SetupConditionRule {
  id: string;
  name: string;
  description: string;
  category: "TREND" | "PULLBACK" | "BREAKOUT" | "RECLAIM" | "VOLUME" | "VOLATILITY" | "STRUCTURE" | "CRYPTO_SPECIFIC" | "MOMENTUM" | "RISK" | "DATA";
  required: boolean;
}

export interface TradeSimulationStep {
  step: "SIGNAL" | "ENTRY" | "STOP_TARGET" | "POSITION" | "EXIT" | "JOURNAL";
  title: string;
  detail: string;
}

export interface TradeSimulationExample {
  instrument: string;
  direction: "LONG" | "SHORT" | "LONG / SHORT" | "NEUTRAL";
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  riskPct: number;
  rrRatio: string;
  positionSizingNote: string;
  steps: TradeSimulationStep[];
}

export interface CryptoStrategyDefinition {
  number: string; // "01" - "30"
  id: string; // "crypto-strat-01"
  name: string;
  part: StrategyPart;
  category: StrategyCategory;
  primaryTimeframe: string;
  alternateTimeframes: string[];
  market: string;
  direction: "LONG" | "SHORT" | "LONG / SHORT";
  complexity: StrategyComplexity;
  status: ExecutionStatus;
  compatibleRegimes: MarketRegimeType[];
  dataRequirements: string[];
  whatItDoes: string;
  whyItExists: string;
  bestMarketConditions: string[];
  unfavorableConditions: string[]; // "When not to trade" rules
  indicators: StrategyIndicatorSpec[];
  setupConditions: SetupConditionRule[];
  exampleTrade: TradeSimulationExample;
  defaultParameters: Record<string, any>;
  version: string;
}

export const CRYPTO_30_STRATEGIES: CryptoStrategyDefinition[] = [
  // ==========================================
  // PART I — TREND & CONTINUATION
  // ==========================================
  {
    number: "01",
    id: "crypto-strat-01",
    name: "Trend Pullback to EMA",
    part: "PART I — TREND & CONTINUATION",
    category: "Trend & Continuation",
    primaryTimeframe: "4H",
    alternateTimeframes: ["1H", "1D"],
    market: "BTC / ETH / Major liquid alts",
    direction: "LONG / SHORT",
    complexity: "Introductory",
    status: "READY",
    compatibleRegimes: ["TRENDING"],
    dataRequirements: ["OHLCV", "EMA (20, 50, 200)", "ATR (14)", "Volume SMA (20)"],
    whatItDoes:
      "The market is trending. Price pulls back toward the reference EMA. The strategy waits for the pullback to finish. It then enters only after the predefined continuation trigger confirms trend resumption.",
    whyItExists:
      "Trends rarely move linearly. Institutional participants utilize liquidity retracements to reference moving averages to scale into trend positions without moving order book depth aggressively.",
    bestMarketConditions: [
      "Sustained directional trending regimes (ADX > 25)",
      "Clear higher highs / higher lows (Long) or lower highs / lower lows (Short)",
      "Healthy trading volume and moderate volatility",
    ],
    unfavorableConditions: [
      "Ranging or sideways market with ADX < 20",
      "Price churning flat directly across the EMA 200",
      "Illiquid weekend trading periods with wide bid-ask spread",
      "Immediate high-impact macro news / FOMC rate decisions",
    ],
    indicators: [
      { name: "Fast EMA", parameter: "20", purpose: "Short-term momentum & dynamic support", defaultSetting: "EMA 20" },
      { name: "Medium EMA", parameter: "50", purpose: "Intermediate trend anchor", defaultSetting: "EMA 50" },
      { name: "Macro EMA", parameter: "200", purpose: "Regime & macro direction filter", defaultSetting: "EMA 200" },
      { name: "ATR", parameter: "14", purpose: "Dynamic stop loss buffer sizing", defaultSetting: "ATR 14" },
    ],
    setupConditions: [
      { id: "c1", name: "Macro Trend Filter", description: "Price > EMA 200 for Long (Price < EMA 200 for Short)", category: "TREND", required: true },
      { id: "c2", name: "Trend Alignment", description: "EMA 20 > EMA 50 for Long (EMA 20 < EMA 50 for Short)", category: "TREND", required: true },
      { id: "c3", name: "Pullback Depth", description: "Low <= EMA 20 or EMA 50 touch without closing beyond EMA 50", category: "PULLBACK", required: true },
      { id: "c4", name: "Reclaim Confirmation", description: "Trigger candle closes above previous pullback high (Long) or below low (Short)", category: "RECLAIM", required: true },
      { id: "c5", name: "Volatility Check", description: "ATR within normal 14-period envelope; spread < 0.05%", category: "VOLATILITY", required: true },
      { id: "c6", name: "Risk Clearance", description: "Stop distance < 3.0%, maximum portfolio risk <= 0.5%", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "BTCUSDT",
      direction: "LONG",
      entryPrice: 67601,
      stopPrice: 65951,
      targetPrice: 70901,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 max loss on $100k equity)",
      steps: [
        { step: "SIGNAL", title: "Setup Validated", detail: "4H Trend: PASS | Pullback: PASS | Reclaim: PASS | Risk: PASS" },
        { step: "ENTRY", title: "Limit Fill", detail: "Filled Long at $67,601 upon breakout above pullback bar high" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop Loss at $65,951 (below swing low), Take Profit at $70,901 (2.0R)" },
        { step: "POSITION", title: "Monitoring", detail: "Trailing stop activated upon reaching 1.0R ($69,251)" },
        { step: "EXIT", title: "Target Hit", detail: "Position closed at $70,901 limit target" },
        { step: "JOURNAL", title: "Logged to DB", detail: "Recorded +2.0R, $1,000 net P&L after fees to immutable trade journal" },
      ],
    },
    defaultParameters: { emaFast: 20, emaMedium: 50, emaSlow: 200, atrPeriod: 14, rrRatio: 2.0, maxRiskPct: 0.5 },
    version: "1.0.0",
  },
  {
    number: "02",
    id: "crypto-strat-02",
    name: "Momentum Expansion",
    part: "PART I — TREND & CONTINUATION",
    category: "Trend & Continuation",
    primaryTimeframe: "1H",
    alternateTimeframes: ["15m", "4H"],
    market: "BTC / ETH / liquid alts",
    direction: "LONG / SHORT",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["BREAKOUT / EXPANSION", "TRENDING"],
    dataRequirements: ["OHLCV", "MACD (12, 26, 9)", "RSI (14)", "Volume SMA (20)", "ATR (14)"],
    whatItDoes:
      "Detects early-stage momentum expansion as price accelerates out of multi-candle compression zones with surging directional volume and expanding momentum oscillators.",
    whyItExists:
      "Momentum ignition forces late market participants to chase and offside counter-trend traders to close, producing sharp directional bursts.",
    bestMarketConditions: [
      "Emerging breakouts from multi-hour consolidation",
      "Surging volume with expanding candle bodies",
      "High liquidity market sessions",
    ],
    unfavorableConditions: [
      "Low liquidity, declining volume phases",
      "Exhaustion candles at higher-timeframe resistance/support levels",
      "Wide spread environments",
    ],
    indicators: [
      { name: "MACD", parameter: "12, 26, 9", purpose: "Momentum acceleration detection", defaultSetting: "MACD (12, 26, 9)" },
      { name: "RSI", parameter: "14", purpose: "Directional velocity threshold (>55 Long / <45 Short)", defaultSetting: "RSI 14" },
      { name: "Volume SMA", parameter: "20", purpose: "Volume surge multiplier confirmation", defaultSetting: "Vol SMA 20" },
      { name: "ATR", parameter: "14", purpose: "Expansion candle size baseline", defaultSetting: "ATR 14" },
    ],
    setupConditions: [
      { id: "c1", name: "Momentum Histogram", description: "MACD Histogram expanding 2 consecutive bars in direction", category: "TREND", required: true },
      { id: "c2", name: "RSI Threshold", description: "RSI crossing above 55 (Long) or below 45 (Short) with positive slope", category: "TREND", required: true },
      { id: "c3", name: "Volume Surge", description: "Current bar volume > 1.5x 20-period Volume SMA", category: "VOLUME", required: true },
      { id: "c4", name: "Bar Expansion", description: "Candle body >= 1.2x ATR 14", category: "VOLATILITY", required: true },
      { id: "c5", name: "Risk Check", description: "Stop placed at base of expansion bar; Risk Engine approves sizing", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "ETHUSDT",
      direction: "LONG",
      entryPrice: 3450,
      stopPrice: 3380,
      targetPrice: 3590,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "Expansion Detected", detail: "MACD: EXPANDING | Vol: 2.1x SMA | RSI: 62.4 | Body > 1.4x ATR" },
        { step: "ENTRY", title: "Market Entry", detail: "Executed Long at $3,450 upon expansion bar close" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $3,380, Take Profit at $3,590" },
        { step: "POSITION", title: "Trade Open", detail: "Position monitored for volume exhaustion" },
        { step: "EXIT", title: "Target Hit", detail: "Closed at $3,590 (+2.0R)" },
        { step: "JOURNAL", title: "Audited", detail: "Saved full indicator state snapshot and execution metrics" },
      ],
    },
    defaultParameters: { rsiThresholdLong: 55, rsiThresholdShort: 45, volumeMultiplier: 1.5, atrMultiplier: 1.2, rrRatio: 2.0 },
    version: "1.0.0",
  },
  {
    number: "03",
    id: "crypto-strat-03",
    name: "Daily Trend, 1H Trigger",
    part: "PART I — TREND & CONTINUATION",
    category: "Trend & Continuation",
    primaryTimeframe: "1D / 1H",
    alternateTimeframes: ["4H / 15m"],
    market: "BTC / ETH / Major liquid alts",
    direction: "LONG / SHORT",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["TRENDING"],
    dataRequirements: ["Daily OHLCV", "1H OHLCV", "Daily EMA (50, 200)", "1H EMA (20)", "1H RSI (14)"],
    whatItDoes:
      "Uses the Daily timeframe to establish macro directional trend bias and executes high-precision entries on the 1-hour chart using intraday structure breaks.",
    whyItExists:
      "Aligning lower-timeframe tactical execution with higher-timeframe order flow reduces whipsaws and maximizes risk-to-reward ratio.",
    bestMarketConditions: [
      "Clear Daily trend with clean structural alignment",
      "Daily EMA 50 > EMA 200 with widening spread",
      "Intraday pullbacks offering clean 1H swing highs/lows",
    ],
    unfavorableConditions: [
      "Conflicted multi-timeframe bias (Daily flat, 1H choppy)",
      "Daily chart inside multi-week consolidation box",
      "Approaching major daily resistance/support levels",
    ],
    indicators: [
      { name: "Daily EMA 50", parameter: "50", purpose: "Daily trend baseline", defaultSetting: "Daily EMA 50" },
      { name: "Daily EMA 200", parameter: "200", purpose: "Daily macro anchor", defaultSetting: "Daily EMA 200" },
      { name: "1H EMA 20", parameter: "20", purpose: "Intraday momentum trigger", defaultSetting: "1H EMA 20" },
      { name: "1H RSI", parameter: "14", purpose: "Pullback exhaustion indicator", defaultSetting: "1H RSI 14" },
    ],
    setupConditions: [
      { id: "c1", name: "Daily Bias", description: "Daily Close > Daily EMA 50 > Daily EMA 200 (Long)", category: "TREND", required: true },
      { id: "c2", name: "1H Pullback", description: "1H RSI drops below 40 during pullback (Long)", category: "PULLBACK", required: true },
      { id: "c3", name: "1H Structure Reclaim", description: "1H Close breaks above previous 1H swing high and reclaims 1H EMA 20", category: "RECLAIM", required: true },
      { id: "c4", name: "Risk Clearance", description: "Stop placed below 1H swing low; target >= 2.5R", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "SOLUSDT",
      direction: "LONG",
      entryPrice: 142.5,
      stopPrice: 136.0,
      targetPrice: 158.75,
      riskPct: 0.5,
      rrRatio: "1:2.5",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "Daily+1H Confluence", detail: "Daily: BULLISH | 1H Pullback: COMPLETED | 1H Reclaim: CONFIRMED" },
        { step: "ENTRY", title: "Trigger Executed", detail: "Entered Long at $142.50 upon 1H swing high breakout" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $136.00, Take Profit at $158.75" },
        { step: "POSITION", title: "Position Active", detail: "Risk Engine verifies portfolio correlation" },
        { step: "EXIT", title: "Target Achieved", detail: "Filled at $158.75 (+2.5R)" },
        { step: "JOURNAL", title: "Logged", detail: "Daily trend confluence verified and saved" },
      ],
    },
    defaultParameters: { dailyEmaFast: 50, dailyEmaSlow: 200, hourlyEmaTrigger: 20, rsiPullbackLevel: 40, rrRatio: 2.5 },
    version: "1.0.0",
  },
  {
    number: "04",
    id: "crypto-strat-04",
    name: "Trend Resumption After Squeeze",
    part: "PART I — TREND & CONTINUATION",
    category: "Trend & Continuation",
    primaryTimeframe: "4H",
    alternateTimeframes: ["1H", "1D"],
    market: "BTC / ETH / Mid-cap alts",
    direction: "LONG / SHORT",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["TRENDING", "LOW VOLATILITY"],
    dataRequirements: ["OHLCV", "Bollinger Bands (20, 2.0)", "Keltner Channel (20, 1.5 ATR)", "EMA (50)", "Momentum (12)"],
    whatItDoes:
      "Monitors existing trends that enter low-volatility compression (Bollinger Bands inside Keltner Channels), entering upon volatility release in the direction of the dominant trend.",
    whyItExists:
      "Volatility is cyclical. Compressions store energy; when the squeeze releases, trend resumption occurs with high directional velocity.",
    bestMarketConditions: [
      "Defined higher-timeframe trend experiencing temporary volume drying/consolidation",
      "Bollinger Bands compressing entirely within Keltner Channel for >= 3 bars",
    ],
    unfavorableConditions: [
      "Squeeze firing against higher-timeframe 200 EMA slope",
      "Declining overall market volume across universe",
    ],
    indicators: [
      { name: "Bollinger Bands", parameter: "20, 2.0", purpose: "Volatility envelope bounds", defaultSetting: "BB (20, 2.0)" },
      { name: "Keltner Channel", parameter: "20, 1.5 ATR", purpose: "Squeeze reference channel", defaultSetting: "KC (20, 1.5)" },
      { name: "Trend Filter EMA", parameter: "50", purpose: "Trend alignment filter", defaultSetting: "EMA 50" },
      { name: "Momentum", parameter: "12", purpose: "Squeeze firing direction", defaultSetting: "Mom 12" },
    ],
    setupConditions: [
      { id: "c1", name: "Prior Trend", description: "Price > EMA 50 with positive slope (Long) or < EMA 50 (Short)", category: "TREND", required: true },
      { id: "c2", name: "Squeeze Condition", description: "BB Upper < Keltner Upper AND BB Lower > Keltner Lower for >= 3 bars", category: "VOLATILITY", required: true },
      { id: "c3", name: "Squeeze Release", description: "Bollinger Bands expand outside Keltner Channel", category: "BREAKOUT", required: true },
      { id: "c4", name: "Momentum Trigger", description: "Momentum oscillator turns positive (Long) or negative (Short)", category: "TREND", required: true },
      { id: "c5", name: "Risk Approval", description: "Max loss capped at 0.5% portfolio equity", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "AVAXUSDT",
      direction: "LONG",
      entryPrice: 28.4,
      stopPrice: 26.8,
      targetPrice: 31.6,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "Squeeze Fired", detail: "4H Squeeze: 4 BARS COMPRESSED -> FIRED LONG | Mom: POSITIVE" },
        { step: "ENTRY", title: "Breakout Fill", detail: "Filled Long at $28.40 upon first bar outside Keltner" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $26.80, Target at $31.60" },
        { step: "POSITION", title: "Active", detail: "Monitored as volatility expands" },
        { step: "EXIT", title: "Target Filled", detail: "Filled at $31.60 (+2.0R)" },
        { step: "JOURNAL", title: "Logged", detail: "Squeeze duration and expansion velocity recorded" },
      ],
    },
    defaultParameters: { bbPeriod: 20, bbStd: 2.0, kcPeriod: 20, kcAtrMult: 1.5, minSqueezeBars: 3, rrRatio: 2.0 },
    version: "1.0.0",
  },
  {
    number: "05",
    id: "crypto-strat-05",
    name: "Time-Series Momentum",
    part: "PART I — TREND & CONTINUATION",
    category: "Trend & Continuation",
    primaryTimeframe: "1D / 4H",
    alternateTimeframes: ["1W", "1D"],
    market: "BTC / ETH / Top 20 liquid alts",
    direction: "LONG / SHORT",
    complexity: "Institutional",
    status: "READY",
    compatibleRegimes: ["TRENDING"],
    dataRequirements: ["Daily OHLCV", "30D/60D/90D Historical Returns", "20D Realized Volatility", "ATR (20)"],
    whatItDoes:
      "Measures quantitative momentum across 30, 60, and 90-day lookback horizons, allocating long exposure to assets exhibiting positive cumulative returns and filtering out deteriorating momentum.",
    whyItExists:
      "Capital allocation flows persistently toward outperforming crypto assets over multi-week horizons due to fund rebalancing and institutional liquidity cycles.",
    bestMarketConditions: [
      "Macro bull or bear trend regimes",
      "Persistent dispersion between leading and lagging crypto assets",
    ],
    unfavorableConditions: [
      "Widespread market consolidation with high volatility churn",
      "Liquidation cascade shocks across all pairs simultaneously",
    ],
    indicators: [
      { name: "30D Return", parameter: "30-day", purpose: "Short-term momentum factor", defaultSetting: "R30" },
      { name: "90D Return", parameter: "90-day", purpose: "Medium-term momentum factor", defaultSetting: "R90" },
      { name: "20D Realized Vol", parameter: "20-day", purpose: "Volatility normalization divisor", defaultSetting: "RV20" },
      { name: "50D SMA", parameter: "50-day", purpose: "Absolute trend filter", defaultSetting: "SMA 50" },
    ],
    setupConditions: [
      { id: "c1", name: "Absolute Momentum", description: "Cumulative 30-day and 90-day return > 0 (Long)", category: "TREND", required: true },
      { id: "c2", name: "Trend Baseline", description: "Price > 50-day SMA", category: "TREND", required: true },
      { id: "c3", name: "Vol Normalization", description: "20-day realized volatility below 80th historical percentile", category: "VOLATILITY", required: true },
      { id: "c4", name: "Cross-Asset Rank", description: "Asset in top quartile of crypto universe momentum matrix", category: "STRUCTURE", required: true },
      { id: "c5", name: "Exposure Cap", description: "Portfolio allocation capped at max 15% notional per asset", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "NEARUSDT",
      direction: "LONG",
      entryPrice: 5.2,
      stopPrice: 4.6,
      targetPrice: 6.4,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Volatility-scaled position size by Risk Engine",
      steps: [
        { step: "SIGNAL", title: "Rank Top Quartile", detail: "R30: +42% | R90: +88% | Vol Percentile: 54% | Rank: #2 in Universe" },
        { step: "ENTRY", title: "Portfolio Rebalance", detail: "Allocated Long at $5.20 on daily close" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Trailing stop at 2.5x ATR below price" },
        { step: "POSITION", title: "Holding", detail: "Re-evaluated on weekly momentum rebalance cycle" },
        { step: "EXIT", title: "Target Met", detail: "Exited at $6.40 (+2.0R)" },
        { step: "JOURNAL", title: "Logged", detail: "Recorded multi-horizon momentum factors to trade journal" },
      ],
    },
    defaultParameters: { lookbackShort: 30, lookbackLong: 90, volLookback: 20, maxVolPercentile: 80, rrRatio: 2.0 },
    version: "1.0.0",
  },

  // ==========================================
  // PART II — BREAKOUT & EXPANSION
  // ==========================================
  {
    number: "06",
    id: "crypto-strat-06",
    name: "BandWidth Squeeze Breakout",
    part: "PART II — BREAKOUT & EXPANSION",
    category: "Breakout & Expansion",
    primaryTimeframe: "4H / 1D",
    alternateTimeframes: ["1H", "4H"],
    market: "BTC / ETH / High Beta Alts",
    direction: "LONG / SHORT",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["BREAKOUT / EXPANSION", "LOW VOLATILITY"],
    dataRequirements: ["OHLCV", "Bollinger Bands (20, 2.0)", "BandWidth 100-bar Percentile", "Volume SMA (20)"],
    whatItDoes:
      "Calculates normalized Bollinger BandWidth. When BandWidth falls into historical extreme compression (lowest 15th percentile), the strategy primes and enters as price breaks outside the outer band on expanding volume.",
    whyItExists:
      "Extreme volatility compression indicates an impending imbalance between buyers and sellers. When price breaks out of the range, resting liquidity is triggered, fueling follow-through.",
    bestMarketConditions: [
      "Extended multi-day low-volatility sideways ranges",
      "BandWidth <= 15th percentile of past 100 bars",
      "Volume expansion on breakout candle > 2.0x average",
    ],
    unfavorableConditions: [
      "Choppy ranges with expanding BandWidth",
      "Breakout candle with low volume / long opposing wick",
    ],
    indicators: [
      { name: "Bollinger Bands", parameter: "20, 2.0", purpose: "Band bounds calculation", defaultSetting: "BB (20, 2.0)" },
      { name: "BandWidth Percentile", parameter: "100-bar", purpose: "Relative compression threshold (<= 15%)", defaultSetting: "BW Percentile <= 15" },
      { name: "Volume SMA", parameter: "20", purpose: "Breakout volume confirmation (> 2.0x)", defaultSetting: "Vol SMA 20" },
    ],
    setupConditions: [
      { id: "c1", name: "BandWidth Compression", description: "Bollinger BandWidth <= 15th percentile of 100-bar history", category: "VOLATILITY", required: true },
      { id: "c2", name: "Breakout Candle", description: "Candle closes strictly outside Upper Band (Long) or Lower Band (Short)", category: "BREAKOUT", required: true },
      { id: "c3", name: "Volume Confirmation", description: "Breakout volume >= 2.0x 20-period Volume SMA", category: "VOLUME", required: true },
      { id: "c4", name: "Risk Engine Sizing", description: "Stop placed at opposite band or middle band; risk <= 0.5%", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "BTCUSDT",
      direction: "LONG",
      entryPrice: 64200,
      stopPrice: 62800,
      targetPrice: 67000,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "Compression Trigger", detail: "BandWidth at 8th percentile -> 4H candle broke Upper Band at $64,200 with 2.8x Vol" },
        { step: "ENTRY", title: "Long Fill", detail: "Filled Long at $64,200 upon bar close" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop Loss at $62,800 (Middle Band), Target at $67,000" },
        { step: "POSITION", title: "Managing", detail: "Trailing stop active after +1.0R" },
        { step: "EXIT", title: "Target Hit", detail: "Closed at $67,000 (+2.0R)" },
        { step: "JOURNAL", title: "Audit Saved", detail: "Stored BandWidth compression metrics and fill data" },
      ],
    },
    defaultParameters: { bbPeriod: 20, bbStd: 2.0, bwPercentileThreshold: 15, volMultiplier: 2.0, rrRatio: 2.0 },
    version: "1.0.0",
  },
  {
    number: "07",
    id: "crypto-strat-07",
    name: "Donchian 20 Breakout",
    part: "PART II — BREAKOUT & EXPANSION",
    category: "Breakout & Expansion",
    primaryTimeframe: "1D / 4H",
    alternateTimeframes: ["4H", "1D"],
    market: "BTC / ETH / Major Liquid Alts",
    direction: "LONG / SHORT",
    complexity: "Introductory",
    status: "READY",
    compatibleRegimes: ["BREAKOUT / EXPANSION", "TRENDING"],
    dataRequirements: ["OHLCV", "Donchian Channel (20-period)", "Donchian Exit Channel (10-period)", "ATR (20)"],
    whatItDoes:
      "Classic quantitative trend-following breakout. Enters when price makes a new 20-period highest high (Long) or lowest low (Short), with trailing stop governed by the 10-period opposing channel.",
    whyItExists:
      "Captures thick-tailed trend distributions in crypto by remaining in positions as long as new periodic extremes continue to form.",
    bestMarketConditions: [
      "Strong secular trending crypto bull or bear runs",
      "Sustained directional impulse waves",
    ],
    unfavorableConditions: [
      "Mean-reverting tight ranges where price repeatedly tags upper and lower Donchian bounds",
    ],
    indicators: [
      { name: "Entry Donchian", parameter: "20-period", purpose: "Breakout high/low trigger", defaultSetting: "Donchian 20" },
      { name: "Exit Donchian", parameter: "10-period", purpose: "Trailing stop reference", defaultSetting: "Donchian 10" },
      { name: "ATR", parameter: "20", purpose: "Position sizing volatility baseline", defaultSetting: "ATR 20" },
    ],
    setupConditions: [
      { id: "c1", name: "Channel Break", description: "Close > 20-period High (Long) or Close < 20-period Low (Short)", category: "BREAKOUT", required: true },
      { id: "c2", name: "ATR Expansion", description: "Current ATR 20 >= 20-period SMA of ATR", category: "VOLATILITY", required: true },
      { id: "c3", name: "Trailing Stop Sizing", description: "Stop placed at 10-period opposing Donchian extreme", category: "RISK", required: true },
      { id: "c4", name: "Risk Approval", description: "Max risk <= 0.5% portfolio equity", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "ETHUSDT",
      direction: "LONG",
      entryPrice: 3200,
      stopPrice: 3000,
      targetPrice: 3600,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "20-Day High Break", detail: "ETH broke above 20-day high of $3,200 on daily bar close" },
        { step: "ENTRY", title: "Long Position", detail: "Executed Long at $3,200" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop Loss at $3,000 (10-day low), Target at $3,600" },
        { step: "POSITION", title: "Trailing Active", detail: "Trailing stop moved up as 10-day low advanced" },
        { step: "EXIT", title: "Target Hit", detail: "Closed at $3,600 (+2.0R)" },
        { step: "JOURNAL", title: "Audited", detail: "Recorded Donchian channel parameters and trade trail" },
      ],
    },
    defaultParameters: { entryPeriod: 20, exitPeriod: 10, atrPeriod: 20, rrRatio: 2.0 },
    version: "1.0.0",
  },
  {
    number: "08",
    id: "crypto-strat-08",
    name: "UTC Opening Range Breakout",
    part: "PART II — BREAKOUT & EXPANSION",
    category: "Breakout & Expansion",
    primaryTimeframe: "15m / 1H",
    alternateTimeframes: ["5m", "15m"],
    market: "BTC / ETH",
    direction: "LONG / SHORT",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["BREAKOUT / EXPANSION"],
    dataRequirements: ["15m OHLCV", "00:00-01:00 UTC Opening Range High/Low", "Daily VWAP", "ATR (14)"],
    whatItDoes:
      "Defines the price range established during the first hour of the UTC day (00:00 to 01:00 UTC). Enters on a high-volume 15-minute candle breakout outside this opening range in the direction of Daily VWAP.",
    whyItExists:
      "UTC 00:00 marks the daily candle open, funding settlement, and derivative reset across major global exchanges, frequently setting the directional tone for the subsequent 24 hours.",
    bestMarketConditions: [
      "Days with clear early institutional participation following UTC open",
      "Tight 00:00-01:00 UTC range (< 1.0% width)",
    ],
    unfavorableConditions: [
      "Wide opening range (> 2.5% width on BTC)",
      "Price immediately reversing back into the opening range on weak volume",
    ],
    indicators: [
      { name: "UTC Opening Range", parameter: "00:00-01:00 UTC", purpose: "Opening range High/Low bounds", defaultSetting: "UTC 1H ORB" },
      { name: "Daily VWAP", parameter: "UTC reset", purpose: "Intraday directional filter", defaultSetting: "Daily VWAP" },
      { name: "ATR", parameter: "14 (15m)", purpose: "Breakout candle validation", defaultSetting: "15m ATR 14" },
    ],
    setupConditions: [
      { id: "c1", name: "Range Definition", description: "00:00-01:00 UTC High and Low recorded; Range width <= 1.5%", category: "STRUCTURE", required: true },
      { id: "c2", name: "15m Breakout", description: "15m candle closes outside Opening Range High (Long) or Low (Short)", category: "BREAKOUT", required: true },
      { id: "c3", name: "VWAP Alignment", description: "Price > Daily VWAP for Long (Price < Daily VWAP for Short)", category: "TREND", required: true },
      { id: "c4", name: "Risk Check", description: "Stop at Opening Range Midpoint; Risk Engine approves sizing", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "BTCUSDT",
      direction: "LONG",
      entryPrice: 68100,
      stopPrice: 67600,
      targetPrice: 69100,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "UTC ORB Break", detail: "UTC 1H Range: $67,500 - $68,000 | 15m Close at $68,100 > ORB High | VWAP: $67,850" },
        { step: "ENTRY", title: "Executed", detail: "Long filled at $68,100 on 15m bar close" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $67,600 (ORB Mid), Target at $69,100" },
        { step: "POSITION", title: "Active", detail: "Intraday trade monitored until UTC session close" },
        { step: "EXIT", title: "Target Reached", detail: "Limit filled at $69,100 (+2.0R)" },
        { step: "JOURNAL", title: "Logged", detail: "Saved UTC opening range data and trade execution details" },
      ],
    },
    defaultParameters: { startHourUtc: 0, rangeDurationHours: 1, maxRangeWidthPct: 1.5, rrRatio: 2.0 },
    version: "1.0.0",
  },
  {
    number: "09",
    id: "crypto-strat-09",
    name: "Previous-Day High/Low Break",
    part: "PART II — BREAKOUT & EXPANSION",
    category: "Breakout & Expansion",
    primaryTimeframe: "1H / 4H",
    alternateTimeframes: ["15m", "1H"],
    market: "BTC / ETH / Major Alts",
    direction: "LONG / SHORT",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["BREAKOUT / EXPANSION", "TRENDING"],
    dataRequirements: ["Previous Day High (PDH)", "Previous Day Low (PDL)", "Previous Day Close (PDC)", "Volume SMA (20)", "1H OHLCV"],
    whatItDoes:
      "Tracks Previous Day High (PDH) and Previous Day Low (PDL) as primary liquidity milestones. Enters when an hourly candle breaks and closes beyond PDH/PDL with relative volume expansion and no immediate rejection.",
    whyItExists:
      "Stops and breakout orders heavily cluster at prior daily extremes. A clean acceptance beyond these levels triggers sustained continuation.",
    bestMarketConditions: [
      "Trending days breaking prior day ranges in the direction of the dominant weekly trend",
      "Relative volume > 1.4x at the point of breakout",
    ],
    unfavorableConditions: [
      "Range-bound consolidation days where PDH/PDL are simply probed and rejected (liquidity sweeps)",
    ],
    indicators: [
      { name: "PDH / PDL", parameter: "Daily Pivot", purpose: "Prior day extreme price levels", defaultSetting: "PDH & PDL" },
      { name: "Relative Volume", parameter: "20-period", purpose: "Breakout volume surge (> 1.4x)", defaultSetting: "RVOL > 1.4" },
      { name: "1H EMA 20", parameter: "20", purpose: "Post-breakout support reference", defaultSetting: "1H EMA 20" },
    ],
    setupConditions: [
      { id: "c1", name: "PDH/PDL Breach", description: "1H candle closes > PDH (Long) or < PDL (Short)", category: "BREAKOUT", required: true },
      { id: "c2", name: "Volume Confirmation", description: "Breakout volume > 1.4x 20-period average", category: "VOLUME", required: true },
      { id: "c3", name: "Candle Structure", description: "Breakout bar has close in upper 30% of its range (Long) or lower 30% (Short)", category: "STRUCTURE", required: true },
      { id: "c4", name: "Risk Clearance", description: "Stop placed inside prior day range below breakout bar low", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "SOLUSDT",
      direction: "LONG",
      entryPrice: 154.2,
      stopPrice: 149.0,
      targetPrice: 164.6,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "PDH Breakout", detail: "PDH at $153.50 breached -> 1H Close at $154.20 with 1.8x Vol" },
        { step: "ENTRY", title: "Executed", detail: "Long filled at $154.20" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $149.00, Target at $164.60" },
        { step: "POSITION", title: "Active", detail: "Trailing stop engaged at +1.0R" },
        { step: "EXIT", title: "Target Met", detail: "Closed at $164.60 (+2.0R)" },
        { step: "JOURNAL", title: "Saved", detail: "Recorded prior day levels and breakout telemetry" },
      ],
    },
    defaultParameters: { rvolThreshold: 1.4, barCloseThresholdPct: 30, rrRatio: 2.0 },
    version: "1.0.0",
  },
  {
    number: "10",
    id: "crypto-strat-10",
    name: "Breakout Retest",
    part: "PART II — BREAKOUT & EXPANSION",
    category: "Breakout & Expansion",
    primaryTimeframe: "1H / 4H",
    alternateTimeframes: ["15m", "1H"],
    market: "BTC / ETH / Liquid Alts",
    direction: "LONG / SHORT",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["BREAKOUT / EXPANSION", "TRENDING"],
    dataRequirements: ["OHLCV", "Key Horizontal Level Detector", "EMA (20)", "Volume SMA (20)", "ATR (14)"],
    whatItDoes:
      "After price breaks out of a major horizontal support or resistance level, this strategy waits for an orderly retest back to the broken level, entering only when a rejection candle confirms the level has flipped from resistance to support (or vice-versa).",
    whyItExists:
      "Allows entering high-probability breakout moves with significantly reduced slippage and tighter stop loss placement compared to chasing initial impulse bars.",
    bestMarketConditions: [
      "Clean breakouts followed by low-volume shallow pullbacks to the breakout boundary",
      "Strong rejection wicks off the retested level",
    ],
    unfavorableConditions: [
      "Violent retests that slice cleanly back inside the prior range (failed breakout)",
      "High-volume selling into retest support",
    ],
    indicators: [
      { name: "Horizontal Level", parameter: "Pivot Swings", purpose: "Breakout and retest baseline level", defaultSetting: "Structure Level" },
      { name: "EMA 20", parameter: "20", purpose: "Dynamic support confluence", defaultSetting: "EMA 20" },
      { name: "Volume SMA", parameter: "20", purpose: "Volume dry-up during retest", defaultSetting: "Vol SMA 20" },
    ],
    setupConditions: [
      { id: "c1", name: "Clean Breakout", description: "Prior bar broke and closed beyond horizontal level", category: "BREAKOUT", required: true },
      { id: "c2", name: "Orderly Retest", description: "Price retraces to touch the broken level on declining volume (< 1.0x SMA)", category: "PULLBACK", required: true },
      { id: "c3", name: "Rejection Confirmation", description: "Candle prints a rejection wick off the level and closes back in breakout direction", category: "STRUCTURE", required: true },
      { id: "c4", name: "Risk Clearance", description: "Stop placed below retest rejection wick low; risk <= 0.5%", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "BNBUSDT",
      direction: "LONG",
      entryPrice: 580,
      stopPrice: 565,
      targetPrice: 610,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "Retest Confirmed", detail: "Breakout above $575 -> Retest low $574.50 -> Bullish wick close $580" },
        { step: "ENTRY", title: "Filled", detail: "Long filled at $580.00" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $565.00, Target at $610.00" },
        { step: "POSITION", title: "Active", detail: "Holding with dynamic trailing stop" },
        { step: "EXIT", title: "Target Hit", detail: "Closed at $610.00 (+2.0R)" },
        { step: "JOURNAL", title: "Audited", detail: "Saved retest depth and wick rejection metrics" },
      ],
    },
    defaultParameters: { retestTolerancePct: 0.3, maxRetestVolumeRatio: 1.0, rrRatio: 2.0 },
    version: "1.0.0",
  },

  // ==========================================
  // PART III — PULLBACK & MEAN REVERSION
  // ==========================================
  {
    number: "11",
    id: "crypto-strat-11",
    name: "Bollinger Reversion",
    part: "PART III — PULLBACK & MEAN REVERSION",
    category: "Pullback & Mean Reversion",
    primaryTimeframe: "1H / 4H",
    alternateTimeframes: ["15m", "1H"],
    market: "BTC / ETH / Range-bound Alts",
    direction: "LONG / SHORT",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["RANGING"],
    dataRequirements: ["OHLCV", "Bollinger Bands (20, 2.5 std)", "ADX (14)", "RSI (14)"],
    whatItDoes:
      "Evaluates ranging market conditions (ADX < 20). When price extends to touch or pierce the 2.5 standard deviation Bollinger Band with extreme RSI, the strategy fades the extension and targets a return to the 20-period middle moving average.",
    whyItExists:
      "In non-trending, range-bound environments, price extensions beyond 2.5 standard deviations are statistically unsustainable and revert rapidly to the mean.",
    bestMarketConditions: [
      "Confirmed range-bound markets with ADX < 20 and flat 50 EMA",
      "Clean rejection wicks off the outer 2.5 standard deviation band",
    ],
    unfavorableConditions: [
      "Strong trending regimes (ADX > 25) where price 'walks the bands' causing deep drawdowns on counter-trend fades",
    ],
    indicators: [
      { name: "Bollinger Bands", parameter: "20, 2.5 std", purpose: "Statistical outer extension bounds", defaultSetting: "BB (20, 2.5)" },
      { name: "ADX", parameter: "14", purpose: "Regime filter (strictly < 20)", defaultSetting: "ADX < 20" },
      { name: "RSI", parameter: "14", purpose: "Oscillator extremity filter (< 30 or > 70)", defaultSetting: "RSI 14" },
    ],
    setupConditions: [
      { id: "c1", name: "Regime Filter", description: "ADX 14 < 20 confirming non-trending ranging environment", category: "TREND", required: true },
      { id: "c2", name: "Band Touch", description: "Price low <= Lower BB (Long) or high >= Upper BB (Short)", category: "PULLBACK", required: true },
      { id: "c3", name: "RSI Extreme", description: "RSI <= 30 for Long (RSI >= 70 for Short)", category: "STRUCTURE", required: true },
      { id: "c4", name: "Reversal Close", description: "Candle closes back inside the outer Bollinger Band", category: "RECLAIM", required: true },
      { id: "c5", name: "Risk Clearance", description: "Stop placed outside swing extreme; target at 20-period Middle Band", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "BTCUSDT",
      direction: "LONG",
      entryPrice: 63100,
      stopPrice: 62400,
      targetPrice: 64500,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "Reversion Trigger", detail: "ADX: 16.4 | Low touched 2.5 Std BB at $62,900 | RSI: 26.5 | Reversal Close: $63,100" },
        { step: "ENTRY", title: "Executed", detail: "Long filled at $63,100" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $62,400, Target at $64,500 (Middle Band)" },
        { step: "POSITION", title: "Active", detail: "Monitored as price reverts to mean" },
        { step: "EXIT", title: "Target Reached", detail: "Closed at $64,500 (+2.0R)" },
        { step: "JOURNAL", title: "Logged", detail: "Saved statistical deviation and ADX regime parameters" },
      ],
    },
    defaultParameters: { bbPeriod: 20, bbStd: 2.5, maxAdx: 20, rsiOversold: 30, rsiOverbought: 70 },
    version: "1.0.0",
  },
  {
    number: "12",
    id: "crypto-strat-12",
    name: "RSI Extreme Reversion",
    part: "PART III — PULLBACK & MEAN REVERSION",
    category: "Pullback & Mean Reversion",
    primaryTimeframe: "15m / 1H",
    alternateTimeframes: ["5m", "15m", "4H"],
    market: "BTC / ETH / Alts",
    direction: "LONG / SHORT",
    complexity: "Introductory",
    status: "READY",
    compatibleRegimes: ["RANGING", "HIGH VOLATILITY"],
    dataRequirements: ["OHLCV", "RSI (14)", "EMA (200)", "ATR (14)"],
    whatItDoes:
      "Flags extreme momentum exhaustion when 14-period RSI reaches rare historical tails (<= 20 or >= 80). Enters when price forms a reversal candle closing back above 25 / below 75, aiming for a retest of intermediate moving averages.",
    whyItExists:
      "Rapid panic liquidations or euphoric spikes exhaust available market orders, creating brief vacuum periods where prices snap back quickly.",
    bestMarketConditions: [
      "Exhaustion flushes within larger trading ranges",
      "Sharp counter-trend spikes that immediately run out of volume",
    ],
    unfavorableConditions: [
      "Runaway fundamental trend breakdowns where RSI stays pinned <= 15 for days",
    ],
    indicators: [
      { name: "RSI", parameter: "14", purpose: "Extreme boundary detection (<= 20 / >= 80)", defaultSetting: "RSI 14" },
      { name: "EMA 200", parameter: "200", purpose: "Macro trend anchor and target reference", defaultSetting: "EMA 200" },
      { name: "ATR", parameter: "14", purpose: "Volatility stop buffer", defaultSetting: "ATR 14" },
    ],
    setupConditions: [
      { id: "c1", name: "RSI Extreme", description: "RSI 14 <= 20 for Long (RSI 14 >= 80 for Short)", category: "STRUCTURE", required: true },
      { id: "c2", name: "RSI Re-cross", description: "RSI crosses back above 25 (Long) or below 75 (Short)", category: "RECLAIM", required: true },
      { id: "c3", name: "Price Deceleration", description: "Reversal candle body with rejection wick", category: "STRUCTURE", required: true },
      { id: "c4", name: "Risk Clearance", description: "Stop placed 1.5x ATR beyond extreme wick; risk <= 0.5%", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "ETHUSDT",
      direction: "LONG",
      entryPrice: 3120,
      stopPrice: 3040,
      targetPrice: 3280,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "RSI Extreme Reversion", detail: "RSI reached 17.8 -> Bounced above 25 at $3,120 with hammer wick" },
        { step: "ENTRY", title: "Long Filled", detail: "Executed Long at $3,120" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $3,040, Target at $3,280" },
        { step: "POSITION", title: "Active", detail: "Monitored for snap-back mean reversion" },
        { step: "EXIT", title: "Target Hit", detail: "Closed at $3,280 (+2.0R)" },
        { step: "JOURNAL", title: "Saved", detail: "Logged RSI extreme values and bounce velocity" },
      ],
    },
    defaultParameters: { rsiPeriod: 14, extremeLow: 20, extremeHigh: 80, exitRsiLow: 25, exitRsiHigh: 75, rrRatio: 2.0 },
    version: "1.0.0",
  },
  {
    number: "13",
    id: "crypto-strat-13",
    name: "Anchored VWAP Reversion",
    part: "PART III — PULLBACK & MEAN REVERSION",
    category: "Pullback & Mean Reversion",
    primaryTimeframe: "1H / 4H",
    alternateTimeframes: ["15m", "1H"],
    market: "BTC / ETH / Major Liquid Alts",
    direction: "LONG / SHORT",
    complexity: "Advanced",
    status: "READY",
    compatibleRegimes: ["RANGING", "HIGH VOLATILITY"],
    dataRequirements: ["OHLCV", "Anchored VWAP from Key Pivot", "VWAP Std Dev Bands (+/- 2.0 std)", "Volume"],
    whatItDoes:
      "Calculates volume-weighted average price anchored to significant structural swing points (monthly open, weekly high/low, or major liquidation events). Enters mean-reversion trades when price reaches outer standard deviation bands (+/- 2.0 std) and shows exhaustion.",
    whyItExists:
      "Anchored VWAP represents the true volume-weighted cost basis of participants since the anchor event. Large deviations from this baseline incentivize mean-reverting liquidity providers.",
    bestMarketConditions: [
      "Markets extended beyond 2 standard deviations from major structural event anchors",
      "Declining volume as price probes outer deviation bands",
    ],
    unfavorableConditions: [
      "Price initiating a fresh fundamental breakout wave with high sustained institutional volume",
    ],
    indicators: [
      { name: "Anchored VWAP", parameter: "Pivot Anchor", purpose: "Volume-weighted institutional baseline", defaultSetting: "AVWAP" },
      { name: "AVWAP Bands", parameter: "+/- 2.0 std", purpose: "Statistical overextension bounds", defaultSetting: "AVWAP +/- 2.0 std" },
      { name: "Volume Exhaustion", parameter: "20-period SMA", purpose: "Volume drop confirmation", defaultSetting: "Vol < SMA" },
    ],
    setupConditions: [
      { id: "c1", name: "AVWAP Deviation", description: "Price touches or exceeds +/- 2.0 std band from Anchored VWAP", category: "STRUCTURE", required: true },
      { id: "c2", name: "Volume Drop", description: "Volume on touch bar < 20-period Volume SMA", category: "VOLUME", required: true },
      { id: "c3", name: "Reversal Candle", description: "Candle closes back inside +/- 2.0 std band toward AVWAP baseline", category: "RECLAIM", required: true },
      { id: "c4", name: "Risk Clearance", description: "Target set at Anchored VWAP baseline; Risk Engine approves sizing", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "BTCUSDT",
      direction: "LONG",
      entryPrice: 65200,
      stopPrice: 64100,
      targetPrice: 67400,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "AVWAP 2.0 Std Touch", detail: "Price touched -2.0 Std band ($64,900) from Monthly Open AVWAP ($67,400)" },
        { step: "ENTRY", title: "Executed", detail: "Long filled at $65,200 upon reversal close" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $64,100, Target at $67,400 (AVWAP Baseline)" },
        { step: "POSITION", title: "Active", detail: "Monitored as price returns to institutional benchmark" },
        { step: "EXIT", title: "Target Hit", detail: "Closed at $67,400 (+2.0R)" },
        { step: "JOURNAL", title: "Audited", detail: "Recorded anchor timestamp and deviation parameters" },
      ],
    },
    defaultParameters: { anchorType: "MONTHLY_OPEN", stdMultiplier: 2.0, rrRatio: 2.0 },
    version: "1.0.0",
  },
  {
    number: "14",
    id: "crypto-strat-14",
    name: "ATR Extension Reversal",
    part: "PART III — PULLBACK & MEAN REVERSION",
    category: "Pullback & Mean Reversion",
    primaryTimeframe: "1H / 4H",
    alternateTimeframes: ["15m", "1H"],
    market: "BTC / ETH / Volatile Alts",
    direction: "LONG / SHORT",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["HIGH VOLATILITY", "RANGING"],
    dataRequirements: ["OHLCV", "20-period Moving Average", "ATR (14)", "ATR Multiplier Envelope (3.0x)"],
    whatItDoes:
      "Calculates the absolute distance between price and its 20-period baseline in multiples of ATR. When distance exceeds 3.0x ATR 14 without structural support, the strategy enters a mean reversion fade back toward the 20 MA.",
    whyItExists:
      "Price rarely travels beyond 3.0x ATR away from its baseline without pausing or pulling back to digest the move.",
    bestMarketConditions: [
      "Overextended emotional rallies or capitulation sell-offs in volatile altcoins",
    ],
    unfavorableConditions: [
      "Strong trend breakouts with high continuous volume and macro catalysts",
    ],
    indicators: [
      { name: "Baseline MA", parameter: "20 SMA", purpose: "Center baseline reference", defaultSetting: "20 SMA" },
      { name: "ATR", parameter: "14", purpose: "Volatility scale multiplier", defaultSetting: "ATR 14" },
      { name: "ATR Envelope", parameter: "3.0x ATR", purpose: "Extension boundary trigger", defaultSetting: "+/- 3.0x ATR" },
    ],
    setupConditions: [
      { id: "c1", name: "ATR Distance", description: "Distance between Price and 20 SMA >= 3.0 * ATR 14", category: "VOLATILITY", required: true },
      { id: "c2", name: "Exhaustion Wick", description: "Candle prints a long rejection wick >= 40% of total candle range", category: "STRUCTURE", required: true },
      { id: "c3", name: "Reversal Close", description: "Close points back toward the 20 SMA", category: "RECLAIM", required: true },
      { id: "c4", name: "Risk Engine Sizing", description: "Stop placed 1.0x ATR past swing extreme; risk <= 0.5%", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "DOGEUSDT",
      direction: "SHORT",
      entryPrice: 0.145,
      stopPrice: 0.155,
      targetPrice: 0.125,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "3.2x ATR Extension", detail: "DOGE extended 3.2x ATR above 20 SMA -> Exhaustion shooting star formed" },
        { step: "ENTRY", title: "Short Filled", detail: "Executed Short at $0.145" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $0.155, Target at $0.125" },
        { step: "POSITION", title: "Active", detail: "Holding as price mean-reverts" },
        { step: "EXIT", title: "Target Reached", detail: "Closed at $0.125 (+2.0R)" },
        { step: "JOURNAL", title: "Logged", detail: "Saved ATR extension factor and reversal candle stats" },
      ],
    },
    defaultParameters: { maPeriod: 20, atrPeriod: 14, extensionMultiplier: 3.0, minWickPct: 40, rrRatio: 2.0 },
    version: "1.0.0",
  },
  {
    number: "15",
    id: "crypto-strat-15",
    name: "Range Fade",
    part: "PART III — PULLBACK & MEAN REVERSION",
    category: "Pullback & Mean Reversion",
    primaryTimeframe: "1H / 4H",
    alternateTimeframes: ["15m", "1H"],
    market: "BTC / ETH / Established Range Alts",
    direction: "LONG / SHORT",
    complexity: "Introductory",
    status: "READY",
    compatibleRegimes: ["RANGING"],
    dataRequirements: ["OHLCV", "Range High (RH)", "Range Low (RL)", "Range Midpoint (EQ)", "ADX (14)"],
    whatItDoes:
      "Identifies validated horizontal trading ranges with at least 2 touches per boundary. Enters fade orders when price tests the boundary, fails to expand, and closes back inside the range, targeting the Range Equilibrium (EQ).",
    whyItExists:
      "Range boundaries act as institutional supply and demand walls until structural balance shifts.",
    bestMarketConditions: [
      "Consolidated market conditions with flat ADX < 18",
      "Multiple confirmed touches of horizontal support and resistance",
    ],
    unfavorableConditions: [
      "Approaching macro breakout catalysts, high volume expansion candles breaking range boundaries",
    ],
    indicators: [
      { name: "Range High / Low", parameter: "Pivot Detect", purpose: "Range boundary coordinates", defaultSetting: "RH & RL" },
      { name: "Range Equilibrium", parameter: "50% Mid", purpose: "Target level (EQ)", defaultSetting: "Range EQ" },
      { name: "ADX", parameter: "14", purpose: "Regime non-trend validation (< 18)", defaultSetting: "ADX < 18" },
    ],
    setupConditions: [
      { id: "c1", name: "Range Validation", description: "Range established with >= 2 touches at Range High and Range Low", category: "STRUCTURE", required: true },
      { id: "c2", name: "Non-Trending Regime", description: "ADX 14 < 18", category: "TREND", required: true },
      { id: "c3", name: "Boundary Rejection", description: "Price touches RH (Short) or RL (Long) and closes back inside", category: "RECLAIM", required: true },
      { id: "c4", name: "Risk Clearance", description: "Stop placed outside range boundary; target at Range Equilibrium (EQ)", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "BTCUSDT",
      direction: "SHORT",
      entryPrice: 67800,
      stopPrice: 68600,
      targetPrice: 66200,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "Range High Fade", detail: "Range: $64,600 - $68,000 | Price tested $67,950 -> Rejected to close at $67,800" },
        { step: "ENTRY", title: "Short Executed", detail: "Filled Short at $67,800" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $68,600, Target at $66,200 (EQ)" },
        { step: "POSITION", title: "Active", detail: "Monitored as price moves across range" },
        { step: "EXIT", title: "EQ Target Hit", detail: "Closed at $66,200 (+2.0R)" },
        { step: "JOURNAL", title: "Saved", detail: "Recorded range coordinates, touch count, and fade execution" },
      ],
    },
    defaultParameters: { minRangeTouches: 2, maxAdx: 18, targetAtEq: true, rrRatio: 2.0 },
    version: "1.0.0",
  },

  // ==========================================
  // PART IV — STRUCTURE & REVERSAL
  // ==========================================
  {
    number: "16",
    id: "crypto-strat-16",
    name: "Swing Sweep Reversal",
    part: "PART IV — STRUCTURE & REVERSAL",
    category: "Structure & Reversal",
    primaryTimeframe: "15m / 1H",
    alternateTimeframes: ["5m", "15m", "4H"],
    market: "BTC / ETH / Liquid Alts",
    direction: "LONG / SHORT",
    complexity: "Advanced",
    status: "READY",
    compatibleRegimes: ["STRUCTURAL REVERSAL", "RANGING"],
    dataRequirements: ["OHLCV", "Swing High / Low Liquidity Pools", "Fair Value Gap (FVG)", "Volume Delta"],
    whatItDoes:
      "Detects stop-runs and liquidity sweeps. When price pierces a key swing high/low to take resting liquidity but immediately reverses and closes back inside the prior range with a long wick, the strategy enters in the reversal direction.",
    whyItExists:
      "Market makers and institutional algos frequently push price beyond obvious swing highs/lows to trigger resting buy/sell stops, capturing counterparty liquidity before moving price the opposite way.",
    bestMarketConditions: [
      "Clear swing highs and lows with heavy clustered liquidity",
      "Immediate wick rejection within 1-2 candles of the sweep",
    ],
    unfavorableConditions: [
      "True structural breakout where price sweeps and accelerates with expanding delta volume",
    ],
    indicators: [
      { name: "Swing Levels", parameter: "Pivot High/Low (20)", purpose: "Liquidity pool target reference", defaultSetting: "Swing High / Low" },
      { name: "Rejection Wick", parameter: "> 50% candle range", purpose: "Sweep rejection confirmation", defaultSetting: "Wick > 50%" },
      { name: "Volume Delta", parameter: "Buy/Sell Imbalance", purpose: "Absorption confirmation", defaultSetting: "Delta Absorption" },
    ],
    setupConditions: [
      { id: "c1", name: "Liquidity Sweep", description: "High > Swing High (Short) or Low < Swing Low (Long)", category: "STRUCTURE", required: true },
      { id: "c2", name: "Failed Acceptance", description: "Candle closes back inside prior range, not beyond swept level", category: "RECLAIM", required: true },
      { id: "c3", name: "Rejection Wick Ratio", description: "Wick constitutes >= 50% of the total candle length", category: "STRUCTURE", required: true },
      { id: "c4", name: "Risk Clearance", description: "Stop placed 2 ticks beyond sweep wick extreme; risk <= 0.5%", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "BTCUSDT",
      direction: "SHORT",
      entryPrice: 69200,
      stopPrice: 69850,
      targetPrice: 67900,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "Swing Sweep Confirmed", detail: "Swept $69,600 swing high -> Reached $69,780 -> Closed at $69,200 with 68% upper wick" },
        { step: "ENTRY", title: "Short Executed", detail: "Filled Short at $69,200" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $69,850, Target at $67,900" },
        { step: "POSITION", title: "Active", detail: "Monitored as swept liquidity turns into directional flow" },
        { step: "EXIT", title: "Target Reached", detail: "Closed at $67,900 (+2.0R)" },
        { step: "JOURNAL", title: "Audited", detail: "Logged swept liquidity level, wick percentage, and trade result" },
      ],
    },
    defaultParameters: { swingPeriod: 20, minWickRatioPct: 50, maxSweepBars: 2, rrRatio: 2.0 },
    version: "1.0.0",
  },
  {
    number: "17",
    id: "crypto-strat-17",
    name: "Failed Breakout Reversal",
    part: "PART IV — STRUCTURE & REVERSAL",
    category: "Structure & Reversal",
    primaryTimeframe: "1H / 4H",
    alternateTimeframes: ["15m", "1H"],
    market: "BTC / ETH / Alts",
    direction: "LONG / SHORT",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["STRUCTURAL REVERSAL", "RANGING"],
    dataRequirements: ["OHLCV", "Key Support / Resistance", "Volume Delta Imbalance", "2-bar Reversal Pattern"],
    whatItDoes:
      "When a breakout bar breaches a major support or resistance level but the very next candle fails to follow through and engulfs back inside the level, the strategy enters a reversal trade targeting the opposing range boundary.",
    whyItExists:
      "Trapped breakout traders who entered late are forced to market-sell/buy to exit, providing intense fuel for an aggressive counter-reversal.",
    bestMarketConditions: [
      "Range-bound markets creating deceptive breakout attempts",
      "Bearish/Bullish engulfing candle immediately following breakout candle",
    ],
    unfavorableConditions: [
      "High sustained volume trends with genuine multi-timeframe breakout momentum",
    ],
    indicators: [
      { name: "S/R Level", parameter: "Major Horizontal", purpose: "Breakout reference level", defaultSetting: "Key S/R" },
      { name: "2-bar Pattern", parameter: "Engulfing", purpose: "Trap confirmation", defaultSetting: "Engulfing Reversal" },
      { name: "Volume Delta", parameter: "Exhaustion", purpose: "Trapped volume confirmation", defaultSetting: "Trapped Volume" },
    ],
    setupConditions: [
      { id: "c1", name: "Breakout Bar", description: "Bar 1 closes beyond Key S/R level", category: "BREAKOUT", required: true },
      { id: "c2", name: "Trap Engulfing Bar", description: "Bar 2 closes back inside the S/R level engulfing Bar 1 body", category: "RECLAIM", required: true },
      { id: "c3", name: "Trapped Volume", description: "Bar 2 volume >= Bar 1 volume", category: "VOLUME", required: true },
      { id: "c4", name: "Risk Clearance", description: "Stop placed above false breakout high; target opposite boundary", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "SOLUSDT",
      direction: "SHORT",
      entryPrice: 151.0,
      stopPrice: 156.5,
      targetPrice: 140.0,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "Trap Confirmed", detail: "Breakout at $155 -> Failed with bearish engulfing close at $151.00 on 1.6x Vol" },
        { step: "ENTRY", title: "Short Filled", detail: "Executed Short at $151.00" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $156.50, Target at $140.00" },
        { step: "POSITION", title: "Active", detail: "Trapped longs cascading stops" },
        { step: "EXIT", title: "Target Reached", detail: "Closed at $140.00 (+2.0R)" },
        { step: "JOURNAL", title: "Saved", detail: "Recorded trap pattern geometry and execution metrics" },
      ],
    },
    defaultParameters: { requireEngulfing: true, minVolumeRatio: 1.0, rrRatio: 2.0 },
    version: "1.0.0",
  },
  {
    number: "18",
    id: "crypto-strat-18",
    name: "Prior-Level Rejection",
    part: "PART IV — STRUCTURE & REVERSAL",
    category: "Structure & Reversal",
    primaryTimeframe: "1H / 4H",
    alternateTimeframes: ["15m", "1H"],
    market: "BTC / ETH / Major Alts",
    direction: "LONG / SHORT",
    complexity: "Introductory",
    status: "READY",
    compatibleRegimes: ["RANGING", "STRUCTURAL REVERSAL"],
    dataRequirements: ["Prior Week High / Low (PWH/PWL)", "Prior Month High / Low (PMH/PML)", "Rejection Wick Ratio", "OHLCV"],
    whatItDoes:
      "Monitors multi-period macro benchmark levels (Prior Week High/Low, Prior Month High/Low). Enters sharp reversal trades when price tests these levels and prints a clear rejection pin bar.",
    whyItExists:
      "Weekly and monthly highs and lows represent major institutional macro boundaries where substantial rebalancing orders reside.",
    bestMarketConditions: [
      "Clean tests of prior weekly or monthly extremes in non-trending or mature trend phases",
    ],
    unfavorableConditions: [
      "Fresh secular breakout impulse bars with no wick rejection",
    ],
    indicators: [
      { name: "PWH / PWL", parameter: "Weekly Extreme", purpose: "Macro benchmark reference", defaultSetting: "PWH & PWL" },
      { name: "PMH / PML", parameter: "Monthly Extreme", purpose: "Macro benchmark reference", defaultSetting: "PMH & PML" },
      { name: "Pin Bar Ratio", parameter: "> 55% wick", purpose: "Rejection confirmation", defaultSetting: "Pin Bar > 55%" },
    ],
    setupConditions: [
      { id: "c1", name: "Macro Level Test", description: "Price high/low comes within 0.2% of PWH/PWL or PMH/PML", category: "STRUCTURE", required: true },
      { id: "c2", name: "Pin Bar Formation", description: "Candle wick >= 55% of candle range with small body", category: "STRUCTURE", required: true },
      { id: "c3", name: "Rejection Close", description: "Close on opposite side of level from probe", category: "RECLAIM", required: true },
      { id: "c4", name: "Risk Approval", description: "Stop beyond pin bar wick; Risk Engine validates sizing", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "ETHUSDT",
      direction: "SHORT",
      entryPrice: 3550,
      stopPrice: 3625,
      targetPrice: 3400,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "PWH Rejection", detail: "Tested Prior Week High ($3,610) -> Formed 4H pin bar rejection at $3,550" },
        { step: "ENTRY", title: "Short Executed", detail: "Filled Short at $3,550" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $3,625, Target at $3,400" },
        { step: "POSITION", title: "Active", detail: "Holding with trailing stop" },
        { step: "EXIT", title: "Target Hit", detail: "Closed at $3,400 (+2.0R)" },
        { step: "JOURNAL", title: "Audited", detail: "Saved macro weekly level and pin bar metrics" },
      ],
    },
    defaultParameters: { levelTolerancePct: 0.2, minWickPct: 55, rrRatio: 2.0 },
    version: "1.0.0",
  },
  {
    number: "19",
    id: "crypto-strat-19",
    name: "Structure Break + Retest",
    part: "PART IV — STRUCTURE & REVERSAL",
    category: "Structure & Reversal",
    primaryTimeframe: "1H / 4H / 1D",
    alternateTimeframes: ["15m", "1H"],
    market: "BTC / ETH / Liquid Alts",
    direction: "LONG / SHORT",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["STRUCTURAL REVERSAL"],
    dataRequirements: ["OHLCV", "Market Structure Highs/Lows (MSB / CHoCH)", "Order Block (OB)", "ATR (14)"],
    whatItDoes:
      "Detects structural market trend shifts (Change of Character / MSB) where an ongoing sequence of Higher Highs is broken by a displacement candle closing below the prior Higher Low. Waits for a retest of the origin Order Block before executing.",
    whyItExists:
      "Signals that institutional inventory has rotated from accumulation to distribution (or vice versa), establishing the first leg of a new structural trend.",
    bestMarketConditions: [
      "Clear exhaustion of prior multi-day trend followed by sharp structural displacement",
    ],
    unfavorableConditions: [
      "Choppy sideways environments with no defined higher highs or lower lows",
    ],
    indicators: [
      { name: "MSB / CHoCH", parameter: "Pivot HL / LH", purpose: "Structural break trigger", defaultSetting: "MSB Detector" },
      { name: "Order Block", parameter: "Displacement Origin", purpose: "Retest zone reference", defaultSetting: "Origin OB" },
      { name: "ATR", parameter: "14", purpose: "Displacement minimum threshold", defaultSetting: "ATR 14" },
    ],
    setupConditions: [
      { id: "c1", name: "Displacement Break", description: "Displacement candle closes beyond structural swing low/high by > 1.0x ATR", category: "STRUCTURE", required: true },
      { id: "c2", name: "Order Block Identified", description: "Origin base candle prior to displacement identified", category: "STRUCTURE", required: true },
      { id: "c3", name: "Orderly Retest", description: "Price retraces back into Order Block zone on lower volume", category: "PULLBACK", required: true },
      { id: "c4", name: "Rejection Trigger", description: "Candle closes rejecting the Order Block zone in direction of MSB", category: "RECLAIM", required: true },
      { id: "c5", name: "Risk Clearance", description: "Stop placed behind Order Block; risk <= 0.5%", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "BTCUSDT",
      direction: "SHORT",
      entryPrice: 66400,
      stopPrice: 67600,
      targetPrice: 64000,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "Structure Break (CHoCH)", detail: "4H Uptrend broken by displacement bar to $65,200 -> Retested Origin OB at $66,400" },
        { step: "ENTRY", title: "Short Filled", detail: "Executed Short at $66,400" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $67,600, Target at $64,000" },
        { step: "POSITION", title: "Active", detail: "Monitored as new downtrend develops" },
        { step: "EXIT", title: "Target Reached", detail: "Closed at $64,000 (+2.0R)" },
        { step: "JOURNAL", title: "Saved", detail: "Logged structural swing points and order block coordinates" },
      ],
    },
    defaultParameters: { minDisplacementAtr: 1.0, obZoneDepthPct: 50, rrRatio: 2.0 },
    version: "1.0.0",
  },
  {
    number: "20",
    id: "crypto-strat-20",
    name: "Daily Compression Expansion",
    part: "PART IV — STRUCTURE & REVERSAL",
    category: "Structure & Reversal",
    primaryTimeframe: "1D / 4H",
    alternateTimeframes: ["4H", "1D"],
    market: "BTC / ETH / Alts",
    direction: "LONG / SHORT",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["LOW VOLATILITY", "BREAKOUT / EXPANSION"],
    dataRequirements: ["Daily OHLCV", "NR7 Indicator (Narrowest Range of 7 days)", "Daily ATR (14)"],
    whatItDoes:
      "Identifies Inside Days and NR7 patterns (a daily candle whose high-low range is the narrowest of the past 7 days). Enters a breakout trade on the next day's open when price breaches the NR7 high or low.",
    whyItExists:
      "Markets continually oscillate between contraction and expansion. NR7 represents maximum volatility contraction, which is statistically followed by high-volatility expansion.",
    bestMarketConditions: [
      "Mature consolidation phases with 7 consecutive days of declining range width",
    ],
    unfavorableConditions: [
      "High volatility choppy market environments with expanding daily candle ranges",
    ],
    indicators: [
      { name: "NR7 Detector", parameter: "7-day range", purpose: "Narrowest range of 7 bars identification", defaultSetting: "NR7" },
      { name: "Inside Bar", parameter: "High < Prev High & Low > Prev Low", purpose: "Range containment filter", defaultSetting: "Inside Day" },
      { name: "ATR", parameter: "14", purpose: "Expansion target calculation", defaultSetting: "Daily ATR" },
    ],
    setupConditions: [
      { id: "c1", name: "NR7 Pattern", description: "Current daily candle range is narrowest of past 7 days", category: "VOLATILITY", required: true },
      { id: "c2", name: "Inside Range", description: "Daily High < Prev Day High AND Daily Low > Prev Day Low", category: "STRUCTURE", required: true },
      { id: "c3", name: "Breakout Trigger", description: "Next day price breaks above NR7 High (Long) or below NR7 Low (Short)", category: "BREAKOUT", required: true },
      { id: "c4", name: "Risk Clearance", description: "Stop placed at opposite extreme of NR7 bar; risk <= 0.5%", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "BTCUSDT",
      direction: "LONG",
      entryPrice: 65100,
      stopPrice: 63900,
      targetPrice: 67500,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "NR7 Inside Day", detail: "Daily Range $64,200 - $65,000 (narrowest of 7 days) -> Breached $65,100" },
        { step: "ENTRY", title: "Long Filled", detail: "Executed Long at $65,100" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $63,900, Target at $67,500" },
        { step: "POSITION", title: "Active", detail: "Holding through daily expansion wave" },
        { step: "EXIT", title: "Target Hit", detail: "Closed at $67,500 (+2.0R)" },
        { step: "JOURNAL", title: "Saved", detail: "Recorded NR7 compression stats and daily expansion metrics" },
      ],
    },
    defaultParameters: { nrLookback: 7, requireInsideBar: true, rrRatio: 2.0 },
    version: "1.0.0",
  },

  // ==========================================
  // PART V — MOMENTUM & VOLUME
  // ==========================================
  {
    number: "21",
    id: "crypto-strat-21",
    name: "Relative Volume Breakout",
    part: "PART V — MOMENTUM & VOLUME",
    category: "Momentum & Volume",
    primaryTimeframe: "15m / 1H",
    alternateTimeframes: ["5m", "15m", "4H"],
    market: "BTC / ETH / High Volume Alts",
    direction: "LONG / SHORT",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["BREAKOUT / EXPANSION"],
    dataRequirements: ["OHLCV", "RVOL (Relative Volume vs Time of Day)", "EMA (20)", "ATR (14)"],
    whatItDoes:
      "Calculates Relative Volume (RVOL) against normalized time-of-day volume profiles. Enters when price breaks out of a multi-hour consolidation while RVOL surges >= 2.5x standard volume, indicating institutional participation.",
    whyItExists:
      "Breakouts accompanied by high relative volume have statistically lower failure rates because institutional capital commitment is present.",
    bestMarketConditions: [
      "Consolidations resolving with sudden aggressive volume spikes",
      "High-liquidity market trading sessions",
    ],
    unfavorableConditions: [
      "Low liquidity hours with artificial low-volume drift",
    ],
    indicators: [
      { name: "RVOL", parameter: "Time-of-day normalized", purpose: "Volume surge factor (>= 2.5x)", defaultSetting: "RVOL >= 2.5" },
      { name: "Consolidation Range", parameter: "10-period High/Low", purpose: "Breakout reference bounds", defaultSetting: "Consolidation Box" },
      { name: "EMA 20", parameter: "20", purpose: "Trend alignment filter", defaultSetting: "EMA 20" },
    ],
    setupConditions: [
      { id: "c1", name: "RVOL Surge", description: "Current candle RVOL >= 2.5x historical time-of-day baseline", category: "VOLUME", required: true },
      { id: "c2", name: "Range Breakout", description: "Close > 10-period High (Long) or Close < 10-period Low (Short)", category: "BREAKOUT", required: true },
      { id: "c3", name: "Solid Candle Body", description: "Candle body >= 70% of total candle range", category: "STRUCTURE", required: true },
      { id: "c4", name: "Risk Clearance", description: "Stop placed below breakout bar low; risk <= 0.5%", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "ETHUSDT",
      direction: "LONG",
      entryPrice: 3340,
      stopPrice: 3260,
      targetPrice: 3500,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "RVOL 3.1x Breakout", detail: "RVOL at 3.1x baseline -> Broke $3,320 resistance to close at $3,340 on 78% body" },
        { step: "ENTRY", title: "Long Filled", detail: "Executed Long at $3,340" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $3,260, Target at $3,500" },
        { step: "POSITION", title: "Active", detail: "Monitored as volume sustains continuation" },
        { step: "EXIT", title: "Target Met", detail: "Closed at $3,500 (+2.0R)" },
        { step: "JOURNAL", title: "Saved", detail: "Logged RVOL factor, breakout parameters, and execution telemetry" },
      ],
    },
    defaultParameters: { minRvol: 2.5, minBodyPct: 70, consolidationBars: 10, rrRatio: 2.0 },
    version: "1.0.0",
  },
  {
    number: "22",
    id: "crypto-strat-22",
    name: "Volume Dry-Up Continuation",
    part: "PART V — MOMENTUM & VOLUME",
    category: "Momentum & Volume",
    primaryTimeframe: "1H / 4H",
    alternateTimeframes: ["15m", "1H"],
    market: "BTC / ETH / Trending Alts",
    direction: "LONG / SHORT",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["TRENDING"],
    dataRequirements: ["OHLCV", "Volume SMA (20)", "EMA (20, 50)", "ATR (14)"],
    whatItDoes:
      "In an established trend, after a strong impulse wave on heavy volume, price enters a shallow pullback where volume dries up to < 50% of the 20-period average. Enters as volume re-expands in the trend direction.",
    whyItExists:
      "Volume dry-up during a pullback proves that counter-trend selling is weak and lacks institutional backing, signaling high likelihood of trend resumption.",
    bestMarketConditions: [
      "Healthy trending markets with orderly, low-volume pullbacks to the 20 EMA",
    ],
    unfavorableConditions: [
      "High volume pullbacks indicating aggressive institutional distribution",
    ],
    indicators: [
      { name: "Volume SMA", parameter: "20-period", purpose: "Volume baseline reference", defaultSetting: "Vol SMA 20" },
      { name: "Pullback Volume Ratio", parameter: "< 0.50x SMA", purpose: "Dry-up validation", defaultSetting: "Vol < 0.50x" },
      { name: "EMA 20", parameter: "20", purpose: "Trend support reference", defaultSetting: "EMA 20" },
    ],
    setupConditions: [
      { id: "c1", name: "Established Trend", description: "EMA 20 > EMA 50 (Long) or EMA 20 < EMA 50 (Short)", category: "TREND", required: true },
      { id: "c2", name: "Volume Dry-Up", description: "Pullback bars have volume < 50% of 20-period Volume SMA", category: "VOLUME", required: true },
      { id: "c3", name: "Support Hold", description: "Pullback holds above EMA 20 or EMA 50 without closing below", category: "PULLBACK", required: true },
      { id: "c4", name: "Re-expansion Trigger", description: "Trigger bar closes in trend direction with volume expanding > 1.2x SMA", category: "RECLAIM", required: true },
      { id: "c5", name: "Risk Clearance", description: "Stop placed below dry-up low; risk <= 0.5%", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "BTCUSDT",
      direction: "LONG",
      entryPrice: 67100,
      stopPrice: 66100,
      targetPrice: 69100,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "Dry-Up Reclaim", detail: "3 bars volume < 42% of SMA during pullback to EMA 20 -> Trigger bar volume popped to 1.4x SMA" },
        { step: "ENTRY", title: "Long Filled", detail: "Executed Long at $67,100" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $66,100, Target at $69,100" },
        { step: "POSITION", title: "Active", detail: "Holding with dynamic trailing stop" },
        { step: "EXIT", title: "Target Reached", detail: "Closed at $69,100 (+2.0R)" },
        { step: "JOURNAL", title: "Saved", detail: "Recorded dry-up volume metrics and trigger bar volume" },
      ],
    },
    defaultParameters: { maxDryUpVolRatio: 0.5, minTriggerVolRatio: 1.2, emaFast: 20, emaSlow: 50, rrRatio: 2.0 },
    version: "1.0.0",
  },
  {
    number: "23",
    id: "crypto-strat-23",
    name: "Volume Climax Reversal",
    part: "PART V — MOMENTUM & VOLUME",
    category: "Momentum & Volume",
    primaryTimeframe: "15m / 1H",
    alternateTimeframes: ["5m", "15m"],
    market: "BTC / ETH / High Beta Alts",
    direction: "LONG / SHORT",
    complexity: "Advanced",
    status: "READY",
    compatibleRegimes: ["HIGH VOLATILITY", "STRUCTURAL REVERSAL"],
    dataRequirements: ["OHLCV", "Volume Z-Score (> 3.5 std)", "RSI (14)", "ATR (14)"],
    whatItDoes:
      "Detects blow-off tops or capitulation selling climaxes characterized by parabolic price extension and extreme volume Z-scores (> 3.5 standard deviations above 50-period mean). Enters a counter-trend fade when an exhaustion candle prints.",
    whyItExists:
      "Parabolic volume climaxes indicate the total exhaustion of aggressive market orders (the 'last buyers' or 'last sellers' market-entering), leaving the book wide open for an immediate sharp reversal.",
    bestMarketConditions: [
      "Sudden emotional liquidation cascades or parabolic pump-and-dump spikes",
    ],
    unfavorableConditions: [
      "Early stages of fresh fundamental news cycles with unlimited spot demand",
    ],
    indicators: [
      { name: "Volume Z-Score", parameter: "50-period mean", purpose: "Extreme volume anomaly detection (> 3.5 std)", defaultSetting: "Vol Z-Score > 3.5" },
      { name: "RSI", parameter: "14", purpose: "Momentum exhaustion (< 15 or > 85)", defaultSetting: "RSI < 15 or > 85" },
      { name: "ATR", parameter: "14", purpose: "Candle range expansion factor", defaultSetting: "ATR 14" },
    ],
    setupConditions: [
      { id: "c1", name: "Volume Climax", description: "Volume Z-Score >= 3.5 standard deviations above 50-period mean", category: "VOLUME", required: true },
      { id: "c2", name: "RSI Exhaustion", description: "RSI 14 <= 15 (Long) or >= 85 (Short)", category: "STRUCTURE", required: true },
      { id: "c3", name: "Exhaustion Wick", description: "Candle creates long rejection wick or inside bar pause", category: "STRUCTURE", required: true },
      { id: "c4", name: "Risk Approval", description: "Stop placed 1.0x ATR beyond climax high/low; risk <= 0.5%", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "SOLUSDT",
      direction: "SHORT",
      entryPrice: 165.0,
      stopPrice: 172.5,
      targetPrice: 150.0,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "Volume Climax", detail: "Volume Z-Score: +4.2 std | RSI: 88.5 | Upper wick at $171.00 -> Closed at $165.00" },
        { step: "ENTRY", title: "Short Filled", detail: "Executed Short at $165.00" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $172.50, Target at $150.00" },
        { step: "POSITION", title: "Active", detail: "Holding as parabolic move collapses" },
        { step: "EXIT", title: "Target Reached", detail: "Closed at $150.00 (+2.0R)" },
        { step: "JOURNAL", title: "Saved", detail: "Logged volume Z-score, RSI peak, and fade execution" },
      ],
    },
    defaultParameters: { minVolumeZScore: 3.5, rsiClimaxLow: 15, rsiClimaxHigh: 85, rrRatio: 2.0 },
    version: "1.0.0",
  },
  {
    number: "24",
    id: "crypto-strat-24",
    name: "OBV Divergence",
    part: "PART V — MOMENTUM & VOLUME",
    category: "Momentum & Volume",
    primaryTimeframe: "1H / 4H",
    alternateTimeframes: ["15m", "1H"],
    market: "BTC / ETH / Major Alts",
    direction: "LONG / SHORT",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["STRUCTURAL REVERSAL", "RANGING"],
    dataRequirements: ["OHLCV", "On-Balance Volume (OBV)", "OBV 20-period EMA", "Price Swing Highs/Lows"],
    whatItDoes:
      "Detects divergences between price swings and cumulative On-Balance Volume. When price prints a Lower Low but OBV prints a Higher Low (Bullish Divergence) or price prints a Higher High while OBV prints a Lower High (Bearish Divergence), enters upon OBV crossing its 20 EMA.",
    whyItExists:
      "OBV aggregates buying and selling volume. A divergence reveals underlying institutional accumulation or distribution occurring silently beneath deceptive price action.",
    bestMarketConditions: [
      "Mature trends approaching key macro support or resistance levels",
      "Multi-day divergences across 1H and 4H timeframes",
    ],
    unfavorableConditions: [
      "Early stage high-momentum breakout trends where price and OBV expand in lockstep",
    ],
    indicators: [
      { name: "OBV", parameter: "Cumulative", purpose: "Volume flow trend", defaultSetting: "OBV" },
      { name: "OBV EMA", parameter: "20-period", purpose: "OBV signal trigger crossover", defaultSetting: "OBV EMA 20" },
      { name: "Swing Detector", parameter: "Pivot (10)", purpose: "Price vs OBV divergence baseline", defaultSetting: "Swing Points" },
    ],
    setupConditions: [
      { id: "c1", name: "Divergence Detected", description: "Price Lower Low with OBV Higher Low (Long) or Price Higher High with OBV Lower High (Short)", category: "VOLUME", required: true },
      { id: "c2", name: "OBV Trigger", description: "OBV crosses above its 20 EMA (Long) or below its 20 EMA (Short)", category: "RECLAIM", required: true },
      { id: "c3", name: "Price Confirmation", description: "Price forms a reversal candle in divergence direction", category: "STRUCTURE", required: true },
      { id: "c4", name: "Risk Clearance", description: "Stop placed beyond divergence price swing; risk <= 0.5%", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "ETHUSDT",
      direction: "LONG",
      entryPrice: 3220,
      stopPrice: 3140,
      targetPrice: 3380,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "OBV Bullish Divergence", detail: "ETH Price: Lower Low at $3,150 | OBV: Higher Low | OBV crossed above 20 EMA" },
        { step: "ENTRY", title: "Long Filled", detail: "Executed Long at $3,220" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $3,140, Target at $3,380" },
        { step: "POSITION", title: "Active", detail: "Accumulation flow driving price upward" },
        { step: "EXIT", title: "Target Met", detail: "Closed at $3,380 (+2.0R)" },
        { step: "JOURNAL", title: "Audited", detail: "Logged OBV divergence slope and crossover timestamp" },
      ],
    },
    defaultParameters: { obvEmaPeriod: 20, swingLookback: 10, rrRatio: 2.0 },
    version: "1.0.0",
  },
  {
    number: "25",
    id: "crypto-strat-25",
    name: "VWAP Reclaim on Volume",
    part: "PART V — MOMENTUM & VOLUME",
    category: "Momentum & Volume",
    primaryTimeframe: "15m / 1H",
    alternateTimeframes: ["5m", "15m"],
    market: "BTC / ETH / Liquid Alts",
    direction: "LONG / SHORT",
    complexity: "Introductory",
    status: "READY",
    compatibleRegimes: ["TRENDING", "BREAKOUT / EXPANSION"],
    dataRequirements: ["OHLCV", "Session VWAP", "Volume SMA (20)", "EMA (5)"],
    whatItDoes:
      "When price temporarily dips below the daily session VWAP in an intraday trend, this strategy waits for buyers to aggressively step in and reclaim VWAP with a high-volume candle closing cleanly above the VWAP line.",
    whyItExists:
      "Institutional execution algos use VWAP as their benchmark execution price. An aggressive reclaim on above-average volume demonstrates institutional willingness to pay up above the daily average price.",
    bestMarketConditions: [
      "Intraday trending days where VWAP is sloping upward (Long) or downward (Short)",
      "Reclaim candle volume > 1.5x 20-period average",
    ],
    unfavorableConditions: [
      "Flat, horizontal VWAP regimes with price oscillating back and forth across the line",
    ],
    indicators: [
      { name: "Session VWAP", parameter: "Daily Reset", purpose: "Institutional volume-weighted benchmark", defaultSetting: "Session VWAP" },
      { name: "Volume SMA", parameter: "20-period", purpose: "Reclaim volume multiplier (> 1.5x)", defaultSetting: "Vol SMA 20" },
      { name: "EMA 5", parameter: "5-period", purpose: "Immediate momentum slope confirmation", defaultSetting: "EMA 5" },
    ],
    setupConditions: [
      { id: "c1", name: "Intraday Dip", description: "Price traded below VWAP for at least 2 consecutive bars (Long)", category: "PULLBACK", required: true },
      { id: "c2", name: "VWAP Reclaim", description: "Candle closes strictly above VWAP with close in top 30% of bar", category: "RECLAIM", required: true },
      { id: "c3", name: "Volume Spike", description: "Reclaim candle volume >= 1.5x 20-period Volume SMA", category: "VOLUME", required: true },
      { id: "c4", name: "Risk Clearance", description: "Stop placed below dip swing low; risk <= 0.5%", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "BTCUSDT",
      direction: "LONG",
      entryPrice: 67450,
      stopPrice: 66800,
      targetPrice: 68750,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "VWAP Reclaimed", detail: "Dipped to $66,950 -> Bullish bar surged through VWAP ($67,200) to close at $67,450 on 1.9x Vol" },
        { step: "ENTRY", title: "Long Filled", detail: "Executed Long at $67,450" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $66,800, Target at $68,750" },
        { step: "POSITION", title: "Active", detail: "Holding as buyers control intraday auction" },
        { step: "EXIT", title: "Target Reached", detail: "Closed at $68,750 (+2.0R)" },
        { step: "JOURNAL", title: "Saved", detail: "Logged VWAP reclaim price, volume multiple, and trade outcome" },
      ],
    },
    defaultParameters: { minDipBars: 2, minVolumeMultiplier: 1.5, barCloseTopPct: 30, rrRatio: 2.0 },
    version: "1.0.0",
  },

  // ==========================================
  // PART VI — CRYPTO-SPECIFIC & MULTI-FACTOR
  // ==========================================
  {
    number: "26",
    id: "crypto-strat-26",
    name: "Basis Extreme Reversal",
    part: "PART VI — CRYPTO-SPECIFIC & MULTI-FACTOR",
    category: "Crypto-Specific & Multi-Factor",
    primaryTimeframe: "1H / 4H",
    alternateTimeframes: ["15m", "1H"],
    market: "BTC / ETH Futures vs Spot Basis",
    direction: "LONG / SHORT",
    complexity: "Institutional",
    status: "READY",
    compatibleRegimes: ["STRUCTURAL REVERSAL", "HIGH VOLATILITY"],
    dataRequirements: ["Spot Index Price", "Perpetual / Quarterly Futures Price", "Annualized Basis Spread", "30-Day Historical Basis Mean & Std"],
    whatItDoes:
      "Tracks the annualized basis spread between Spot and Perpetual/Futures prices. When basis deviates >= 2.5 standard deviations from its 30-day mean (indicating extreme overleveraged contango or panic backwardation), the strategy enters a basis compression reversal trade.",
    whyItExists:
      "Perpetual funding rate mechanics and futures basis arbitrage force extreme basis dislocations to compress back toward equilibrium as arbitrageurs deploy capital.",
    bestMarketConditions: [
      "Periods of extreme euphoria (annualized basis > 35%) or capitulation discount (negative basis / backwardation)",
    ],
    unfavorableConditions: [
      "Quiet, neutral basis environments (basis within +/- 0.5 std of historical mean)",
    ],
    indicators: [
      { name: "Annualized Basis", parameter: "(Futures - Spot) / Spot * 365/DTE", purpose: "Basis spread metric", defaultSetting: "Annualized Basis" },
      { name: "Basis Z-Score", parameter: "30-day lookback", purpose: "Statistical anomaly trigger (>= 2.5 std)", defaultSetting: "Basis Z-Score >= 2.5" },
      { name: "Funding Rate", parameter: "8H settlement", purpose: "Funding cost alignment", defaultSetting: "Predicted Funding" },
    ],
    setupConditions: [
      { id: "c1", name: "Basis Extreme", description: "Annualized Basis Z-Score >= 2.5 std above mean (Short) or <= -2.5 std below mean (Long)", category: "CRYPTO_SPECIFIC", required: true },
      { id: "c2", name: "Data Feeds Verified", description: "Spot price, Futures price, and Funding rate healthy and synchronized", category: "DATA", required: true },
      { id: "c3", name: "Price Deceleration", description: "Underlying derivative price prints a reversal wick", category: "STRUCTURE", required: true },
      { id: "c4", name: "Risk Clearance", description: "Target set at 30-day mean basis; Risk Engine sizes position", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "BTCUSDT-PERP",
      direction: "SHORT",
      entryPrice: 69800,
      stopPrice: 70800,
      targetPrice: 67800,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "Basis Extreme Detected", detail: "Annualized Basis reached +38.5% (+2.8 Std Dev above 30D mean of +8.2%)" },
        { step: "ENTRY", title: "Short Filled", detail: "Executed Short on Perp at $69,800" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $70,800, Target at $67,800" },
        { step: "POSITION", title: "Active", detail: "Collecting positive funding while basis compresses" },
        { step: "EXIT", title: "Basis Compressed", detail: "Closed at $67,800 (+2.0R) as basis reverted to +10.1%" },
        { step: "JOURNAL", title: "Saved", detail: "Logged spot price, perp price, basis spread %, and funding earned" },
      ],
    },
    defaultParameters: { basisZScoreThreshold: 2.5, lookbackDays: 30, rrRatio: 2.0 },
    version: "1.0.0",
  },
  {
    number: "27",
    id: "crypto-strat-27",
    name: "Open Interest Expansion",
    part: "PART VI — CRYPTO-SPECIFIC & MULTI-FACTOR",
    category: "Crypto-Specific & Multi-Factor",
    primaryTimeframe: "1H / 4H",
    alternateTimeframes: ["15m", "1H"],
    market: "BTC / ETH / Derivatives",
    direction: "LONG / SHORT",
    complexity: "Institutional",
    status: "READY",
    compatibleRegimes: ["BREAKOUT / EXPANSION", "TRENDING"],
    dataRequirements: ["Aggregated Open Interest (OI)", "Price OHLCV", "Funding Rate", "OI 4-Hour Delta (%)"],
    whatItDoes:
      "Monitors real-time aggregated derivative Open Interest. When OI expands rapidly by >= 8% in 4 hours while price breaks out of consolidation with stable/neutral funding, the strategy enters in the breakout direction, confirming that new capital is actively fueling the move.",
    whyItExists:
      "Distinguishes genuine institutional expansion from weak short-covering rallies. True breakouts are characterized by rising price AND surging Open Interest.",
    bestMarketConditions: [
      "Consolidations resolving with explosive Open Interest expansion and low/moderate funding rates",
    ],
    unfavorableConditions: [
      "Price rallies accompanied by declining Open Interest (pure short-covering that exhausts quickly)",
      "Extremely overheated funding rates (> 0.05% per 8h)",
    ],
    indicators: [
      { name: "Aggregated OI", parameter: "Derivatives aggregate", purpose: "Total active contract volume", defaultSetting: "Aggregated OI" },
      { name: "OI 4H Delta", parameter: ">= +8.0%", purpose: "New leverage positioning trigger", defaultSetting: "OI Delta >= +8%" },
      { name: "Funding Rate", parameter: "8H", purpose: "Funding overheating guard (< 0.04%)", defaultSetting: "Funding < 0.04%" },
    ],
    setupConditions: [
      { id: "c1", name: "OI Expansion", description: "Aggregated Open Interest increases by >= 8.0% over past 4 hours", category: "CRYPTO_SPECIFIC", required: true },
      { id: "c2", name: "Price Breakout", description: "Price breaks and closes beyond 20-period range boundary", category: "BREAKOUT", required: true },
      { id: "c3", name: "Funding Health", description: "Funding rate is moderate (|funding| < 0.04%), avoiding crowded liquidation traps", category: "CRYPTO_SPECIFIC", required: true },
      { id: "c4", name: "Data Feed Verified", description: "Real-time derivative OI stream confirmed healthy and not stale", category: "DATA", required: true },
      { id: "c5", name: "Risk Clearance", description: "Stop placed at pre-breakout base; risk <= 0.5%", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "BTCUSDT",
      direction: "LONG",
      entryPrice: 66800,
      stopPrice: 65400,
      targetPrice: 69600,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "OI Expansion Trigger", detail: "4H OI: +$1.2B (+11.4%) | Price broke $66,200 to $66,800 | Funding: 0.012% (healthy)" },
        { step: "ENTRY", title: "Long Filled", detail: "Executed Long at $66,800" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $65,400, Target at $69,600" },
        { step: "POSITION", title: "Active", detail: "Trailing stop activated upon +1.0R" },
        { step: "EXIT", title: "Target Reached", detail: "Closed at $69,600 (+2.0R)" },
        { step: "JOURNAL", title: "Saved", detail: "Logged OI delta, funding rate, and breakout execution details" },
      ],
    },
    defaultParameters: { minOiDeltaPct: 8.0, oiLookbackHours: 4, maxFundingRatePct: 0.04, rrRatio: 2.0 },
    version: "1.0.0",
  },
  {
    number: "28",
    id: "crypto-strat-28",
    name: "Flush & Reclaim",
    part: "PART VI — CRYPTO-SPECIFIC & MULTI-FACTOR",
    category: "Crypto-Specific & Multi-Factor",
    primaryTimeframe: "15m / 1H",
    alternateTimeframes: ["5m", "15m"],
    market: "BTC / ETH / High Leverage Derivatives",
    direction: "LONG / SHORT",
    complexity: "Advanced",
    status: "READY",
    compatibleRegimes: ["STRUCTURAL REVERSAL", "HIGH VOLATILITY"],
    dataRequirements: ["Liquidations Feed / Sudden OI Drop", "Session VWAP", "Tick Delta Imbalance", "15m OHLCV"],
    whatItDoes:
      "Captures violent liquidation cascades. When price experiences a sudden flush triggering heavy liquidations and an immediate drop in Open Interest, and then aggressively reclaims the pre-flush level within 2 bars, the strategy enters long, riding the sharp V-reversal.",
    whyItExists:
      "Liquidation flushes clean out overleveraged retail positions. Once the liquidation cascade clears, market makers and institutional buyers step into the order vacuum to bid price back to fair value.",
    bestMarketConditions: [
      "High leverage liquidation events where price spikes downward, cleans the order book, and immediately V-bounces",
    ],
    unfavorableConditions: [
      "True catastrophic macro liquidation events with sustained selling and broken spot markets",
    ],
    indicators: [
      { name: "Liquidation Drop", parameter: "OI drop > 4% in 15m", purpose: "Cascade clearing detection", defaultSetting: "OI Drop > 4%" },
      { name: "Pre-Flush Level", parameter: "Anchor Pivot", purpose: "Reclaim baseline target", defaultSetting: "Pre-Flush Level" },
      { name: "Tick Delta", parameter: "Aggressive Buy Delta", purpose: "V-reversal aggressive bidding", defaultSetting: "Buy Delta Spike" },
    ],
    setupConditions: [
      { id: "c1", name: "Liquidation Flush", description: "Sharp drop of >= 2.5% accompanied by heavy liquidation volume / OI drop", category: "CRYPTO_SPECIFIC", required: true },
      { id: "c2", name: "Fast Reclaim", description: "Within 2 bars, price closes back above the pre-flush breakdown level", category: "RECLAIM", required: true },
      { id: "c3", name: "Delta Reversal", description: "Cumulative Tick Delta shifts sharply positive on reclaim bar", category: "VOLUME", required: true },
      { id: "c4", name: "Risk Clearance", description: "Stop placed at flush wick absolute low; risk <= 0.5%", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "BTCUSDT",
      direction: "LONG",
      entryPrice: 65400,
      stopPrice: 64100,
      targetPrice: 68000,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "Flush & Reclaim Fired", detail: "Flushed from $65,200 to $64,200 ($120M liquidations) -> Next 15m bar closed back at $65,400 with positive delta" },
        { step: "ENTRY", title: "Long Filled", detail: "Executed Long at $65,400" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $64,100, Target at $68,000" },
        { step: "POSITION", title: "Active", detail: "Holding as order book recovers" },
        { step: "EXIT", title: "Target Reached", detail: "Closed at $68,000 (+2.0R)" },
        { step: "JOURNAL", title: "Saved", detail: "Logged liquidation volume, OI drop %, and V-reversal speed" },
      ],
    },
    defaultParameters: { minFlushPct: 2.5, maxReclaimBars: 2, rrRatio: 2.0 },
    version: "1.0.0",
  },
  {
    number: "29",
    id: "crypto-strat-29",
    name: "Dominance-Filtered Alt Trend",
    part: "PART VI — CRYPTO-SPECIFIC & MULTI-FACTOR",
    category: "Crypto-Specific & Multi-Factor",
    primaryTimeframe: "4H / 1D",
    alternateTimeframes: ["1H", "4H"],
    market: "Altcoins filtered by BTC Dominance (BTC.D)",
    direction: "LONG / SHORT",
    complexity: "Advanced",
    status: "READY",
    compatibleRegimes: ["TRENDING"],
    dataRequirements: ["BTC Dominance Index (BTC.D)", "BTC/USDT Trend", "Altcoin OHLCV", "EMA (20, 50)"],
    whatItDoes:
      "Filters altcoin long setups using macro Bitcoin Dominance (BTC.D). Altcoin trend breakouts are ONLY permitted when BTC.D is declining below its 50 EMA and BTC is stable/uptrending (Altseason regime). In rising BTC.D regimes, altcoin longs are blocked.",
    whyItExists:
      "Altcoins consistently underperform and suffer severe liquidity drains when Bitcoin Dominance is rising. Filtering altcoin exposure through BTC.D dramatically increases breakout follow-through.",
    bestMarketConditions: [
      "Declining BTC Dominance with BTC/USDT consolidating sideways or trending upward peacefully",
    ],
    unfavorableConditions: [
      "Rising BTC Dominance (Bitcoin sucking liquidity out of altcoins)",
      "Sharp Bitcoin liquidation crashes (drags all alts down with higher beta)",
    ],
    indicators: [
      { name: "BTC.D Index", parameter: "Daily / 4H", purpose: "Macro market regime filter", defaultSetting: "BTC.D < EMA 50" },
      { name: "BTC Trend", parameter: "BTC > EMA 50", purpose: "Bitcoin stability check", defaultSetting: "BTC Trend Bullish" },
      { name: "Altcoin EMA", parameter: "20 / 50", purpose: "Altcoin trend trigger", defaultSetting: "Alt EMA 20 > 50" },
    ],
    setupConditions: [
      { id: "c1", name: "Dominance Filter", description: "BTC.D < BTC.D EMA 50 with negative slope", category: "CRYPTO_SPECIFIC", required: true },
      { id: "c2", name: "BTC Market Stability", description: "BTC/USDT > 50 EMA on 4H chart (no active BTC panic)", category: "TREND", required: true },
      { id: "c3", name: "Altcoin Breakout", description: "Selected Altcoin breaks 4H resistance on volume > 1.5x SMA", category: "BREAKOUT", required: true },
      { id: "c4", name: "Data Feeds Healthy", description: "BTC.D index feed and BTC/USDT live feeds verified", category: "DATA", required: true },
      { id: "c5", name: "Risk Clearance", description: "Stop placed below alt swing low; risk <= 0.5%", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "NEARUSDT",
      direction: "LONG",
      entryPrice: 5.8,
      stopPrice: 5.2,
      targetPrice: 7.0,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "Dominance Filter PASS", detail: "BTC.D: 54.2% (dropping below EMA 50) | BTC: Stable at $67,500 | NEAR broke 4H resistance at $5.80" },
        { step: "ENTRY", title: "Long Filled", detail: "Executed Long at $5.80" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $5.20, Target at $7.00" },
        { step: "POSITION", title: "Active", detail: "Trailing stop active as altseason momentum accelerates" },
        { step: "EXIT", title: "Target Reached", detail: "Closed at $7.00 (+2.0R)" },
        { step: "JOURNAL", title: "Audited", detail: "Logged BTC.D value, BTC trend state, and altcoin execution details" },
      ],
    },
    defaultParameters: { btcDominanceEmaPeriod: 50, btcTrendEmaPeriod: 50, altVolumeMultiplier: 1.5, rrRatio: 2.0 },
    version: "1.0.0",
  },
  {
    number: "30",
    id: "crypto-strat-30",
    name: "Three-Factor Regime Setup",
    part: "PART VI — CRYPTO-SPECIFIC & MULTI-FACTOR",
    category: "Crypto-Specific & Multi-Factor",
    primaryTimeframe: "4H / 1D",
    alternateTimeframes: ["1H", "4H"],
    market: "BTC / ETH Multi-Asset",
    direction: "LONG / SHORT",
    complexity: "Institutional",
    status: "READY",
    compatibleRegimes: ["TRENDING", "BREAKOUT / EXPANSION"],
    dataRequirements: ["Factor 1: Trend Alignment (EMA 200/50)", "Factor 2: Volatility Regime (ATR/BandWidth percentile)", "Factor 3: Order Flow / OI & Funding", "Multi-Asset Feed"],
    whatItDoes:
      "Evaluates three independent quantitative market factors concurrently: (1) Macro Trend Alignment (EMA 50/200), (2) Volatility Expansion Envelope, and (3) Derivative Order Flow & Funding Health. Executes ONLY when all 3 macro factors produce unified unanimous confirmation.",
    whyItExists:
      "Single-indicator systems fail when regimes change. Requiring multi-factor mathematical confluence eliminates over 80% of false signals during ambiguous market phases.",
    bestMarketConditions: [
      "Major macro market transitions where trend, volatility, and order flow metrics align unanimously",
    ],
    unfavorableConditions: [
      "Any market phase where any of the 3 quantitative factors disagrees or outputs conflicted data",
    ],
    indicators: [
      { name: "Factor 1: Trend", parameter: "EMA 50 & EMA 200", purpose: "Macro trend alignment factor", defaultSetting: "Trend Confluence" },
      { name: "Factor 2: Volatility", parameter: "ATR 14 & BandWidth", purpose: "Volatility regime state", defaultSetting: "Volatility Expansion" },
      { name: "Factor 3: Order Flow", parameter: "OI Delta & Funding", purpose: "Institutional capital flow", defaultSetting: "OI & Funding Flow" },
    ],
    setupConditions: [
      { id: "c1", name: "Factor 1: Trend", description: "Price > EMA 50 > EMA 200 (Long) or Price < EMA 50 < EMA 200 (Short)", category: "TREND", required: true },
      { id: "c2", name: "Factor 2: Volatility", description: "ATR 14 expanding above 20-period SMA; BandWidth expanding out of compression", category: "VOLATILITY", required: true },
      { id: "c3", name: "Factor 3: Order Flow", description: "4H OI expanding with healthy funding (|funding| <= 0.03%)", category: "CRYPTO_SPECIFIC", required: true },
      { id: "c4", name: "Unanimous Consensus", description: "All 3 factors MUST score 100% PASS; single failure blocks trade", category: "STRUCTURE", required: true },
      { id: "c5", name: "Risk Clearance", description: "Stop placed below structural low; Risk Engine sizes position; risk <= 0.5%", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "BTCUSDT",
      direction: "LONG",
      entryPrice: 68400,
      stopPrice: 66900,
      targetPrice: 71400,
      riskPct: 0.5,
      rrRatio: "1:2.0",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "3-Factor Consensus UNANIMOUS", detail: "F1 (Trend): PASS | F2 (Volatility): PASS | F3 (Order Flow): PASS -> UNANIMOUS LONG SETUP" },
        { step: "ENTRY", title: "Long Filled", detail: "Executed Long at $68,400" },
        { step: "STOP_TARGET", title: "Orders Placed", detail: "Stop at $66,900, Target at $71,400" },
        { step: "POSITION", title: "Active", detail: "Institutional multi-factor position tracking" },
        { step: "EXIT", title: "Target Reached", detail: "Closed at $71,400 (+2.0R)" },
        { step: "JOURNAL", title: "Audited", detail: "Logged all 3 factor states, values, timestamps, and execution performance" },
      ],
    },
    defaultParameters: { emaFast: 50, emaSlow: 200, maxFundingPct: 0.03, requireUnanimous: true, rrRatio: 2.0 },
    version: "1.0.0",
  },
];

export const QUANTOS_PRO_STRATEGIES: CryptoStrategyDefinition[] = [
  {
    number: "PRO-01",
    id: "liquidity-rejection-structure-pro",
    name: "Liquidity Rejection Structure Pro",
    part: "PART IV — STRUCTURE & REVERSAL",
    category: "Structure & Reversal",
    primaryTimeframe: "15m / 1H",
    alternateTimeframes: ["5m", "15m", "1h", "4h"],
    market: "BTC / ETH / Major Liquid Crypto & Index Perps",
    direction: "LONG / SHORT",
    complexity: "Institutional",
    status: "READY",
    compatibleRegimes: ["TRENDING", "RANGING", "BREAKOUT / EXPANSION", "STRUCTURAL REVERSAL"],
    dataRequirements: [
      "15m OHLCV History (min 50 bars)",
      "14-Period Average True Range (ATR)",
      "Observable Liquidity Pools (Swing/Equal/Range/Round)",
      "Realtime Orderbook Spread (<0.20%)",
    ],
    whatItDoes:
      "MARKET STATE → LIQUIDITY POOL → SWEEP → REJECTION → CHoCH/BOS → RETEST → ENTRY → RISK → OPPOSING LIQUIDITY TARGET. Identifies observable liquidity pools, validates normalized ATR wick sweeps, confirms completed candle rejection into value, verifies structural shift via CHoCH, and executes on retest targeting opposing liquidity.",
    whyItExists:
      "Liquidity rests at observable swing highs/lows and equal levels. When swept without acceptance, trapped volume fuels sharp structural transitions back toward opposing liquidity reserves.",
    bestMarketConditions: [
      "Trend pullbacks to key structural levels, established horizontal trading ranges, and structural reversal points with clean boundary rejections",
    ],
    unfavorableConditions: [
      "Market state = UNCLEAR, sustained price acceptance beyond swept level (>2 bars), wide spreads (>0.20%), or missing fresh tick data",
    ],
    indicators: [
      { name: "Liquidity Pool Scanner", parameter: "Swing 5, Equal 0.15%", purpose: "Observable structural liquidity", defaultSetting: "Pivots / EQH / EQL / Range" },
      { name: "ATR Normalization", parameter: "14-Period ATR", purpose: "Sweep distance bounds (0.05-1.00 ATR)", defaultSetting: "14 Period" },
      { name: "Rejection & Acceptance", parameter: "Max 2 Acceptance Bars", purpose: "Rejection validation filter", defaultSetting: "Wick Reclaim" },
      { name: "CHoCH Validator", parameter: "Completed Close Beyond LH/HL", purpose: "Market structure shift", defaultSetting: "Completed Bar CHoCH" },
      { name: "Confluence Scoring", parameter: "Min 70/100 Points", purpose: "Volume + VPVR + FVG alignment", defaultSetting: "Score >= 70" },
    ],
    setupConditions: [
      { id: "c1", name: "Market State", description: "Symbol state classified as TREND, RANGE, BREAKOUT, or REVERSAL (not UNCLEAR)", category: "STRUCTURE", required: true },
      { id: "c2", name: "Liquidity Pool Sweep", description: "Wick pierces valid liquidity level with distance in [0.05, 1.00] ATR", category: "STRUCTURE", required: true },
      { id: "c3", name: "Rejection Confirmed", description: "Completed candle closes back inside level without acceptance (>2 bars invalidates)", category: "VOLATILITY", required: true },
      { id: "c4", name: "CHoCH Confirmed", description: "Completed candle closes beyond most recent structural lower-high (Long) or higher-low (Short)", category: "STRUCTURE", required: true },
      { id: "c5", name: "Confluence Score >= 70", description: "Mandatory conditions + optional volume / VWAP / FVG confluences sum to >= 70 points", category: "MOMENTUM", required: true },
      { id: "c6", name: "Risk Clearance & RR >= 2.0", description: "Target at opposing liquidity pool offers >= 2.0:1 reward-to-risk with 0.50% equity risk", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "BTCUSDT",
      direction: "LONG",
      entryPrice: 64850,
      stopPrice: 64320,
      targetPrice: 66200,
      riskPct: 0.5,
      rrRatio: "1:2.55",
      positionSizingNote: "Calculated by Risk Engine ($500 risk)",
      steps: [
        { step: "SIGNAL", title: "Liquidity Sweep & CHoCH PASS", detail: "Equal Lows at $64,900 swept to $64,420 (0.85 ATR) | Hammer close at $65,020 | 15M Bullish CHoCH confirmed at $65,150 | Score: 85/100" },
        { step: "ENTRY", title: "Retest Limit Filled", detail: "Executed Long on CHoCH retest at $64,850" },
        { step: "STOP_TARGET", title: "Risk Sized", detail: "SL at $64,320 (sweep low - 0.2 ATR buffer) | TP at opposing swing high $66,200 (2.55R)" },
        { step: "POSITION", title: "Managing", detail: "Trade risk approved by Central Risk Engine" },
        { step: "EXIT", title: "Target Reached", detail: "Closed at opposing liquidity pool $66,200 (+2.55R)" },
        { step: "JOURNAL", title: "Logged", detail: "Audited setup conditions, sweep ATR, CHoCH level, and execution latency" },
      ],
    },
    defaultParameters: { min_sweep_atr: 0.05, max_sweep_atr: 1.00, max_acceptance_bars: 2, swing_lookback: 5, minimum_rr: 2.0, min_score: 70, risk_per_trade_pct: 0.50, entry_mode: "RETEST" },
    version: "1.0.0",
  },
];

import { OPTIONS_24_STRATEGIES } from "./options24Strategies";
export { OPTIONS_24_STRATEGIES };

export const ALL_QUANTOS_STRATEGIES: CryptoStrategyDefinition[] = [
  ...CRYPTO_30_STRATEGIES,
  ...QUANTOS_PRO_STRATEGIES,
  ...OPTIONS_24_STRATEGIES,
];

export const STRATEGY_CATEGORIES: Array<{
  part: StrategyPart;
  name: StrategyCategory;
  description: string;
  count: number;
  iconName: string;
}> = [
  {
    part: "PART I — TREND & CONTINUATION",
    name: "Trend & Continuation",
    description: "Strategies that align with macro and micro trend persistence, moving average pullbacks, and momentum expansions.",
    count: 5,
    iconName: "TrendingUp",
  },
  {
    part: "PART II — BREAKOUT & EXPANSION",
    name: "Breakout & Expansion",
    description: "Volatility squeeze releases, Donchian channels, UTC opening range breakouts, and prior-day high/low breaks.",
    count: 5,
    iconName: "Zap",
  },
  {
    part: "PART III — PULLBACK & MEAN REVERSION",
    name: "Pullback & Mean Reversion",
    description: "Statistical mean reversion, Bollinger extensions, extreme RSI exhaustion, Anchored VWAP, and range fades.",
    count: 5,
    iconName: "RefreshCw",
  },
  {
    part: "PART IV — STRUCTURE & REVERSAL",
    name: "Structure & Reversal",
    description: "Liquidity sweeps, failed breakout traps, prior-level rejections, market structure shifts, and daily compressions.",
    count: 5,
    iconName: "Layers",
  },
  {
    part: "PART V — MOMENTUM & VOLUME",
    name: "Momentum & Volume",
    description: "Relative volume spikes, volume dry-up pullbacks, volume climax blow-offs, OBV divergences, and VWAP reclaims.",
    count: 5,
    iconName: "Activity",
  },
  {
    part: "PART VI — CRYPTO-SPECIFIC & MULTI-FACTOR",
    name: "Crypto-Specific & Multi-Factor",
    description: "Basis spread dislocations, Open Interest surges, liquidation cascade flush-and-reclaims, BTC.D filters, and 3-factor regimes.",
    count: 5,
    iconName: "Coins",
  },
  {
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    name: "Multi-Leg Options & Income",
    description: "Multi-leg options architectures (Iron Condors, Butterflies, Vertical Spreads, Straddles, Calendars) for defined-risk theta decay and volatility harvest.",
    count: 24,
    iconName: "Layers",
  },
];
