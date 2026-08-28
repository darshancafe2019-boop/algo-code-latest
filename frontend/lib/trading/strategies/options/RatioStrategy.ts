import { BaseOptionStrategy } from "../base/BaseStrategy";
import {
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  OptionLeg,
} from "../base/StrategyTypes";

export class RatioStrategy extends BaseOptionStrategy {
  public readonly id = "ratio-spread";
  public readonly name = "Ratio Spread";
  public readonly description = "Front ratio spread (Buy 1 ATM Call, Sell 2 OTM Calls) maximizing profit at the short strike with low/zero net debit cost.";

  public async analyze(context: MarketContext): Promise<StrategyAnalysis> {
    const { spotPrice, indicators, volatility } = context;
    const rsi = indicators?.rsi14 ?? 50;
    const ivRank = volatility?.ivRank ?? 50;

    let score = 55;
    const rationale: string[] = [];

    if (rsi >= 48 && rsi <= 60) {
      score += 20;
      rationale.push(`Moderate upward momentum targeting specific resistance zone (RSI: ${rsi.toFixed(1)})`);
    }

    if (ivRank >= 45) {
      score += 15;
      rationale.push(`Higher IV Rank (${ivRank}%) generates ample credit from 2 short OTM options`);
    }

    const marketMatch = score >= this.config.minConfidence;
    const regime = "BULLISH";

    let proposal: TradeProposal | undefined;
    if (marketMatch && context.optionChain) {
      const step = context.optionChain.stepSize || (spotPrice > 40000 ? 500 : spotPrice > 15000 ? 100 : 50);
      const atm = context.optionChain.atmStrike || Math.round(spotPrice / step) * step;

      const longStrike = atm;
      const shortStrike = atm + step * 2;

      const signal: StrategySignal = {
        strategyId: this.id,
        strategyName: this.name,
        underlying: context.underlying,
        action: "ENTER",
        bias: "BULLISH",
        confidence: score,
        reasons: rationale,
        recommendedExpiry: context.optionChain.selectedExpiry || "2026-09-04",
        suggestedStrikes: [longStrike, shortStrike],
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

    const longStrike = signal.suggestedStrikes[0] || atm;
    const shortStrike = signal.suggestedStrikes[1] || atm + step * 2;
    const expiry = signal.recommendedExpiry;

    const longPremium = Math.round(spot * 0.022 * 100) / 100;
    const shortPremium = Math.round(spot * 0.011 * 100) / 100;

    const legs: OptionLeg[] = [
      {
        legId: `leg-1-buy-call-${longStrike}`,
        symbol: `${context.underlying}-${expiry}-${longStrike}-CE`,
        underlying: context.underlying,
        optionType: "CALL",
        side: "BUY",
        strike: longStrike,
        expiry,
        quantity: 1,
        premium: longPremium,
        orderType: "MARKET",
        delta: 0.52,
        gamma: 0.002,
        theta: -12.5,
        vega: 22.0,
      },
      {
        legId: `leg-2-sell-call-2x-${shortStrike}`,
        symbol: `${context.underlying}-${expiry}-${shortStrike}-CE`,
        underlying: context.underlying,
        optionType: "CALL",
        side: "SELL",
        strike: shortStrike,
        expiry,
        quantity: 2,
        premium: shortPremium,
        orderType: "MARKET",
        delta: 0.28,
        gamma: 0.0014,
        theta: 8.0,
        vega: -15.0,
      },
    ];

    const greeks = this.aggregateGreeks(legs);
    const { netCost, isCredit } = this.calculateNetDebitCredit(legs);
    const width = shortStrike - longStrike;
    const maxProfit = Math.round((width - netCost) * 100) / 100;
    const upperBreakeven = shortStrike + maxProfit;
    const breakevens = [longStrike + (netCost > 0 ? netCost : 0), upperBreakeven];
    const payoffCurve = this.generatePayoffGrid(spot, legs, 0.25);

    return {
      proposalId: `prop-${this.id}-${Date.now()}`,
      strategyId: this.id,
      strategyName: this.name,
      underlying: context.underlying,
      assetClass: context.assetClass,
      legs,
      entryReason: signal.reasons.join(". "),
      marketRegime: "BULLISH",
      confidence: signal.confidence,
      spotPrice: spot,
      netDebitOrCredit: netCost,
      isCredit,
      maxProfit,
      maxLoss: "UNLIMITED",
      breakevens,
      riskReward: `${(maxProfit / width).toFixed(2)}:1 Max`,
      requiredMargin: shortStrike * 0.2, // Naked call margin requirement on second leg
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
