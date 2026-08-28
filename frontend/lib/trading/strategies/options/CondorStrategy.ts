import { BaseOptionStrategy } from "../base/BaseStrategy";
import {
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  OptionLeg,
} from "../base/StrategyTypes";

export class CondorStrategy extends BaseOptionStrategy {
  public readonly id = "long-condor";
  public readonly name = "Long Condor";
  public readonly description = "4-leg defined risk neutral strategy with an extended flat maximum profit zone across a specified price corridor.";

  public async analyze(context: MarketContext): Promise<StrategyAnalysis> {
    const { spotPrice, indicators, optionChain } = context;
    const rsi = indicators?.rsi14 ?? 50;

    let score = 55;
    const rationale: string[] = [];

    if (rsi >= 45 && rsi <= 55) {
      score += 20;
      rationale.push("Price consolidating in tight range with neutral momentum");
    }

    const marketMatch = score >= this.config.minConfidence;
    const regime = "RANGE_BOUND";

    let proposal: TradeProposal | undefined;
    if (marketMatch && optionChain) {
      const step = optionChain.stepSize || (spotPrice > 40000 ? 500 : spotPrice > 15000 ? 100 : 50);
      const atm = optionChain.atmStrike || Math.round(spotPrice / step) * step;

      const k1 = atm - step * 3;
      const k2 = atm - step * 1;
      const k3 = atm + step * 1;
      const k4 = atm + step * 3;

      const signal: StrategySignal = {
        strategyId: this.id,
        strategyName: this.name,
        underlying: context.underlying,
        action: "ENTER",
        bias: "NEUTRAL",
        confidence: score,
        reasons: rationale,
        recommendedExpiry: optionChain.selectedExpiry || "2026-09-04",
        suggestedStrikes: [k1, k2, k3, k4],
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
    const atm = context.optionChain?.atmStrike || Math.round(spot / step) * step;

    const k1 = signal.suggestedStrikes[0] || atm - step * 3;
    const k2 = signal.suggestedStrikes[1] || atm - step * 1;
    const k3 = signal.suggestedStrikes[2] || atm + step * 1;
    const k4 = signal.suggestedStrikes[3] || atm + step * 3;
    const expiry = signal.recommendedExpiry;

    const p1 = Math.round(spot * 0.040 * 100) / 100;
    const p2 = Math.round(spot * 0.026 * 100) / 100;
    const p3 = Math.round(spot * 0.016 * 100) / 100;
    const p4 = Math.round(spot * 0.008 * 100) / 100;

    const legs: OptionLeg[] = [
      {
        legId: `leg-1-buy-call-${k1}`,
        symbol: `${context.underlying}-${expiry}-${k1}-CE`,
        underlying: context.underlying,
        optionType: "CALL",
        side: "BUY",
        strike: k1,
        expiry,
        quantity: 1,
        premium: p1,
        orderType: "MARKET",
        delta: 0.75,
        gamma: 0.0016,
        theta: -8.0,
        vega: 15.0,
      },
      {
        legId: `leg-2-sell-call-${k2}`,
        symbol: `${context.underlying}-${expiry}-${k2}-CE`,
        underlying: context.underlying,
        optionType: "CALL",
        side: "SELL",
        strike: k2,
        expiry,
        quantity: 1,
        premium: p2,
        orderType: "MARKET",
        delta: 0.58,
        gamma: 0.0019,
        theta: 11.0,
        vega: -19.5,
      },
      {
        legId: `leg-3-sell-call-${k3}`,
        symbol: `${context.underlying}-${expiry}-${k3}-CE`,
        underlying: context.underlying,
        optionType: "CALL",
        side: "SELL",
        strike: k3,
        expiry,
        quantity: 1,
        premium: p3,
        orderType: "MARKET",
        delta: 0.42,
        gamma: 0.0019,
        theta: 11.0,
        vega: -19.5,
      },
      {
        legId: `leg-4-buy-call-${k4}`,
        symbol: `${context.underlying}-${expiry}-${k4}-CE`,
        underlying: context.underlying,
        optionType: "CALL",
        side: "BUY",
        strike: k4,
        expiry,
        quantity: 1,
        premium: p4,
        orderType: "MARKET",
        delta: 0.25,
        gamma: 0.0015,
        theta: -8.0,
        vega: 14.5,
      },
    ];

    const greeks = this.aggregateGreeks(legs);
    const { netCost, isCredit } = this.calculateNetDebitCredit(legs);
    const width = k2 - k1;
    const maxProfit = Math.round((width - netCost) * 100) / 100;
    const breakevens = [k1 + netCost, k4 - netCost];
    const payoffCurve = this.generatePayoffGrid(spot, legs, 0.25);

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
      liquidityScore: 88,
      validationStatus: "PENDING",
      rejectionReasons: [],
      executionMode: this.config.paperTrading ? "PAPER" : "LIVE",
      createdAt: new Date().toISOString(),
    };
  }
}
