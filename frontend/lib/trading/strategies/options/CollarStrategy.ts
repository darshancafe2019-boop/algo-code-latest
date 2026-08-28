import { BaseOptionStrategy } from "../base/BaseStrategy";
import {
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  OptionLeg,
} from "../base/StrategyTypes";

export class CollarStrategy extends BaseOptionStrategy {
  public readonly id = "collar";
  public readonly name = "Collar";
  public readonly description = "Protective hedging strategy (Long Underlying + Buy OTM Put + Sell OTM Call) setting a defined floor while capping upside to finance protection.";

  public async analyze(context: MarketContext): Promise<StrategyAnalysis> {
    const { spotPrice, indicators, volatility } = context;
    const rsi = indicators?.rsi14 ?? 50;
    const ivRank = volatility?.ivRank ?? 50;

    let score = 55;
    const rationale: string[] = [];

    if (rsi > 65) {
      score += 25;
      rationale.push(`Overextended rally (RSI: ${rsi.toFixed(1)}) warrants protective downside floor`);
    }

    if (ivRank >= 45) {
      score += 15;
      rationale.push(`Healthy call option premium fully funds protective put wing`);
    }

    const marketMatch = score >= this.config.minConfidence;
    const regime = "EVENT_RISK";

    let proposal: TradeProposal | undefined;
    if (marketMatch && context.optionChain) {
      const step = context.optionChain.stepSize || (spotPrice > 40000 ? 500 : spotPrice > 15000 ? 100 : 50);
      const atm = context.optionChain.atmStrike || Math.round(spotPrice / step) * step;

      const putStrike = atm - step * 2;
      const callStrike = atm + step * 2;

      const signal: StrategySignal = {
        strategyId: this.id,
        strategyName: this.name,
        underlying: context.underlying,
        action: "ENTER",
        bias: "NEUTRAL",
        confidence: score,
        reasons: rationale,
        recommendedExpiry: context.optionChain.selectedExpiry || "2026-09-04",
        suggestedStrikes: [putStrike, callStrike],
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
    const atm = Math.round(spot / step) * step;

    const putStrike = signal.suggestedStrikes[0] || atm - step * 2;
    const callStrike = signal.suggestedStrikes[1] || atm + step * 2;
    const expiry = signal.recommendedExpiry;

    const putPremium = Math.round(spot * 0.009 * 100) / 100;
    const callPremium = Math.round(spot * 0.010 * 100) / 100;
    const netOptionCost = Math.round((putPremium - callPremium) * 100) / 100;

    const legs: OptionLeg[] = [
      {
        legId: `leg-1-buy-put-${putStrike}`,
        symbol: `${context.underlying}-${expiry}-${putStrike}-PE`,
        underlying: context.underlying,
        optionType: "PUT",
        side: "BUY",
        strike: putStrike,
        expiry,
        quantity: 1,
        premium: putPremium,
        orderType: "MARKET",
        delta: -0.25,
        gamma: 0.0013,
        theta: -6.5,
        vega: 13.0,
      },
      {
        legId: `leg-2-sell-call-${callStrike}`,
        symbol: `${context.underlying}-${expiry}-${callStrike}-CE`,
        underlying: context.underlying,
        optionType: "CALL",
        side: "SELL",
        strike: callStrike,
        expiry,
        quantity: 1,
        premium: callPremium,
        orderType: "MARKET",
        delta: 0.28,
        gamma: 0.0014,
        theta: 7.5,
        vega: -14.0,
      },
    ];

    const greeks = this.aggregateGreeks(legs);
    greeks.delta = Math.round((greeks.delta + 1.0) * 100) / 100; // Adding underlying delta

    const maxLoss = Math.round((spot - putStrike + netOptionCost) * 100) / 100;
    const maxProfit = Math.round((callStrike - spot - netOptionCost) * 100) / 100;
    const breakevens = [spot + netOptionCost];
    const payoffCurve = this.generatePayoffGrid(spot, legs, 0.2);

    return {
      proposalId: `prop-${this.id}-${Date.now()}`,
      strategyId: this.id,
      strategyName: this.name,
      underlying: context.underlying,
      assetClass: context.assetClass,
      legs,
      entryReason: signal.reasons.join(". "),
      marketRegime: "EVENT_RISK",
      confidence: signal.confidence,
      spotPrice: spot,
      netDebitOrCredit: netOptionCost,
      isCredit: netOptionCost < 0,
      maxProfit,
      maxLoss,
      breakevens,
      riskReward: `${(maxProfit / Math.max(1, maxLoss)).toFixed(2)}:1`,
      requiredMargin: spot,
      greeks,
      payoffCurve,
      liquidityScore: 92,
      validationStatus: "PENDING",
      rejectionReasons: [],
      executionMode: this.config.paperTrading ? "PAPER" : "LIVE",
      createdAt: new Date().toISOString(),
    };
  }
}
