import { z } from "zod";

/**
 * Enums for Constrained Model Outputs & Categorization
 */
export const MarketBiasEnum = z.enum([
  "STRONG_BULLISH",
  "BULLISH",
  "NEUTRAL_BULLISH",
  "NEUTRAL",
  "MIXED",
  "NEUTRAL_BEARISH",
  "BEARISH",
  "STRONG_BEARISH",
]);
export type MarketBias = z.infer<typeof MarketBiasEnum>;

export const DirectionalBiasEnum = z.enum(["BULLISH", "BEARISH", "NEUTRAL", "MIXED"]);
export type DirectionalBias = z.infer<typeof DirectionalBiasEnum>;

export const MarketStateEnum = z.enum([
  "TRENDING",
  "RANGING",
  "BREAKOUT",
  "VOLATILE",
  "LOW_LIQUIDITY",
  "UNCERTAIN",
]);
export type MarketState = z.infer<typeof MarketStateEnum>;

export const DataQualityEnum = z.enum(["LIVE", "DELAYED", "STALE", "UNAVAILABLE", "INCOMPLETE"]);
export type DataQuality = z.infer<typeof DataQualityEnum>;

export const AnalysisModeEnum = z.enum(["QUICK", "DETAILED", "TRADE_REVIEW", "OPTIONS", "MACRO"]);
export type AnalysisMode = z.infer<typeof AnalysisModeEnum>;

/**
 * Deterministic Evidence Score Schema (0 to 10)
 * Calculated locally from mathematical confluence across 5 pillars.
 */
export const EvidenceScoreSchema = z.object({
  total: z.number().min(0).max(10),
  maxScore: z.literal(10),
  label: z.string(),
  breakdown: z.object({
    trend: z.number().min(0).max(2),
    momentum: z.number().min(0).max(2),
    volume: z.number().min(0).max(2),
    structure: z.number().min(0).max(2),
    derivatives: z.number().min(0).max(2),
  }),
});
export type EvidenceScore = z.infer<typeof EvidenceScoreSchema>;

/**
 * Scenario Modeling Schema (Bullish, Bearish, Neutral / Wait)
 */
export const ScenarioSchema = z.object({
  title: z.string(),
  condition: z.string(),
  evidence: z.array(z.string()),
  invalidation: z.array(z.string()),
  expectedMove: z.string().optional().nullable(),
});
export type Scenario = z.infer<typeof ScenarioSchema>;

export const ThreeScenariosSchema = z.object({
  bullish: ScenarioSchema,
  bearish: ScenarioSchema,
  neutral: ScenarioSchema,
});
export type ThreeScenarios = z.infer<typeof ThreeScenariosSchema>;

/**
 * Verified Public Reference & Citation Schema
 */
export const AnalysisReferenceSchema = z.object({
  title: z.string(),
  source: z.string(),
  url: z.string().optional().nullable(),
  publishedAt: z.string().optional().nullable(),
  accessedAt: z.string(),
  type: z.enum(["EXCHANGE", "REGULATOR", "CENTRAL_BANK", "MARKET_DATA", "NEWS", "OFFICIAL_FILING"]),
});
export type AnalysisReference = z.infer<typeof AnalysisReferenceSchema>;

/**
 * Timeframe Indicator Snapshot Schema
 */
export const TimeframeSnapshotSchema = z.object({
  timeframe: z.string(),
  lastPrice: z.number(),
  trend: z.object({
    ema9: z.number().optional().nullable(),
    ema20: z.number().optional().nullable(),
    ema50: z.number().optional().nullable(),
    ema200: z.number().optional().nullable(),
    supertrend: z.number().optional().nullable(),
    bias: z.string().optional().nullable(),
  }),
  momentum: z.object({
    rsi14: z.number().optional().nullable(),
    macdLine: z.number().optional().nullable(),
    macdSignal: z.number().optional().nullable(),
    macdHist: z.number().optional().nullable(),
    adx14: z.number().optional().nullable(),
  }),
  volatility: z.object({
    atr14: z.number().optional().nullable(),
    bbUpper: z.number().optional().nullable(),
    bbMiddle: z.number().optional().nullable(),
    bbLower: z.number().optional().nullable(),
  }),
  volume: z.object({
    currentVolume: z.number().optional().nullable(),
    averageVolume20: z.number().optional().nullable(),
    relativeVolume: z.number().optional().nullable(),
    vwap: z.number().optional().nullable(),
    vpPoc: z.number().optional().nullable(),
    vah: z.number().optional().nullable(),
    val: z.number().optional().nullable(),
  }),
});
export type TimeframeSnapshot = z.infer<typeof TimeframeSnapshotSchema>;

/**
 * Authoritative Market Snapshot Schema
 */
export const MarketSnapshotSchema = z.object({
  instrument: z.object({
    symbol: z.string(),
    exchange: z.string(),
    assetClass: z.string(),
    timestamp: z.number(),
    isoTime: z.string(),
  }),
  quote: z.object({
    last: z.number(),
    bid: z.number().optional().nullable(),
    ask: z.number().optional().nullable(),
    spread: z.number().optional().nullable(),
    high24h: z.number().optional().nullable(),
    low24h: z.number().optional().nullable(),
    volume24h: z.number().optional().nullable(),
    changePct24h: z.number().optional().nullable(),
    prevClose: z.number().optional().nullable(),
  }),
  timeframes: z.record(z.string(), TimeframeSnapshotSchema),
  derivatives: z
    .object({
      openInterest: z.number().optional().nullable(),
      oiChange24h: z.number().optional().nullable(),
      fundingRatePct: z.number().optional().nullable(),
      futuresBasis: z.number().optional().nullable(),
      basisPct: z.number().optional().nullable(),
      impliedVolatility: z.number().optional().nullable(),
      putCallRatio: z.number().optional().nullable(),
      atmIv: z.number().optional().nullable(),
      callOiConcentration: z.number().optional().nullable(),
      putOiConcentration: z.number().optional().nullable(),
      maxPain: z.number().optional().nullable(),
    })
    .optional()
    .nullable(),
  structure: z
    .object({
      primaryTrend: z.string().optional().nullable(),
      swingPoints: z
        .object({
          recentSwingHigh: z.number().optional().nullable(),
          recentSwingLow: z.number().optional().nullable(),
          structurePattern: z.string().optional().nullable(), // e.g. "HH_HL" or "LH_LL"
        })
        .optional()
        .nullable(),
      supportLevels: z.array(z.number()),
      resistanceLevels: z.array(z.number()),
      breakoutState: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  strategyContext: z
    .object({
      strategyName: z.string().optional().nullable(),
      confluenceScore: z.number().optional().nullable(),
      mandatoryRulesPassed: z.number().optional().nullable(),
      mandatoryRulesTotal: z.number().optional().nullable(),
      riskChecksPassed: z.number().optional().nullable(),
      riskChecksTotal: z.number().optional().nullable(),
      decisionAction: z.string().optional().nullable(),
      blockingReasons: z.array(z.string()).optional().nullable(),
    })
    .optional()
    .nullable(),
  dataQuality: z.object({
    status: DataQualityEnum,
    ageMs: z.number(),
    provider: z.string(),
    isStale: z.boolean(),
  }),
});
export type MarketSnapshot = z.infer<typeof MarketSnapshotSchema>;

/**
 * Structured Output Schema from OpenAI Market Analyst
 */
export const MarketAnalysisResultSchema = z.object({
  symbol: z.string(),
  asset_class: z.string(),
  timestamp: z.number(),
  market_state: MarketStateEnum,
  directional_bias: DirectionalBiasEnum,
  market_bias: MarketBiasEnum,
  evidence_score: EvidenceScoreSchema,
  confidence: z.number().min(0).max(100),
  timeframes: z.record(z.string(), z.string()),
  trend_assessment: z.array(z.string()),
  momentum_assessment: z.array(z.string()),
  volume_assessment: z.array(z.string()),
  volatility_assessment: z.array(z.string()),
  derivatives_assessment: z.array(z.string()).optional().nullable(),
  structure_assessment: z.array(z.string()).optional().nullable(),
  scenarios: ThreeScenariosSchema,
  key_levels: z.object({
    support: z.array(z.number()),
    resistance: z.array(z.number()),
  }),
  risks: z.array(z.string()),
  conflicts: z.array(z.string()),
  summary: z.string(),
  strategy_alignment: z.string().optional().nullable(),
  references: z.array(AnalysisReferenceSchema),
  data_quality: DataQualityEnum,
  data_provenance: z.object({
    source: z.string(),
    market_time: z.string(),
    analysis_time: z.string(),
    latency_ms: z.number(),
    model: z.string(),
  }),
});
export type MarketAnalysisResult = z.infer<typeof MarketAnalysisResultSchema>;

/**
 * Q&A Follow-up Schema
 */
export const AnalystQnAResultSchema = z.object({
  symbol: z.string(),
  question: z.string(),
  answer: z.string(),
  citations: z.array(z.string()),
  relevant_levels: z.array(z.number()).optional(),
  risks_noted: z.array(z.string()),
  references: z.array(AnalysisReferenceSchema).optional(),
  model: z.string(),
  timestamp: z.string(),
});
export type AnalystQnAResult = z.infer<typeof AnalystQnAResultSchema>;

/**
 * Position & Trade Review Schemas
 */
export const PositionReviewSchema = z.object({
  symbol: z.string(),
  side: z.enum(["LONG", "SHORT"]),
  entryPrice: z.number(),
  currentPrice: z.number(),
  unrealizedPnlUsd: z.number(),
  unrealizedPnlPct: z.number(),
  stopLoss: z.number(),
  takeProfit: z.number(),
  riskEngineStatus: z.string(),
  marketConditionAssessment: z.string(),
  managementObservation: z.string(),
  risksToWatch: z.array(z.string()),
});
export type PositionReview = z.infer<typeof PositionReviewSchema>;

export const TradeReviewSchema = z.object({
  tradeId: z.string(),
  symbol: z.string(),
  side: z.enum(["LONG", "SHORT"]),
  entryPrice: z.number(),
  exitPrice: z.number(),
  realizedPnlUsd: z.number(),
  realizedPnlPct: z.number(),
  exitReason: z.string(),
  strategyRulesEvaluated: z.string(),
  executionDiagnosis: z.string(),
  keyTakeaways: z.array(z.string()),
});
export type TradeReview = z.infer<typeof TradeReviewSchema>;

/**
 * Global Market Brief Schema
 */
export const GlobalMarketBriefSchema = z.object({
  timestamp: z.string(),
  overallSentiment: MarketBiasEnum,
  crypto: z.string(),
  india: z.string(),
  us: z.string(),
  europeAsia: z.string(),
  forex: z.string(),
  commodities: z.string(),
  ratesMacro: z.string(),
  volatilitySummary: z.string(),
  references: z.array(AnalysisReferenceSchema),
});
export type GlobalMarketBrief = z.infer<typeof GlobalMarketBriefSchema>;

/**
 * Telemetry Metrics Schema
 */
export interface AnalystTelemetry {
  requestsToday: number;
  tokensToday: number;
  errorsToday: number;
  cacheHitsToday: number;
  averageLatencyMs: number;
  circuitState: string;
  configuredModel: string;
  rateLimitUsage: {
    currentMinuteRequests: number;
    maxPerMinute: number;
  };
}
