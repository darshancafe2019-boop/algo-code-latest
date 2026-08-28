import { BaseOptionStrategy } from "../base/BaseStrategy";
import {
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  OptionLeg,
} from "../base/StrategyTypes";

export class ShortStraddleStrategy extends BaseOptionStrategy {
  public readonly id = "short-straddle";
  public readonly name = "Short Straddle";
  public readonly description = "Simultaneously sell ATM Call and Put to profit from pinpoint price consolidation and volatility collapse.";

  public async analyze(context: MarketContext): Promise<StrategyAnalysis> {
    const { indicators, volatility, spotPrice } = context;
    const adx = indicators?.adx14 ?? 20;
    const ivRank = volatility?.ivRank ?? 65;

    let score = 50;
    const rationale: string[] = [];

    if (adx < 20) {
      score += 25;
      rationale.push(`Market lacks directional momentum (ADX at ${adx.toFixed(1)})`);
    }

    if (ivRank > 70) {
      score += 25;
      rationale.push(`Very high IV Rank (${ivRank}%) indicates overpriced options prime for decay`);
    }

    const marketMatch = score >= this.config.minConfidence;

    let proposal: TradeProposal | undefined;
    if (marketMatch && context.optionChain) {
      const strike = context.optionChain.atmStrike || spotPrice;
      const signal: StrategySignal = {
        strategyId: this.id,
        strategyName: this.name,
        underlying: context.underlying,
        action: "ENTER",
        bias: "NEUTRAL",
        confidence: score,
        reasons: rationale,
        recommendedExpiry: context.optionChain.selectedExpiry || "2026-09-04",
        suggestedStrikes: [strike],
        timestamp: new Date().toISOString(),
      };
      proposal = await this.buildTrade(signal, context);
    }

    return {
      strategyId: this.id,
      strategyName: this.name,
      marketMatch,
      suitabilityScore: Math.min(100, Math.max(0, score)),
      regime: "RANGE_BOUND",
      rationale,
      proposal,
    };
  }

  public async buildTrade(signal: StrategySignal, context: MarketContext): Promise<TradeProposal> {
    const spot = context.spotPrice;
    const step = context.optionChain?.stepSize || 50;
    const strike = signal.suggestedStrikes[0] || Math.round(spot / step) * step;
    const expiry = signal.recommendedExpiry;

    const callPrem = Math.round(spot * 0.025 * 100) / 100;
    const putPrem = Math.round(spot * 0.025 * 100) / 100;
    const totalCredit = callPrem + putPrem;

    const legs: OptionLeg[] = [
      {
        legId: `leg-1-call-${strike}`,
        symbol: `${context.underlying}-${expiry}-${strike}-CE`,
        underlying: context.underlying,
        optionType: "CALL",
        side: "SELL",
        strike,
        expiry,
        quantity: 1,
        premium: callPrem,
        orderType: "LIMIT",
        limitPrice: callPrem,
        delta: -0.50,
        gamma: -0.003,
        theta: 15.0,
        vega: -22.0,
      },
      {
        legId: `leg-2-put-${strike}`,
        symbol: `${context.underlying}-${expiry}-${strike}-PE`,
        underlying: context.underlying,
        optionType: "PUT",
        side: "SELL",
        strike,
        expiry,
        quantity: 1,
        premium: putPrem,
        orderType: "LIMIT",
        limitPrice: putPrem,
        delta: 0.50,
        gamma: -0.003,
        theta: 15.0,
        vega: -22.0,
      },
    ];

    const requiredMargin = Math.round((spot * 0.20 + totalCredit) * 100) / 100;

    return {
      proposalId: `prop-sst-${Date.now()}`,
      strategyId: this.id,
      strategyName: this.name,
      underlying: context.underlying,
      assetClass: context.assetClass,
      legs,
      entryReason: signal.reasons.join(". "),
      marketRegime: "RANGE_BOUND",
      confidence: signal.confidence,
      spotPrice: spot,
      netDebitOrCredit: -totalCredit,
      isCredit: true,
      maxProfit: totalCredit,
      maxLoss: "UNLIMITED",
      breakevens: [strike - totalCredit, strike + totalCredit],
      riskReward: "HIGH_RISK_UNDEFINED",
      requiredMargin,
      greeks: {
        delta: 0.0,
        gamma: -0.006,
        theta: 30.0,
        vega: -44.0,
      },
      liquidityScore: 92,
      validationStatus: "PENDING",
      rejectionReasons: [],
      executionMode: "PAPER",
      createdAt: new Date().toISOString(),
    };
  }
}
