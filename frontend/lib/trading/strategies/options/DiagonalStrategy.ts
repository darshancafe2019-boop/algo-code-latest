import { BaseOptionStrategy } from "../base/BaseStrategy";
import {
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  OptionLeg,
} from "../base/StrategyTypes";

export class DiagonalStrategy extends BaseOptionStrategy {
  public readonly id = "diagonal-spread";
  public readonly name = "Diagonal Spread";
  public readonly description = "Diagonal calendar spread (Buy longer-term ITM Call, Sell near-term OTM Call) capturing directional upside with rapid front-month time decay.";

  public async analyze(context: MarketContext): Promise<StrategyAnalysis> {
    const { spotPrice, indicators, optionChain } = context;
    const rsi = indicators?.rsi14 ?? 50;
    const ema50 = indicators?.ema50 ?? spotPrice;
    const expiries = optionChain?.availableExpiries || [];

    let score = 55;
    const rationale: string[] = [];

    if (expiries.length < 2) {
      return {
        strategyId: this.id,
        strategyName: this.name,
        marketMatch: false,
        suitabilityScore: 20,
        regime: "NEUTRAL",
        rationale: ["Diagonal spread requires at least 2 distinct expiration cycles"],
      };
    }

    if (spotPrice >= ema50) {
      score += 20;
      rationale.push("Mild upward trend structure favors long-term diagonal delta");
    }

    if (rsi >= 46 && rsi <= 64) {
      score += 15;
      rationale.push(`Sustainable upward momentum (RSI: ${rsi.toFixed(1)})`);
    }

    const marketMatch = score >= this.config.minConfidence;
    const regime = "BULLISH";

    let proposal: TradeProposal | undefined;
    if (marketMatch && optionChain) {
      const step = optionChain.stepSize || (spotPrice > 40000 ? 500 : spotPrice > 15000 ? 100 : 50);
      const atm = optionChain.atmStrike || Math.round(spotPrice / step) * step;

      const longStrike = atm - step * 1; // Back month ITM
      const shortStrike = atm + step * 2; // Front month OTM

      const signal: StrategySignal = {
        strategyId: this.id,
        strategyName: this.name,
        underlying: context.underlying,
        action: "ENTER",
        bias: "BULLISH",
        confidence: score,
        reasons: rationale,
        recommendedExpiry: expiries[0] || "2026-09-04",
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

    const longStrike = signal.suggestedStrikes[0] || atm - step;
    const shortStrike = signal.suggestedStrikes[1] || atm + step * 2;

    const expiries = context.optionChain?.availableExpiries || ["2026-09-04", "2026-09-18"];
    const frontExpiry = expiries[0];
    const backExpiry = expiries[1] || expiries[0];

    const shortPrem = Math.round(spot * 0.009 * 100) / 100;
    const longPrem = Math.round(spot * 0.032 * 100) / 100;

    const legs: OptionLeg[] = [
      {
        legId: `leg-1-sell-front-${shortStrike}`,
        symbol: `${context.underlying}-${frontExpiry}-${shortStrike}-CE`,
        underlying: context.underlying,
        optionType: "CALL",
        side: "SELL",
        strike: shortStrike,
        expiry: frontExpiry,
        quantity: 1,
        premium: shortPrem,
        orderType: "MARKET",
        delta: 0.28,
        gamma: 0.0016,
        theta: 10.0,
        vega: -14.0,
      },
      {
        legId: `leg-2-buy-back-${longStrike}`,
        symbol: `${context.underlying}-${backExpiry}-${longStrike}-CE`,
        underlying: context.underlying,
        optionType: "CALL",
        side: "BUY",
        strike: longStrike,
        expiry: backExpiry,
        quantity: 1,
        premium: longPrem,
        orderType: "MARKET",
        delta: 0.68,
        gamma: 0.0015,
        theta: -7.5,
        vega: 26.0,
      },
    ];

    const greeks = this.aggregateGreeks(legs);
    const { netCost, isCredit } = this.calculateNetDebitCredit(legs);
    const maxLoss = netCost;
    const estimatedMaxProfit = Math.round((shortStrike - longStrike + shortPrem) * 100) / 100;
    const breakevens = [longStrike + netCost];
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
      maxProfit: estimatedMaxProfit,
      maxLoss,
      breakevens,
      riskReward: `${(estimatedMaxProfit / Math.max(1, maxLoss)).toFixed(2)}:1`,
      requiredMargin: netCost,
      greeks,
      payoffCurve,
      liquidityScore: 86,
      validationStatus: "PENDING",
      rejectionReasons: [],
      executionMode: this.config.paperTrading ? "PAPER" : "LIVE",
      createdAt: new Date().toISOString(),
    };
  }
}
