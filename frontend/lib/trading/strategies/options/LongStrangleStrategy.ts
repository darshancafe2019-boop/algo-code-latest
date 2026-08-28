import { BaseOptionStrategy } from "../base/BaseStrategy";
import {
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  OptionLeg,
} from "../base/StrategyTypes";

export class LongStrangleStrategy extends BaseOptionStrategy {
  public readonly id = "long-strangle";
  public readonly name = "Long Strangle";
  public readonly description = "Non-directional volatility breakout strategy (Buy OTM Call + Buy OTM Put) offering lower debit entry for explosive breakouts.";

  public async analyze(context: MarketContext): Promise<StrategyAnalysis> {
    const { spotPrice, indicators, volatility } = context;
    const atr = indicators?.atr14 ?? spotPrice * 0.02;
    const ivRank = volatility?.ivRank ?? 30;

    let score = 50;
    const rationale: string[] = [];

    if (ivRank <= 30) {
      score += 30;
      rationale.push(`Very Low IV Rank (${ivRank}%), OTM options offer deep value before major volatility expansion`);
    } else if (ivRank > 60) {
      score -= 20;
      rationale.push(`Elevated IV Rank (${ivRank}%), lower probability of covering OTM strangle premium`);
    }

    const atrPct = (atr / spotPrice) * 100;
    if (atrPct >= 1.8) {
      score += 20;
      rationale.push(`Expanding price range (ATR: ${atrPct.toFixed(2)}%) indicates high probability of sharp breakout`);
    }

    const marketMatch = score >= this.config.minConfidence && ivRank <= 40;
    const regime = "HIGH_VOLATILITY";

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
        bias: "UNCERTAIN",
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
    const atm = context.optionChain?.atmStrike || Math.round(spot / step) * step;

    const putStrike = signal.suggestedStrikes[0] || atm - step * 2;
    const callStrike = signal.suggestedStrikes[1] || atm + step * 2;
    const expiry = signal.recommendedExpiry;

    const callPrem = Math.round(spot * 0.009 * 100) / 100;
    const putPrem = Math.round(spot * 0.008 * 100) / 100;
    const totalDebit = Math.round((callPrem + putPrem) * 100) / 100;

    const legs: OptionLeg[] = [
      {
        legId: `leg-1-put-${putStrike}`,
        symbol: `${context.underlying}-${expiry}-${putStrike}-PE`,
        underlying: context.underlying,
        optionType: "PUT",
        side: "BUY",
        strike: putStrike,
        expiry,
        quantity: 1,
        premium: putPrem,
        orderType: "MARKET",
        delta: -0.25,
        gamma: 0.0012,
        theta: -6.5,
        vega: 13.0,
      },
      {
        legId: `leg-2-call-${callStrike}`,
        symbol: `${context.underlying}-${expiry}-${callStrike}-CE`,
        underlying: context.underlying,
        optionType: "CALL",
        side: "BUY",
        strike: callStrike,
        expiry,
        quantity: 1,
        premium: callPrem,
        orderType: "MARKET",
        delta: 0.28,
        gamma: 0.0014,
        theta: -7.0,
        vega: 14.5,
      },
    ];

    const greeks = this.aggregateGreeks(legs);
    const { netCost, isCredit } = this.calculateNetDebitCredit(legs);
    const breakevens = [putStrike - totalDebit, callStrike + totalDebit];
    const payoffCurve = this.generatePayoffGrid(spot, legs, 0.3);

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
      riskReward: "Unlimited / Low Capped Risk",
      requiredMargin: netCost,
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
