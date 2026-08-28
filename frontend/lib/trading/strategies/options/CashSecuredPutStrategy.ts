import { BaseOptionStrategy } from "../base/BaseStrategy";
import {
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  OptionLeg,
} from "../base/StrategyTypes";

export class CashSecuredPutStrategy extends BaseOptionStrategy {
  public readonly id = "cash-secured-put";
  public readonly name = "Cash-Secured Put";
  public readonly description = "Sell OTM Put fully backed by 100% cash to generate income or acquire underlying at discount.";

  public async analyze(context: MarketContext): Promise<StrategyAnalysis> {
    const { spotPrice, indicators, volatility } = context;
    const rsi = indicators?.rsi14 ?? 50;
    const ema50 = indicators?.ema50 ?? spotPrice;
    const ivRank = volatility?.ivRank ?? 50;

    let score = 50;
    const rationale: string[] = [];

    if (spotPrice >= ema50) {
      score += 20;
      rationale.push("Underlying is structurally sound above 50 EMA");
    }

    if (rsi >= 40 && rsi <= 60) {
      score += 15;
      rationale.push(`Ideal accumulation zone with RSI at ${rsi.toFixed(1)}`);
    }

    if (ivRank >= 45) {
      score += 15;
      rationale.push(`Healthy implied volatility (${ivRank}%) yielding attractive yield`);
    }

    const marketMatch = score >= this.config.minConfidence;

    let proposal: TradeProposal | undefined;
    if (marketMatch && context.optionChain) {
      const step = context.optionChain.stepSize || 50;
      const strike = (context.optionChain.atmStrike || spotPrice) - (step * 2);
      const signal: StrategySignal = {
        strategyId: this.id,
        strategyName: this.name,
        underlying: context.underlying,
        action: "ENTER",
        bias: "BULLISH",
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
      regime: "BULLISH",
      rationale,
      proposal,
    };
  }

  public async buildTrade(signal: StrategySignal, context: MarketContext): Promise<TradeProposal> {
    const spot = context.spotPrice;
    const step = context.optionChain?.stepSize || 50;
    const strike = signal.suggestedStrikes[0] || Math.round((spot - step * 2) / step) * step;
    const expiry = signal.recommendedExpiry;
    const premium = Math.round(spot * 0.015 * 100) / 100;
    const quantity = 1;

    const leg: OptionLeg = {
      legId: `leg-1-csp-${strike}`,
      symbol: `${context.underlying}-${expiry}-${strike}-PE`,
      underlying: context.underlying,
      optionType: "PUT",
      side: "SELL",
      strike,
      expiry,
      quantity,
      premium,
      orderType: "LIMIT",
      limitPrice: premium,
      delta: 0.25,
      gamma: -0.0012,
      theta: 7.8,
      vega: -11.5,
    };

    const netCredit = premium * quantity;
    const maxLoss = Math.round((strike - premium) * quantity * 100) / 100;
    // 100% Cash Secured Margin
    const requiredMargin = strike * quantity;

    return {
      proposalId: `prop-csp-${Date.now()}`,
      strategyId: this.id,
      strategyName: this.name,
      underlying: context.underlying,
      assetClass: context.assetClass,
      legs: [leg],
      entryReason: signal.reasons.join(". "),
      marketRegime: "BULLISH",
      confidence: signal.confidence,
      spotPrice: spot,
      netDebitOrCredit: -netCredit,
      isCredit: true,
      maxProfit: netCredit,
      maxLoss,
      breakevens: [strike - premium],
      riskReward: Math.round((netCredit / maxLoss) * 100) / 100,
      requiredMargin,
      greeks: {
        delta: 0.25,
        gamma: -0.0012,
        theta: 7.8,
        vega: -11.5,
      },
      liquidityScore: 95,
      validationStatus: "PENDING",
      rejectionReasons: [],
      executionMode: "PAPER",
      createdAt: new Date().toISOString(),
    };
  }
}
