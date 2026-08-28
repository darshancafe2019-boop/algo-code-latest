import { BaseOptionStrategy } from "../base/BaseStrategy";
import {
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  OptionLeg,
} from "../base/StrategyTypes";

export class LongCombinationStrategy extends BaseOptionStrategy {
  public readonly id = "long-combination";
  public readonly name = "Long Combination";
  public readonly description = "Buy OTM Call and Sell OTM Put to construct a synthetic long position with zero-to-minimal net entry cost.";

  public async analyze(context: MarketContext): Promise<StrategyAnalysis> {
    const { spotPrice, indicators } = context;
    const rsi = indicators?.rsi14 ?? 50;
    const ema20 = indicators?.ema20 ?? spotPrice;
    const ema50 = indicators?.ema50 ?? spotPrice;

    let score = 50;
    const rationale: string[] = [];

    if (spotPrice > ema20 && ema20 > ema50) {
      score += 25;
      rationale.push("Strong structural bull trend aligned across moving averages");
    }

    if (rsi >= 52 && rsi <= 68) {
      score += 20;
      rationale.push(`Bullish impulse accelerating with RSI at ${rsi.toFixed(1)}`);
    }

    const marketMatch = score >= this.config.minConfidence;

    let proposal: TradeProposal | undefined;
    if (marketMatch && context.optionChain) {
      const step = context.optionChain.stepSize || 50;
      const base = context.optionChain.atmStrike || spotPrice;
      const signal: StrategySignal = {
        strategyId: this.id,
        strategyName: this.name,
        underlying: context.underlying,
        action: "ENTER",
        bias: "BULLISH",
        confidence: score,
        reasons: rationale,
        recommendedExpiry: context.optionChain.selectedExpiry || "2026-09-04",
        suggestedStrikes: [base - step, base + step],
        timestamp: new Date().toISOString(),
      };
      proposal = await this.buildTrade(signal, context);
    }

    return {
      strategyId: this.id,
      strategyName: this.name,
      marketMatch,
      suitabilityScore: Math.min(100, Math.max(0, score)),
      regime: "STRONG_BULLISH",
      rationale,
      proposal,
    };
  }

  public async buildTrade(signal: StrategySignal, context: MarketContext): Promise<TradeProposal> {
    const spot = context.spotPrice;
    const step = context.optionChain?.stepSize || 50;
    const putStrike = signal.suggestedStrikes[0] || Math.round((spot - step) / step) * step;
    const callStrike = signal.suggestedStrikes[1] || Math.round((spot + step) / step) * step;
    const expiry = signal.recommendedExpiry;

    const callPrem = Math.round(spot * 0.020 * 100) / 100;
    const putPrem = Math.round(spot * 0.020 * 100) / 100;
    const netDebitOrCredit = callPrem - putPrem; // Near zero

    const legs: OptionLeg[] = [
      {
        legId: `leg-1-call-${callStrike}`,
        symbol: `${context.underlying}-${expiry}-${callStrike}-CE`,
        underlying: context.underlying,
        optionType: "CALL",
        side: "BUY",
        strike: callStrike,
        expiry,
        quantity: 1,
        premium: callPrem,
        orderType: "MARKET",
        delta: 0.40,
        gamma: 0.002,
        theta: -8.0,
        vega: 15.0,
      },
      {
        legId: `leg-2-put-${putStrike}`,
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
        delta: 0.35,
        gamma: -0.0018,
        theta: 7.5,
        vega: -13.0,
      },
    ];

    const requiredMargin = Math.round((putStrike * 0.15) * 100) / 100;

    return {
      proposalId: `prop-lcb-${Date.now()}`,
      strategyId: this.id,
      strategyName: this.name,
      underlying: context.underlying,
      assetClass: context.assetClass,
      legs,
      entryReason: signal.reasons.join(". "),
      marketRegime: "STRONG_BULLISH",
      confidence: signal.confidence,
      spotPrice: spot,
      netDebitOrCredit,
      isCredit: netDebitOrCredit < 0,
      maxProfit: "UNLIMITED",
      maxLoss: Math.round((putStrike + netDebitOrCredit) * 100) / 100,
      breakevens: [callStrike + Math.max(0, netDebitOrCredit)],
      riskReward: "UNLIMITED",
      requiredMargin,
      greeks: {
        delta: 0.75,
        gamma: 0.0002,
        theta: -0.5,
        vega: 2.0,
      },
      liquidityScore: 91,
      validationStatus: "PENDING",
      rejectionReasons: [],
      executionMode: "PAPER",
      createdAt: new Date().toISOString(),
    };
  }
}
