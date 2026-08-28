import { BaseOptionStrategy } from "../base/BaseStrategy";
import {
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  OptionLeg,
} from "../base/StrategyTypes";

export class CoveredCallStrategy extends BaseOptionStrategy {
  public readonly id = "covered-call";
  public readonly name = "Covered Call";
  public readonly description = "Income-generating strategy selling an OTM call against a long underlying position to monetize upside and lower cost basis.";

  public async analyze(context: MarketContext): Promise<StrategyAnalysis> {
    const { spotPrice, indicators, volatility } = context;
    const rsi = indicators?.rsi14 ?? 50;
    const ivRank = volatility?.ivRank ?? 50;

    let score = 55;
    const rationale: string[] = [];

    if (rsi >= 45 && rsi <= 65) {
      score += 20;
      rationale.push(`Moderately bullish to neutral trend is ideal for covered call monetization`);
    }

    if (ivRank >= 40) {
      score += 15;
      rationale.push(`Elevated IV Rank (${ivRank}%) generates attractive call option premium yield`);
    }

    const marketMatch = score >= this.config.minConfidence;
    const regime = "NEUTRAL";

    let proposal: TradeProposal | undefined;
    if (marketMatch && context.optionChain) {
      const step = context.optionChain.stepSize || (spotPrice > 40000 ? 500 : spotPrice > 15000 ? 100 : 50);
      const atm = context.optionChain.atmStrike || Math.round(spotPrice / step) * step;
      const otmCallStrike = atm + step * 2;

      const signal: StrategySignal = {
        strategyId: this.id,
        strategyName: this.name,
        underlying: context.underlying,
        action: "ENTER",
        bias: "NEUTRAL",
        confidence: score,
        reasons: rationale,
        recommendedExpiry: context.optionChain.selectedExpiry || "2026-09-04",
        suggestedStrikes: [otmCallStrike],
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
    const callStrike = signal.suggestedStrikes[0] || atm + step * 2;
    const expiry = signal.recommendedExpiry;

    const callPremium = Math.round(spot * 0.012 * 100) / 100;

    const leg: OptionLeg = {
      legId: `leg-1-sell-covered-call-${callStrike}`,
      symbol: `${context.underlying}-${expiry}-${callStrike}-CE`,
      underlying: context.underlying,
      optionType: "CALL",
      side: "SELL",
      strike: callStrike,
      expiry,
      quantity: 1,
      premium: callPremium,
      orderType: "MARKET",
      delta: 0.30,
      gamma: 0.0015,
      theta: 9.0,
      vega: -15.0,
    };

    const legs = [leg];
    const greeks = this.aggregateGreeks(legs);
    // Include +1 delta from long underlying
    greeks.delta = Math.round((greeks.delta + 1.0) * 100) / 100;

    const netCredit = callPremium;
    const maxProfit = Math.round((callStrike - spot + callPremium) * 100) / 100;
    const maxLoss = Math.round((spot - callPremium) * 100) / 100;
    const breakevens = [spot - callPremium];
    const payoffCurve = this.generatePayoffGrid(spot, legs, 0.2);

    return {
      proposalId: `prop-${this.id}-${Date.now()}`,
      strategyId: this.id,
      strategyName: this.name,
      underlying: context.underlying,
      assetClass: context.assetClass,
      legs,
      entryReason: signal.reasons.join(". "),
      marketRegime: "NEUTRAL",
      confidence: signal.confidence,
      spotPrice: spot,
      netDebitOrCredit: -netCredit,
      isCredit: true,
      maxProfit,
      maxLoss,
      breakevens,
      riskReward: `${(maxProfit / Math.max(1, maxLoss)).toFixed(2)}:1`,
      requiredMargin: spot,
      greeks,
      payoffCurve,
      liquidityScore: 95,
      validationStatus: "PENDING",
      rejectionReasons: [],
      executionMode: this.config.paperTrading ? "PAPER" : "LIVE",
      createdAt: new Date().toISOString(),
    };
  }
}
