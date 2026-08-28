import { BaseOptionStrategy } from "../base/BaseStrategy";
import {
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  OptionLeg,
} from "../base/StrategyTypes";

export class BullPutSpreadStrategy extends BaseOptionStrategy {
  public readonly id = "bull-put-spread";
  public readonly name = "Bull Put Spread";
  public readonly description = "Vertical credit spread (Sell OTM Put, Buy further OTM Put) collecting premium in bullish or range-bound markets.";

  public async analyze(context: MarketContext): Promise<StrategyAnalysis> {
    const { spotPrice, indicators, volatility } = context;
    const rsi = indicators?.rsi14 ?? 50;
    const ema50 = indicators?.ema50 ?? spotPrice;
    const ivRank = volatility?.ivRank ?? 50;

    let score = 55;
    const rationale: string[] = [];

    const isAboveSupport = spotPrice >= ema50;
    if (isAboveSupport) {
      score += 20;
      rationale.push("Underlying holding above key EMA support level");
    }

    if (rsi >= 42) {
      score += 15;
      rationale.push(`Stable momentum above support (RSI: ${rsi.toFixed(1)})`);
    }

    // High IV is favorable for credit spreads
    if (ivRank >= 45) {
      score += 15;
      rationale.push(`Elevated IV Rank (${ivRank}%) maximizes option credit collection`);
    }

    const marketMatch = isAboveSupport && score >= this.config.minConfidence;
    const regime = isAboveSupport ? "RANGE_BOUND" : "NEUTRAL";

    let proposal: TradeProposal | undefined;
    if (marketMatch && context.optionChain) {
      const step = context.optionChain.stepSize || (spotPrice > 40000 ? 500 : spotPrice > 15000 ? 100 : 50);
      const atmStrike = context.optionChain.atmStrike || Math.round(spotPrice / step) * step;
      const shortStrike = atmStrike - step * 1; // 1 step OTM
      const longStrike = shortStrike - step * 2; // 2 steps further OTM

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
    const shortStrike = signal.suggestedStrikes[0] || Math.round(spot / step) * step - step;
    const longStrike = signal.suggestedStrikes[1] || shortStrike - step * 2;
    const expiry = signal.recommendedExpiry;

    const shortPremium = Math.round(spot * 0.014 * 100) / 100;
    const longPremium = Math.round(spot * 0.005 * 100) / 100;
    const netCredit = Math.round((shortPremium - longPremium) * 100) / 100;
    const width = shortStrike - longStrike;
    const maxLoss = Math.round((width - netCredit) * 100) / 100;

    const leg1: OptionLeg = {
      legId: `leg-1-sell-put-${shortStrike}`,
      symbol: `${context.underlying}-${expiry}-${shortStrike}-PE`,
      underlying: context.underlying,
      optionType: "PUT",
      side: "SELL",
      strike: shortStrike,
      expiry,
      quantity: 1,
      premium: shortPremium,
      orderType: "MARKET",
      delta: -0.32,
      gamma: 0.0016,
      theta: 9.8,
      vega: -16.0,
    };

    const leg2: OptionLeg = {
      legId: `leg-2-buy-put-${longStrike}`,
      symbol: `${context.underlying}-${expiry}-${longStrike}-PE`,
      underlying: context.underlying,
      optionType: "PUT",
      side: "BUY",
      strike: longStrike,
      expiry,
      quantity: 1,
      premium: longPremium,
      orderType: "MARKET",
      delta: -0.15,
      gamma: 0.0009,
      theta: -4.8,
      vega: 9.0,
    };

    const legs = [leg1, leg2];
    const greeks = this.aggregateGreeks(legs);
    const { isCredit } = this.calculateNetDebitCredit(legs);
    const breakevens = [shortStrike - netCredit];
    const payoffCurve = this.generatePayoffGrid(spot, legs);

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
      netDebitOrCredit: -netCredit, // Credit is negative cost
      isCredit,
      maxProfit: netCredit,
      maxLoss,
      breakevens,
      riskReward: `${(netCredit / Math.max(1, maxLoss)).toFixed(2)}:1`,
      requiredMargin: maxLoss,
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
