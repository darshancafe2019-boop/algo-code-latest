import { BaseOptionStrategy } from "../base/BaseStrategy";
import {
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  OptionLeg,
} from "../base/StrategyTypes";

export class ShortStrangleStrategy extends BaseOptionStrategy {
  public readonly id = "short-strangle";
  public readonly name = "Short Strangle";
  public readonly description = "Sell OTM Put and OTM Call to profit from wide range-bound consolidation with maximum theta decay.";

  public async analyze(context: MarketContext): Promise<StrategyAnalysis> {
    const { indicators, volatility } = context;
    const adx = indicators?.adx14 ?? 20;
    const ivRank = volatility?.ivRank ?? 65;

    let score = 50;
    const rationale: string[] = [];

    if (adx < 22) {
      score += 20;
      rationale.push(`Range-bound behavior confirmed (ADX: ${adx.toFixed(1)})`);
    }

    if (ivRank > 65) {
      score += 25;
      rationale.push(`High IV Rank (${ivRank}%) widens breakevens and premium buffer`);
    }

    const marketMatch = score >= this.config.minConfidence;

    let proposal: TradeProposal | undefined;
    if (marketMatch && context.optionChain) {
      const step = context.optionChain.stepSize || 50;
      const base = context.optionChain.atmStrike || context.spotPrice;
      const signal: StrategySignal = {
        strategyId: this.id,
        strategyName: this.name,
        underlying: context.underlying,
        action: "ENTER",
        bias: "NEUTRAL",
        confidence: score,
        reasons: rationale,
        recommendedExpiry: context.optionChain.selectedExpiry || "2026-09-04",
        suggestedStrikes: [base - step * 2, base + step * 2],
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
    const putStrike = signal.suggestedStrikes[0] || Math.round((spot - step * 2) / step) * step;
    const callStrike = signal.suggestedStrikes[1] || Math.round((spot + step * 2) / step) * step;
    const expiry = signal.recommendedExpiry;

    const putPrem = Math.round(spot * 0.012 * 100) / 100;
    const callPrem = Math.round(spot * 0.012 * 100) / 100;
    const totalCredit = putPrem + callPrem;

    const legs: OptionLeg[] = [
      {
        legId: `leg-1-put-${putStrike}`,
        symbol: `${context.underlying}-${expiry}-${putStrike}-PE`,
        underlying: context.underlying,
        optionType: "PUT",
        side: "SELL",
        strike: putStrike,
        expiry,
        quantity: 1,
        premium: putPrem,
        orderType: "LIMIT",
        limitPrice: putPrem,
        delta: 0.22,
        gamma: -0.0015,
        theta: 9.0,
        vega: -14.0,
      },
      {
        legId: `leg-2-call-${callStrike}`,
        symbol: `${context.underlying}-${expiry}-${callStrike}-CE`,
        underlying: context.underlying,
        optionType: "CALL",
        side: "SELL",
        strike: callStrike,
        expiry,
        quantity: 1,
        premium: callPrem,
        orderType: "LIMIT",
        limitPrice: callPrem,
        delta: -0.22,
        gamma: -0.0015,
        theta: 9.0,
        vega: -14.0,
      },
    ];

    const requiredMargin = Math.round((spot * 0.16 + totalCredit) * 100) / 100;

    return {
      proposalId: `prop-ssg-${Date.now()}`,
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
      breakevens: [putStrike - totalCredit, callStrike + totalCredit],
      riskReward: "HIGH_RISK_UNDEFINED",
      requiredMargin,
      greeks: {
        delta: 0.0,
        gamma: -0.003,
        theta: 18.0,
        vega: -28.0,
      },
      liquidityScore: 94,
      validationStatus: "PENDING",
      rejectionReasons: [],
      executionMode: "PAPER",
      createdAt: new Date().toISOString(),
    };
  }
}
