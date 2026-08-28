import { BaseOptionStrategy } from "../base/BaseStrategy";
import {
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  OptionLeg,
} from "../base/StrategyTypes";

export class CalendarStrategy extends BaseOptionStrategy {
  public readonly id = "calendar-spread";
  public readonly name = "Calendar Spread";
  public readonly description = "Horizontal time-decay strategy (Sell near-term ATM option, Buy longer-term ATM option) profiting from accelerating front-month theta decay.";

  public async analyze(context: MarketContext): Promise<StrategyAnalysis> {
    const { spotPrice, indicators, volatility, optionChain } = context;
    const rsi = indicators?.rsi14 ?? 50;
    const ivRank = volatility?.ivRank ?? 35;
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
        rationale: ["Calendar spread requires at least 2 distinct expiration cycles"],
      };
    }

    if (ivRank <= 40) {
      score += 20;
      rationale.push(`Low IV Rank (${ivRank}%) favors buying back-month volatility while front-month decays rapidly`);
    }

    if (rsi >= 45 && rsi <= 55) {
      score += 15;
      rationale.push(`Neutral price action keeps underlying anchored near the ATM strike`);
    }

    const marketMatch = score >= this.config.minConfidence;
    const regime = "LOW_VOLATILITY";

    let proposal: TradeProposal | undefined;
    if (marketMatch && optionChain) {
      const step = optionChain.stepSize || (spotPrice > 40000 ? 500 : spotPrice > 15000 ? 100 : 50);
      const atm = optionChain.atmStrike || Math.round(spotPrice / step) * step;

      const signal: StrategySignal = {
        strategyId: this.id,
        strategyName: this.name,
        underlying: context.underlying,
        action: "ENTER",
        bias: "NEUTRAL",
        confidence: score,
        reasons: rationale,
        recommendedExpiry: expiries[0] || "2026-09-04",
        suggestedStrikes: [atm],
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
    const atm = signal.suggestedStrikes[0] || Math.round(spot / step) * step;

    const expiries = context.optionChain?.availableExpiries || ["2026-09-04", "2026-09-18"];
    const frontExpiry = expiries[0];
    const backExpiry = expiries[1] || expiries[0];

    const frontPremium = Math.round(spot * 0.015 * 100) / 100;
    const backPremium = Math.round(spot * 0.026 * 100) / 100;

    const legs: OptionLeg[] = [
      {
        legId: `leg-1-sell-front-${atm}`,
        symbol: `${context.underlying}-${frontExpiry}-${atm}-CE`,
        underlying: context.underlying,
        optionType: "CALL",
        side: "SELL",
        strike: atm,
        expiry: frontExpiry,
        quantity: 1,
        premium: frontPremium,
        orderType: "MARKET",
        delta: 0.50,
        gamma: 0.0022,
        theta: 15.0,
        vega: -16.0,
      },
      {
        legId: `leg-2-buy-back-${atm}`,
        symbol: `${context.underlying}-${backExpiry}-${atm}-CE`,
        underlying: context.underlying,
        optionType: "CALL",
        side: "BUY",
        strike: atm,
        expiry: backExpiry,
        quantity: 1,
        premium: backPremium,
        orderType: "MARKET",
        delta: 0.52,
        gamma: 0.0016,
        theta: -8.5,
        vega: 24.0,
      },
    ];

    const greeks = this.aggregateGreeks(legs);
    const { netCost, isCredit } = this.calculateNetDebitCredit(legs);
    const estimatedMaxProfit = Math.round(netCost * 0.85 * 100) / 100;
    const breakevens = [atm - netCost * 0.75, atm + netCost * 0.75];
    const payoffCurve = this.generatePayoffGrid(spot, legs, 0.2);

    return {
      proposalId: `prop-${this.id}-${Date.now()}`,
      strategyId: this.id,
      strategyName: this.name,
      underlying: context.underlying,
      assetClass: context.assetClass,
      legs,
      entryReason: signal.reasons.join(". "),
      marketRegime: "LOW_VOLATILITY",
      confidence: signal.confidence,
      spotPrice: spot,
      netDebitOrCredit: netCost,
      isCredit,
      maxProfit: estimatedMaxProfit,
      maxLoss: netCost,
      breakevens,
      riskReward: `${(estimatedMaxProfit / Math.max(1, netCost)).toFixed(2)}:1`,
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
