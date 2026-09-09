import { IndicatorResult, IndicatorSignal, SignalType } from "./types";

export interface ConfluenceReport {
  overallScore: number; // -100 to +100
  bias: "STRONG_BULLISH" | "BULLISH" | "NEUTRAL" | "BEARISH" | "STRONG_BEARISH";
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  totalSignals: number;
  signalBreakdown: Array<{
    indicatorId: string;
    timeframe: string;
    type: SignalType;
    score: number;
    reason: string;
  }>;
  confidence: number; // 0 to 100
  timestamp: number;
}

export class IndicatorConfluenceEngine {
  /**
   * Aggregates multiple indicator results into a normalized confluence score.
   */
  public static calculateConfluence(results: IndicatorResult<any>[]): ConfluenceReport {
    const validResults = results.filter((r) => r.isValid && r.signal);
    if (validResults.length === 0) {
      return {
        overallScore: 0,
        bias: "NEUTRAL",
        bullishCount: 0,
        bearishCount: 0,
        neutralCount: 0,
        totalSignals: 0,
        signalBreakdown: [],
        confidence: 0,
        timestamp: Date.now(),
      };
    }

    let totalWeightedScore = 0;
    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;

    const breakdown = validResults.map((r) => {
      const sig = r.signal!;
      totalWeightedScore += sig.score;

      if (sig.score > 0.1) bullishCount++;
      else if (sig.score < -0.1) bearishCount++;
      else neutralCount++;

      return {
        indicatorId: r.indicatorId,
        timeframe: r.timeframe,
        type: sig.type,
        score: sig.score,
        reason: sig.reason,
      };
    });

    const normalizedScore = Math.round((totalWeightedScore / validResults.length) * 100);
    const clampedScore = Math.max(-100, Math.min(100, normalizedScore));

    let bias: ConfluenceReport["bias"] = "NEUTRAL";
    if (clampedScore >= 60) bias = "STRONG_BULLISH";
    else if (clampedScore >= 20) bias = "BULLISH";
    else if (clampedScore <= -60) bias = "STRONG_BEARISH";
    else if (clampedScore <= -20) bias = "BEARISH";

    const agreement = Math.max(bullishCount, bearishCount) / validResults.length;
    const confidence = Math.round(agreement * 100);

    return {
      overallScore: clampedScore,
      bias,
      bullishCount,
      bearishCount,
      neutralCount,
      totalSignals: validResults.length,
      signalBreakdown: breakdown,
      confidence,
      timestamp: Date.now(),
    };
  }
}
