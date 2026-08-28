import { BaseOptionStrategy } from "../base/BaseStrategy";
import {
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  OptionLeg,
} from "../base/StrategyTypes";

export class IronCondorStrategy extends BaseOptionStrategy {
  public readonly id = "iron-condor";
  public readonly name = "Iron Condor";
  public readonly description = "4-leg defined risk credit strategy (Bull Put Spread + Bear Call Spread) capturing premium in range-bound, high IV environments.";

  public async analyze(context: MarketContext): Promise<StrategyAnalysis> {
    const { spotPrice, indicators, volatility, optionChain } = context;
    const rsi = indicators?.rsi14 ?? 50;
    const adx = indicators?.adx14 ?? 18;
    const ivRank = volatility?.ivRank ?? 55;
    const pcr = optionChain?.pcrOi ?? 1.0;

    let score = 60;
    const rationale: string[] = [];

    // Low ADX indicates sideways / non-trending range
    if (adx < 22) {
      score += 20;
      rationale.push(`Weak directional trend (ADX: ${adx.toFixed(1)} < 22), ideal for range capture`);
    }

    if (rsi >= 44 && rsi <= 56) {
      score += 15;
      rationale.push(`Neutral oscillator balance (RSI: ${rsi.toFixed(1)})`);
    }

    // High IV Rank is the single most important factor for Iron Condor
    if (ivRank >= 50) {
      score += 20;
      rationale.push(`High IV Rank (${ivRank}%), rich options premium with expected mean-reversion crush`);
    } else if (ivRank < 30) {
      score -= 25;
      rationale.push(`Low IV Rank (${ivRank}%), insufficient premium collection for 4-leg spread`);
    }

    if (pcr >= 0.85 && pcr <= 1.25) {
      score += 10;
      rationale.push(`Balanced Put/Call Ratio (${pcr.toFixed(2)}) confirms equilibrium`);
    }

    const marketMatch = score >= this.config.minConfidence && ivRank >= 35;
    const regime = ivRank > 65 ? "HIGH_VOLATILITY" : "RANGE_BOUND";

    let proposal: TradeProposal | undefined;
    if (marketMatch && optionChain) {
      const step = optionChain.stepSize || (spotPrice > 40000 ? 500 : spotPrice > 15000 ? 100 : 50);
      const atm = optionChain.atmStrike || Math.round(spotPrice / step) * step;

      const longPutK = atm - step * 4;
      const shortPutK = atm - step * 2;
      const shortCallK = atm + step * 2;
      const longCallK = atm + step * 4;

      const signal: StrategySignal = {
        strategyId: this.id,
        strategyName: this.name,
        underlying: context.underlying,
        action: "ENTER",
        bias: "NEUTRAL",
        confidence: score,
        reasons: rationale,
        recommendedExpiry: optionChain.selectedExpiry || "2026-09-04",
        suggestedStrikes: [longPutK, shortPutK, shortCallK, longCallK],
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

    const longPutK = signal.suggestedStrikes[0] || atm - step * 4;
    const shortPutK = signal.suggestedStrikes[1] || atm - step * 2;
    const shortCallK = signal.suggestedStrikes[2] || atm + step * 2;
    const longCallK = signal.suggestedStrikes[3] || atm + step * 4;
    const expiry = signal.recommendedExpiry;

    const shortPutPrem = Math.round(spot * 0.010 * 100) / 100;
    const longPutPrem = Math.round(spot * 0.003 * 100) / 100;
    const shortCallPrem = Math.round(spot * 0.010 * 100) / 100;
    const longCallPrem = Math.round(spot * 0.003 * 100) / 100;

    const netCredit = Math.round((shortPutPrem - longPutPrem + shortCallPrem - longCallPrem) * 100) / 100;
    const wingWidth = shortCallK - longPutK > 0 ? shortPutK - longPutK : step * 2;
    const maxLoss = Math.round((wingWidth - netCredit) * 100) / 100;

    const legs: OptionLeg[] = [
      {
        legId: `leg-1-long-put-${longPutK}`,
        symbol: `${context.underlying}-${expiry}-${longPutK}-PE`,
        underlying: context.underlying,
        optionType: "PUT",
        side: "BUY",
        strike: longPutK,
        expiry,
        quantity: 1,
        premium: longPutPrem,
        orderType: "MARKET",
        delta: -0.10,
        gamma: 0.0006,
        theta: -3.5,
        vega: 6.0,
      },
      {
        legId: `leg-2-short-put-${shortPutK}`,
        symbol: `${context.underlying}-${expiry}-${shortPutK}-PE`,
        underlying: context.underlying,
        optionType: "PUT",
        side: "SELL",
        strike: shortPutK,
        expiry,
        quantity: 1,
        premium: shortPutPrem,
        orderType: "MARKET",
        delta: -0.22,
        gamma: 0.0012,
        theta: 8.0,
        vega: -14.0,
      },
      {
        legId: `leg-3-short-call-${shortCallK}`,
        symbol: `${context.underlying}-${expiry}-${shortCallK}-CE`,
        underlying: context.underlying,
        optionType: "CALL",
        side: "SELL",
        strike: shortCallK,
        expiry,
        quantity: 1,
        premium: shortCallPrem,
        orderType: "MARKET",
        delta: 0.22,
        gamma: 0.0012,
        theta: 8.0,
        vega: -14.0,
      },
      {
        legId: `leg-4-long-call-${longCallK}`,
        symbol: `${context.underlying}-${expiry}-${longCallK}-CE`,
        underlying: context.underlying,
        optionType: "CALL",
        side: "BUY",
        strike: longCallK,
        expiry,
        quantity: 1,
        premium: longCallPrem,
        orderType: "MARKET",
        delta: 0.10,
        gamma: 0.0006,
        theta: -3.5,
        vega: 6.0,
      },
    ];

    const greeks = this.aggregateGreeks(legs);
    const { isCredit } = this.calculateNetDebitCredit(legs);
    const breakevens = [shortPutK - netCredit, shortCallK + netCredit];
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
      netDebitOrCredit: -netCredit,
      isCredit,
      maxProfit: netCredit,
      maxLoss,
      breakevens,
      riskReward: `${(netCredit / Math.max(1, maxLoss)).toFixed(2)}:1`,
      requiredMargin: maxLoss,
      greeks,
      payoffCurve,
      liquidityScore: 94,
      validationStatus: "PENDING",
      rejectionReasons: [],
      executionMode: this.config.paperTrading ? "PAPER" : "LIVE",
      createdAt: new Date().toISOString(),
    };
  }
}
