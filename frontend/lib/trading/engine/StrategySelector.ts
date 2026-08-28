/**
 * Strategy Selection Engine
 * =========================
 * Evaluates market regime, directional bias, and volatility expectations
 * to rank, select, and construct optimal option strategy proposals.
 */

import { StrategyRegistry } from "../strategies/base/StrategyRegistry";
import {
  MarketContext,
  StrategyAnalysis,
  TradeProposal,
} from "../strategies/base/StrategyTypes";
import { MarketStateAnalyzer, AnalyzedMarketState } from "./MarketStateAnalyzer";

export interface StrategySelectionResult {
  analyzedState: AnalyzedMarketState;
  rankedProposals: TradeProposal[];
  allAnalyses: StrategyAnalysis[];
  primaryRecommendation?: TradeProposal;
  selectionRationale: string[];
  timestamp: string;
}

export class StrategySelector {
  /**
   * Selects and ranks eligible options strategies for a given market context.
   */
  public static async selectStrategies(context: MarketContext): Promise<StrategySelectionResult> {
    // 1. Analyze authoritative market state
    const analyzedState = MarketStateAnalyzer.analyze(context);

    // 2. Evaluate all enabled strategies from registry
    const allAnalyses = await StrategyRegistry.runAllEnabledStrategies(context);

    // 3. Filter for market-matched strategies with valid trade proposals
    const matchingAnalyses = allAnalyses.filter(
      (a) => a.marketMatch && a.proposal && a.suitabilityScore >= 60
    );

    // Sort descending by suitability score
    matchingAnalyses.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

    const rankedProposals: TradeProposal[] = matchingAnalyses
      .map((a) => a.proposal!)
      .filter(Boolean);

    const primaryRecommendation = rankedProposals[0];

    const selectionRationale: string[] = [
      `Detected Market Regime: ${analyzedState.regime} (Confidence: ${analyzedState.confidence}%)`,
      `Directional Bias: ${analyzedState.bias} | Volatility Expectation: ${analyzedState.volatilityExpectation}`,
      `Selected ${rankedProposals.length} eligible option strategies out of ${allAnalyses.length} enabled candidates`,
    ];

    if (primaryRecommendation) {
      selectionRationale.push(
        `Top Ranked Strategy: ${primaryRecommendation.strategyName} (Suitability Score: ${primaryRecommendation.confidence}%)`
      );
    }

    return {
      analyzedState,
      rankedProposals,
      allAnalyses,
      primaryRecommendation,
      selectionRationale,
      timestamp: new Date().toISOString(),
    };
  }
}
