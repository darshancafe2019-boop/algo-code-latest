import { BaseOptionStrategy } from "../base/BaseStrategy";
import {
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  OptionLeg,
} from "../base/StrategyTypes";

export class LongStraddleStrategy extends BaseOptionStrategy {
  public readonly id = "long-straddle";
  public readonly name = "Long Straddle";
  public readonly description = "Non-directional volatility breakout strategy (Buy ATM Call + Buy ATM Put) profiting from large price movements in either direction.";

  public async analyze(context: MarketContext): Promise<StrategyAnalysis> {
    const { spotPrice, indicators, volatility } = context;
    const atr = indicators?.atr14 ?? spotPrice * 0.02;
    const ivRank = volatility?.ivRank ?? 30;

    let score = 50;
    const rationale: string[] = [];

    // Low IV is prime for buying straddles before an expansion
    if (ivRank <= 35) {
      score += 30;
      rationale.push(`Low IV Rank (${ivRank}%), options premiums are cheap before expected volatility expansion`);
    } else if (ivRank > 65) {
      score -= 25;
      rationale.push(`High IV Rank (${ivRank}%), premium is expensive with high theta burn`);
    }

    const atrPct = (atr / spotPrice) * 100;
    if (atrPct >= 1.5) {
      score += 15;
      rationale.push(`High realized volatility ATR (${atrPct.toFixed(2)}% of spot) supports large range movement`);
    }

    const marketMatch = score >= this.config.minConfidence && ivRank <= 40;
    const regime = "HIGH_VOLATILITY";

    let proposal: TradeProposal | undefined;
    if (marketMatch && context.optionChain) {
      const step = context.optionChain.stepSize || (spotPrice > 40000 ? 500 : spotPrice > 15000 ? 100 : 50);
      const atmStrike = context.optionChain.atmStrike || Math.round(spotPrice / step) * step;

      const signal: StrategySignal = {
        strategyId: this.id,
        strategyName: this.name,
        underlying: context.underlying,
        action: "ENTER",
        bias: "UNCERTAIN",
        confidence: score,
        reasons: rationale,
        recommendedExpiry: context.optionChain.selectedExpiry || "2026-09-04",
        suggestedStrikes: [atmStrike],
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
    const atmStrike = signal.suggestedStrikes[0] || Math.round(spot / step) * step;
    const expiry = signal.recommendedExpiry;

    const callPrem = Math.round(spot * 0.022 * 100) / 100;
    const putPrem = Math.round(spot * 0.021 * 100) / 100;
    const totalDebit = Math.round((callPrem + putPrem) * 100) / 100;

    const legs: OptionLeg[] = [
      {
        legId: `leg-1-call-${atmStrike}`,
        symbol: `${context.underlying}-${expiry}-${atmStrike}-CE`,
        underlying: context.underlying,
        optionType: "CALL",
        side: "BUY",
        strike: atmStrike,
        expiry,
        quantity: 1,
        premium: callPrem,
        orderType: "MARKET",
        delta: 0.52,
        gamma: 0.002,
        theta: -12.5,
        vega: 22.0,
      },
      {
        legId: `leg-2-put-${atmStrike}`,
        symbol: `${context.underlying}-${expiry}-${atmStrike}-PE`,
        underlying: context.underlying,
        optionType: "PUT",
        side: "BUY",
        strike: atmStrike,
        expiry,
        quantity: 1,
        premium: putPrem,
        orderType: "MARKET",
        delta: -0.48,
        gamma: 0.002,
        theta: -12.0,
        vega: 21.5,
      },
    ];

    const greeks = this.aggregateGreeks(legs);
    const { netCost, isCredit } = this.calculateNetDebitCredit(legs);
    const breakevens = [atmStrike - totalDebit, atmStrike + totalDebit];
    const payoffCurve = this.generatePayoffGrid(spot, legs, 0.25);

    return {
      proposalId: `prop-${this.id}-${Date.now()}`,
      strategyId: this.id,
      strategyName: this.name,
      underlying: context.underlying,
      assetClass: context.assetClass,
      legs,
      entryReason: signal.reasons.join(". "),
      marketRegime: "HIGH_VOLATILITY",
      confidence: signal.confidence,
      spotPrice: spot,
      netDebitOrCredit: netCost,
      isCredit,
      maxProfit: "UNLIMITED",
      maxLoss: netCost,
      breakevens,
      riskReward: "Unlimited / Capped Risk",
      requiredMargin: netCost,
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
