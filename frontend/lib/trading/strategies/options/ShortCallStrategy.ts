import { BaseOptionStrategy } from "../base/BaseStrategy";
import {
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  OptionLeg,
} from "../base/StrategyTypes";

export class ShortCallStrategy extends BaseOptionStrategy {
  public readonly id = "short-call";
  public readonly name = "Short Call";
  public readonly description = "Single-leg short call option designed to harvest premium in bearish or range-bound markets.";

  public async analyze(context: MarketContext): Promise<StrategyAnalysis> {
    const { spotPrice, indicators, volatility } = context;
    const rsi = indicators?.rsi14 ?? 50;
    const ema20 = indicators?.ema20 ?? spotPrice;
    const ema50 = indicators?.ema50 ?? spotPrice;
    const ivRank = volatility?.ivRank ?? 50;

    let score = 50;
    const rationale: string[] = [];

    const isBearishTrend = spotPrice < ema20 && ema20 <= ema50;
    if (isBearishTrend) {
      score += 25;
      rationale.push("Underlying is trending below 20 and 50 EMA");
    }

    if (rsi <= 45) {
      score += 15;
      rationale.push(`Bearish momentum confirmed with RSI at ${rsi.toFixed(1)}`);
    }

    if (ivRank >= 60) {
      score += 15;
      rationale.push(`High IV Rank (${ivRank}%) maximizes premium credit received`);
    }

    const marketMatch = score >= this.config.minConfidence;
    const regime = isBearishTrend ? "BEARISH" : "NEUTRAL";

    let proposal: TradeProposal | undefined;
    if (marketMatch && context.optionChain) {
      const step = context.optionChain.stepSize || 50;
      const strike = (context.optionChain.atmStrike || spotPrice) + step;
      const signal: StrategySignal = {
        strategyId: this.id,
        strategyName: this.name,
        underlying: context.underlying,
        action: "ENTER",
        bias: "BEARISH",
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
      regime,
      rationale,
      proposal,
    };
  }

  public async buildTrade(signal: StrategySignal, context: MarketContext): Promise<TradeProposal> {
    const spot = context.spotPrice;
    const step = context.optionChain?.stepSize || 50;
    const strike = signal.suggestedStrikes[0] || Math.round((spot + step) / step) * step;
    const expiry = signal.recommendedExpiry;
    const premium = Math.round(spot * 0.018 * 100) / 100;
    const quantity = 1;

    const leg: OptionLeg = {
      legId: `leg-1-call-${strike}`,
      symbol: `${context.underlying}-${expiry}-${strike}-CE`,
      underlying: context.underlying,
      optionType: "CALL",
      side: "SELL",
      strike,
      expiry,
      quantity,
      premium,
      orderType: "LIMIT",
      limitPrice: premium,
      delta: -0.32,
      gamma: -0.0015,
      theta: 9.5,
      vega: -14.2,
    };

    const netCredit = premium * quantity;
    const requiredMargin = Math.round((spot * 0.15 + premium) * quantity * 100) / 100;

    return {
      proposalId: `prop-sc-${Date.now()}`,
      strategyId: this.id,
      strategyName: this.name,
      underlying: context.underlying,
      assetClass: context.assetClass,
      legs: [leg],
      entryReason: signal.reasons.join(". "),
      marketRegime: "BEARISH",
      confidence: signal.confidence,
      spotPrice: spot,
      netDebitOrCredit: -netCredit,
      isCredit: true,
      maxProfit: netCredit,
      maxLoss: "UNLIMITED",
      breakevens: [strike + premium],
      riskReward: "HIGH_RISK_UNDEFINED",
      requiredMargin,
      greeks: {
        delta: -0.32,
        gamma: -0.0015,
        theta: 9.5,
        vega: -14.2,
      },
      liquidityScore: 90,
      validationStatus: "PENDING",
      rejectionReasons: [],
      executionMode: "PAPER",
      createdAt: new Date().toISOString(),
    };
  }
}
