/**
 * QUANT.OS MARKET REGIME ENGINE
 * =============================
 * Quantitatively classifies current market regime across 7 distinct states:
 * - TRENDING
 * - RANGING
 * - BREAKOUT / EXPANSION
 * - HIGH VOLATILITY
 * - LOW VOLATILITY
 * - STRUCTURAL REVERSAL
 * - UNKNOWN
 *
 * Rules:
 * 1. The Regime Engine identifies which of the 30 strategies are eligible candidates for evaluation.
 * 2. It does NOT automatically execute trades.
 * 3. Individual strategy setup conditions must still independently pass before any signal is generated.
 */

import { MarketRegimeType, CRYPTO_30_STRATEGIES } from "./crypto30Strategies";
export type { MarketRegimeType };

export interface RegimeMetrics {
  adx: number;
  atrPercentile: number;
  bandwidthPercentile: number;
  rsi: number;
  volumeTrend: "EXPANDING" | "CONTRACTING" | "NEUTRAL";
  emaSlope: number; // degrees or pct
  liquidityScore: number; // 0 - 100
}

export interface RegimeEvaluationResult {
  regime: MarketRegimeType;
  confidenceScore: number; // 0 - 100
  rationale: string;
  metrics: RegimeMetrics;
  candidateStrategyNumbers: string[]; // e.g. ["01", "03", "04", ...]
  candidateStrategiesCount: number;
  evaluatedAt: string;
}

export const REGIME_STRATEGY_MAP: Record<MarketRegimeType, string[]> = {
  TRENDING: ["01", "03", "04", "05", "22", "29", "30"],
  RANGING: ["11", "12", "13", "15", "18"],
  "BREAKOUT / EXPANSION": ["02", "06", "07", "08", "09", "10", "20", "21", "27"],
  "HIGH VOLATILITY": ["12", "13", "14", "23", "26", "28"],
  "LOW VOLATILITY": ["04", "06", "20"],
  "STRUCTURAL REVERSAL": ["16", "17", "18", "19", "23", "24", "26", "28"],
  UNKNOWN: [],
};

export class MarketRegimeEngine {
  /**
   * Classifies regime from quantitative indicators.
   */
  public evaluateRegime(metrics: RegimeMetrics): RegimeEvaluationResult {
    const { adx, atrPercentile, bandwidthPercentile, volumeTrend, rsi } = metrics;
    let regime: MarketRegimeType = "UNKNOWN";
    let rationale = "";
    let confidenceScore = 80;

    if (bandwidthPercentile <= 15 && atrPercentile <= 25) {
      regime = "LOW VOLATILITY";
      rationale = `BandWidth (${bandwidthPercentile}th pct) and ATR (${atrPercentile}th pct) in extreme compression. Volatility expansion pending.`;
      confidenceScore = 90;
    } else if (atrPercentile >= 85 || (bandwidthPercentile >= 85 && (rsi >= 80 || rsi <= 20))) {
      regime = "HIGH VOLATILITY";
      rationale = `ATR (${atrPercentile}th pct) and BandWidth (${bandwidthPercentile}th pct) elevated with RSI extreme (${rsi.toFixed(1)}).`;
      confidenceScore = 88;
    } else if (adx >= 30) {
      regime = "TRENDING";
      rationale = `Sustained directional trend confirmed with ADX at ${adx.toFixed(1)} (> 30 high conviction baseline).`;
      confidenceScore = 94;
    } else if (bandwidthPercentile >= 70 && volumeTrend === "EXPANDING" && adx >= 20 && adx < 30) {
      regime = "BREAKOUT / EXPANSION";
      rationale = `BandWidth expanding with surging volume trend and emerging ADX trend strength (${adx.toFixed(1)}).`;
      confidenceScore = 85;
    } else if (adx >= 22) {
      regime = "TRENDING";
      rationale = `Directional trend confirmed with ADX at ${adx.toFixed(1)} (> 22 baseline).`;
      confidenceScore = 88;
    } else if (adx < 20 && atrPercentile < 60) {
      regime = "RANGING";
      rationale = `Non-trending consolidation confirmed with ADX at ${adx.toFixed(1)} (< 20 baseline). Mean reversion active.`;
      confidenceScore = 89;
    } else if ((rsi <= 25 || rsi >= 75) && volumeTrend === "EXPANDING") {
      regime = "STRUCTURAL REVERSAL";
      rationale = `Exhaustion momentum detected with RSI at ${rsi.toFixed(1)} and expanding counter-volume.`;
      confidenceScore = 82;
    } else {
      regime = "TRENDING"; // Default to trending if ambiguous but stable
      rationale = `Moderate ADX (${adx.toFixed(1)}) and balanced volatility envelope.`;
      confidenceScore = 70;
    }

    const candidateStrategyNumbers = REGIME_STRATEGY_MAP[regime] || [];

    return {
      regime,
      confidenceScore,
      rationale,
      metrics,
      candidateStrategyNumbers,
      candidateStrategiesCount: candidateStrategyNumbers.length,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Returns candidate strategies for a given regime.
   */
  public getCandidateStrategies(regime: MarketRegimeType) {
    const numbers = REGIME_STRATEGY_MAP[regime] || [];
    return CRYPTO_30_STRATEGIES.filter((s) => numbers.includes(s.number));
  }
}

export const marketRegimeEngine = new MarketRegimeEngine();
