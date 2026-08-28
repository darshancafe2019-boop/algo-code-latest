import { BaseOptionStrategy } from "../base/BaseStrategy";
import {
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  OptionLeg,
} from "../base/StrategyTypes";

export class BackspreadStrategy extends BaseOptionStrategy {
  public readonly id = "call-backspread";
  public readonly name = "Call Backspread";
  public readonly description = "Volatility ratio strategy (Sell 1 ATM Call, Buy 2 OTM Calls) positioned for explosive upside rallies with unlimited profit potential.";

  public async analyze(context: MarketContext): Promise<StrategyAnalysis> {
    const { spotPrice, indicators, volatility } = context;
    const rsi = indicators?.rsi14 ?? 50;
    const ivRank = volatility?.ivRank ?? 35;

    let score = 55;
    const rationale: string[] = [];

    if (rsi > 58) {
      score += 20;
      rationale.push(`Strong upward momentum (RSI: ${rsi.toFixed(1)}) favors explosive call backspread payoff`);
    }

    if (ivRank <= 40) {
      score += 20;
      rationale.push(`Low IV Rank (${ivRank}%) makes buying 2 OTM options cheap relative to the short ATM option`);
    }

    const marketMatch = score >= this.config.minConfidence;
    const regime = "STRONG_BULLISH";

    let proposal: TradeProposal | undefined;
    if (marketMatch && context.optionChain) {
      const step = context.optionChain.stepSize || (spotPrice > 40000 ? 500 : spotPrice > 15000 ? 100 : 50);
      const atm = context.optionChain.atmStrike || Math.round(spotPrice / step) * step;

      const shortStrike = atm;
      const longStrike = atm + step * 2;

      const signal: StrategySignal = {
        strategyId: this.id,
        strategyName: this.name,
        underlying: context.underlying,
        action: "ENTER",
        bias: "BULLISH",
        confidence: score,
        reasons: rationale,
        recommendedExpiry: context.optionChain.selectedExpiry || "2026-09-04",
        suggestedStrikes: [shortStrike, longStrike],
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

    const shortStrike = signal.suggestedStrikes[0] || atm;
    const longStrike = signal.suggestedStrikes[1] || atm + step * 2;
    const expiry = signal.recommendedExpiry;

    const shortPremium = Math.round(spot * 0.022 * 100) / 100;
    const longPremium = Math.round(spot * 0.010 * 100) / 100;

    const legs: OptionLeg[] = [
      {
        legId: `leg-1-sell-call-${shortStrike}`,
        symbol: `${context.underlying}-${expiry}-${shortStrike}-CE`,
        underlying: context.underlying,
        optionType: "CALL",
        side: "SELL",
        strike: shortStrike,
        expiry,
        quantity: 1,
        premium: shortPremium,
        orderType: "MARKET",
        delta: 0.52,
        gamma: 0.002,
        theta: 12.5,
        vega: -22.0,
      },
      {
        legId: `leg-2-buy-call-2x-${longStrike}`,
        symbol: `${context.underlying}-${expiry}-${longStrike}-CE`,
        underlying: context.underlying,
        optionType: "CALL",
        side: "BUY",
        strike: longStrike,
        expiry,
        quantity: 2,
        premium: longPremium,
        orderType: "MARKET",
        delta: 0.28,
        gamma: 0.0014,
        theta: -8.0,
        vega: 15.0,
      },
    ];

    const greeks = this.aggregateGreeks(legs);
    const { netCost, isCredit } = this.calculateNetDebitCredit(legs);
    const strikeWidth = longStrike - shortStrike;
    const maxLoss = Math.round((strikeWidth + netCost) * 100) / 100;
    const breakevens = [shortStrike + (isCredit ? -netCost : 0), longStrike + maxLoss];
    const payoffCurve = this.generatePayoffGrid(spot, legs, 0.3);

    return {
      proposalId: `prop-${this.id}-${Date.now()}`,
      strategyId: this.id,
      strategyName: this.name,
      underlying: context.underlying,
      assetClass: context.assetClass,
      legs,
      entryReason: signal.reasons.join(". "),
      marketRegime: "STRONG_BULLISH",
      confidence: signal.confidence,
      spotPrice: spot,
      netDebitOrCredit: netCost,
      isCredit,
      maxProfit: "UNLIMITED",
      maxLoss,
      breakevens,
      riskReward: "Unlimited / Capped Wing Loss",
      requiredMargin: maxLoss,
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
