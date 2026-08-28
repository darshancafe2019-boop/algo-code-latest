import { BaseOptionStrategy } from "../base/BaseStrategy";
import {
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  OptionLeg,
} from "../base/StrategyTypes";

export class CoveredCombinationStrategy extends BaseOptionStrategy {
  public readonly id = "covered-combination";
  public readonly name = "Covered Combination";
  public readonly description = "Long underlying asset combined with a Short Call and Short Put to maximize yield on existing holdings.";

  public async analyze(context: MarketContext): Promise<StrategyAnalysis> {
    const { spotPrice, indicators, volatility } = context;
    const rsi = indicators?.rsi14 ?? 50;
    const ivRank = volatility?.ivRank ?? 50;

    let score = 50;
    const rationale: string[] = [];

    if (rsi >= 45 && rsi <= 60) {
      score += 20;
      rationale.push(`Equilibrium range ideal for dual-sided premium harvesting (RSI: ${rsi.toFixed(1)})`);
    }

    if (ivRank >= 60) {
      score += 25;
      rationale.push(`Elevated IV Rank (${ivRank}%) maximizes total credit received`);
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
        bias: "NEUTRAL",
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
      regime: "RANGE_BOUND",
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
    const totalCredit = callPrem + putPrem;

    const legs: OptionLeg[] = [
      {
        legId: `leg-1-spot-${context.underlying}`,
        symbol: `${context.underlying}-STOCK`,
        underlying: context.underlying,
        optionType: "CALL", // Underlying equivalent
        side: "BUY",
        strike: spot,
        expiry: "",
        quantity: 1,
        premium: spot,
        orderType: "MARKET",
        delta: 1.0,
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
        delta: -0.35,
        gamma: -0.0018,
        theta: 8.0,
        vega: -13.0,
      },
      {
        legId: `leg-3-put-${putStrike}`,
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
        theta: 8.0,
        vega: -13.0,
      },
    ];

    const maxProfit = Math.round(((callStrike - spot) + totalCredit) * 100) / 100;
    const maxLoss = Math.round((spot + putStrike - totalCredit) * 100) / 100;
    const requiredMargin = Math.round((spot + putStrike * 0.15) * 100) / 100;

    return {
      proposalId: `prop-ccb-${Date.now()}`,
      strategyId: this.id,
      strategyName: this.name,
      underlying: context.underlying,
      assetClass: context.assetClass,
      legs,
      entryReason: signal.reasons.join(". "),
      marketRegime: "RANGE_BOUND",
      confidence: signal.confidence,
      spotPrice: spot,
      netDebitOrCredit: spot - totalCredit,
      isCredit: false,
      maxProfit,
      maxLoss,
      breakevens: [Math.round((spot + putStrike - totalCredit) / 2 * 100) / 100],
      riskReward: Math.round((maxProfit / maxLoss) * 100) / 100,
      requiredMargin,
      greeks: {
        delta: 1.0,
        gamma: -0.0036,
        theta: 16.0,
        vega: -26.0,
      },
      liquidityScore: 92,
      validationStatus: "PENDING",
      rejectionReasons: [],
      executionMode: "PAPER",
      createdAt: new Date().toISOString(),
    };
  }
}
