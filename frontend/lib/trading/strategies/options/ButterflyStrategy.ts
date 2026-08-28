import { BaseOptionStrategy } from "../base/BaseStrategy";
import {
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  OptionLeg,
} from "../base/StrategyTypes";

export class ButterflyStrategy extends BaseOptionStrategy {
  public readonly id = "long-butterfly";
  public readonly name = "Long Butterfly";
  public readonly description = "Defined-risk neutral strategy (Buy 1 Lower Strike, Sell 2 ATM Strikes, Buy 1 Higher Strike) with high risk-to-reward ratio targeting price pinning.";

  public async analyze(context: MarketContext): Promise<StrategyAnalysis> {
    const { spotPrice, indicators, optionChain } = context;
    const rsi = indicators?.rsi14 ?? 50;
    const maxPain = optionChain?.maxPain ?? spotPrice;

    let score = 55;
    const rationale: string[] = [];

    // Check proximity to Max Pain
    const distToMaxPain = Math.abs(spotPrice - maxPain) / spotPrice;
    if (distToMaxPain <= 0.015) {
      score += 25;
      rationale.push(`Underlying spot is centered near Max Pain (${maxPain.toFixed(1)}), high probability of pinning`);
    }

    if (rsi >= 46 && rsi <= 54) {
      score += 15;
      rationale.push(`Equilibrium oscillator signals neutral consolidation (RSI: ${rsi.toFixed(1)})`);
    }

    const marketMatch = score >= this.config.minConfidence;
    const regime = "RANGE_BOUND";

    let proposal: TradeProposal | undefined;
    if (marketMatch && optionChain) {
      const step = optionChain.stepSize || (spotPrice > 40000 ? 500 : spotPrice > 15000 ? 100 : 50);
      const centerK = maxPain || Math.round(spotPrice / step) * step;
      const lowerK = centerK - step * 2;
      const upperK = centerK + step * 2;

      const signal: StrategySignal = {
        strategyId: this.id,
        strategyName: this.name,
        underlying: context.underlying,
        action: "ENTER",
        bias: "NEUTRAL",
        confidence: score,
        reasons: rationale,
        recommendedExpiry: optionChain.selectedExpiry || "2026-09-04",
        suggestedStrikes: [lowerK, centerK, upperK],
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
    const step = context.optionChain?.stepSize || (spot > 40000 ? 500 : spot > 15000 ? 100 : 50);
    const centerK = signal.suggestedStrikes[1] || Math.round(spot / step) * step;
    const lowerK = signal.suggestedStrikes[0] || centerK - step * 2;
    const upperK = signal.suggestedStrikes[2] || centerK + step * 2;
    const expiry = signal.recommendedExpiry;

    const lowerPrem = Math.round(spot * 0.035 * 100) / 100;
    const centerPrem = Math.round(spot * 0.022 * 100) / 100;
    const upperPrem = Math.round(spot * 0.012 * 100) / 100;

    const wingWidth = centerK - lowerK;
    const netDebit = Math.round((lowerPrem + upperPrem - 2 * centerPrem) * 100) / 100;
    const maxProfit = Math.round((wingWidth - netDebit) * 100) / 100;

    const legs: OptionLeg[] = [
      {
        legId: `leg-1-buy-call-${lowerK}`,
        symbol: `${context.underlying}-${expiry}-${lowerK}-CE`,
        underlying: context.underlying,
        optionType: "CALL",
        side: "BUY",
        strike: lowerK,
        expiry,
        quantity: 1,
        premium: lowerPrem,
        orderType: "MARKET",
        delta: 0.70,
        gamma: 0.0018,
        theta: -8.5,
        vega: 16.0,
      },
      {
        legId: `leg-2-sell-call-2x-${centerK}`,
        symbol: `${context.underlying}-${expiry}-${centerK}-CE`,
        underlying: context.underlying,
        optionType: "CALL",
        side: "SELL",
        strike: centerK,
        expiry,
        quantity: 2,
        premium: centerPrem,
        orderType: "MARKET",
        delta: 0.52,
        gamma: 0.002,
        theta: 12.5,
        vega: -22.0,
      },
      {
        legId: `leg-3-buy-call-${upperK}`,
        symbol: `${context.underlying}-${expiry}-${upperK}-CE`,
        underlying: context.underlying,
        optionType: "CALL",
        side: "BUY",
        strike: upperK,
        expiry,
        quantity: 1,
        premium: upperPrem,
        orderType: "MARKET",
        delta: 0.32,
        gamma: 0.0015,
        theta: -9.0,
        vega: 17.0,
      },
    ];

    const greeks = this.aggregateGreeks(legs);
    const { netCost, isCredit } = this.calculateNetDebitCredit(legs);
    const breakevens = [lowerK + netCost, upperK - netCost];
    const payoffCurve = this.generatePayoffGrid(spot, legs, 0.2);

    return {
      proposalId: `prop-${this.id}-${Date.now()}`,
      strategyId: this.id,
      strategyName: this.name,
      underlying: context.underlying,
      assetClass: context.assetClass,
      legs,
      entryReason: signal.reasons.join(". "),
      marketRegime: "RANGE_BOUND",
      confidence: signal.confidence,
      spotPrice: spot,
      netDebitOrCredit: netCost,
      isCredit,
      maxProfit,
      maxLoss: netCost,
      breakevens,
      riskReward: `${(maxProfit / Math.max(1, netCost)).toFixed(2)}:1`,
      requiredMargin: netCost,
      greeks,
      payoffCurve,
      liquidityScore: 90,
      validationStatus: "PENDING",
      rejectionReasons: [],
      executionMode: this.config.paperTrading ? "PAPER" : "LIVE",
      createdAt: new Date().toISOString(),
    };
  }
}
