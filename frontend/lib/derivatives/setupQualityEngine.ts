/**
 * Quant.OS Multi-Factor Setup Quality & Robustness Engine (Frontend)
 * ===================================================================
 * Computes transparent, decomposed setup quality scores (0-100).
 *
 * Explicit Principle: Setup Quality Score is an opportunity filter,
 * NOT a profitability promise. Never triggers orders automatically.
 */

export interface SetupQualityComponents {
  marketDataQuality: number;
  liquidityScore: number;
  spreadScore: number;
  volatilityFit: number;
  oiQuality: number;
  strategyFit: number;
  trendConfirmation: number;
  momentumConfirmation: number;
  riskRewardScore: number;
  capitalEfficiency: number;
  executionQuality: number;
  historicalRobustness: number;
  drawdownProfile: number;
  slippageSensitivity: number;
}

export interface SetupQualityEvaluation {
  overallScore: number;
  grade: "A+" | "A" | "B" | "C" | "REJECT";
  compatibility: "HIGH_COMPATIBILITY" | "MATCH" | "REQUIRES_REVIEW" | "BLOCKED";
  components: SetupQualityComponents;
  dimensionSummaries: Record<string, string>;
  disclaimer: string;
}

export class SetupQualityEngine {
  static evaluateSetup(params: {
    strategyType: string;
    spreadBps?: number;
    feedAgeMs?: number;
    ivPercentile?: number;
    pcr?: number;
    trendAligned?: boolean;
    momentumAligned?: boolean;
    rewardToRiskRatio?: number;
    isDefinedRisk?: boolean;
    drawdownPct?: number;
  }): SetupQualityEvaluation {
    const {
      strategyType,
      spreadBps = 6.0,
      feedAgeMs = 150.0,
      ivPercentile = 55.0,
      trendAligned = true,
      momentumAligned = true,
      rewardToRiskRatio = 1.8,
      isDefinedRisk = true,
      drawdownPct = 4.5,
    } = params;

    // 1. Market Data Quality
    let marketDataQuality = 98.0;
    if (feedAgeMs > 5000) marketDataQuality = 35.0;
    else if (feedAgeMs > 2000) marketDataQuality = 65.0;
    else if (feedAgeMs > 500) marketDataQuality = 85.0;

    // 2. Liquidity & Spread
    let spreadScore = 95.0;
    let liquidityScore = 92.0;
    if (spreadBps > 35.0) {
      spreadScore = 35.0;
      liquidityScore = 40.0;
    } else if (spreadBps > 15.0) {
      spreadScore = 65.0;
      liquidityScore = 65.0;
    } else if (spreadBps > 5.0) {
      spreadScore = 85.0;
      liquidityScore = 82.0;
    }

    // 3. Volatility Fit
    const st = strategyType.toUpperCase();
    let volatilityFit = 80.0;
    if (st.includes("SPREAD") || st.includes("CONDOR") || st.includes("BUTTERFLY")) {
      volatilityFit = ivPercentile >= 40.0 && ivPercentile <= 80.0 ? 92.0 : 70.0;
    } else if (st.includes("LONG") || st.includes("BUY")) {
      volatilityFit = ivPercentile < 45.0 ? 90.0 : 60.0;
    }

    // 4. Trend & Momentum
    const trendConfirmation = trendAligned ? 92.0 : 45.0;
    const momentumConfirmation = momentumAligned ? 88.0 : 50.0;

    // 5. Risk / Reward & Capital Efficiency
    let riskRewardScore = 70.0;
    if (rewardToRiskRatio >= 2.0) riskRewardScore = 96.0;
    else if (rewardToRiskRatio >= 1.5) riskRewardScore = 86.0;
    else if (rewardToRiskRatio < 1.0) riskRewardScore = 45.0;

    const capitalEfficiency = isDefinedRisk ? 92.0 : 55.0;
    const drawdownProfile = Math.max(20.0, 100.0 - drawdownPct * 8.0);
    const historicalRobustness = 80.0;

    const components: SetupQualityComponents = {
      marketDataQuality,
      liquidityScore,
      spreadScore,
      volatilityFit,
      oiQuality: 80.0,
      strategyFit: 85.0,
      trendConfirmation,
      momentumConfirmation,
      riskRewardScore,
      capitalEfficiency,
      executionQuality: 85.0,
      historicalRobustness,
      drawdownProfile,
      slippageSensitivity: 85.0,
    };

    const overall = Math.round(
      (marketDataQuality * 0.15 +
        liquidityScore * 0.15 +
        spreadScore * 0.10 +
        volatilityFit * 0.10 +
        trendConfirmation * 0.15 +
        momentumConfirmation * 0.10 +
        riskRewardScore * 0.15 +
        capitalEfficiency * 0.10) *
        10
    ) / 10;

    let grade: "A+" | "A" | "B" | "C" | "REJECT" = "B";
    let compatibility: "HIGH_COMPATIBILITY" | "MATCH" | "REQUIRES_REVIEW" | "BLOCKED" = "MATCH";

    if (overall >= 85.0) {
      grade = "A+";
      compatibility = "HIGH_COMPATIBILITY";
    } else if (overall >= 75.0) {
      grade = "A";
      compatibility = "MATCH";
    } else if (overall >= 60.0) {
      grade = "B";
      compatibility = "REQUIRES_REVIEW";
    } else {
      grade = "REJECT";
      compatibility = "BLOCKED";
    }

    const dimensionSummaries = {
      "Data Quality": `${marketDataQuality.toFixed(0)}/100 (${feedAgeMs.toFixed(0)}ms latency)`,
      "Liquidity": `${liquidityScore.toFixed(0)}/100 (${spreadBps.toFixed(1)} bps spread)`,
      "Volatility Fit": `${volatilityFit.toFixed(0)}/100 (IV Rank ${ivPercentile.toFixed(0)}%)`,
      "Risk / Reward": `${riskRewardScore.toFixed(0)}/100 (${rewardToRiskRatio.toFixed(2)}:1 R/R)`,
      "Confluence": `${trendConfirmation.toFixed(0)}/100 (Trend + Momentum)`,
    };

    return {
      overallScore: overall,
      grade,
      compatibility,
      components,
      dimensionSummaries,
      disclaimer:
        "Setup Quality Score is a multi-dimensional analytical metric evaluating market conditions, spread, liquidity, and risk-reward profile. It does NOT guarantee trade outcome or profit.",
    };
  }
}
