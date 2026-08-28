import { BaseOptionStrategy } from "../base/BaseStrategy";
import {
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  OptionLeg,
} from "../base/StrategyTypes";

export class BearPutSpreadStrategy extends BaseOptionStrategy {
  public readonly id = "bear-put-spread";
  public readonly name = "Bear Put Spread";
  public readonly description = "Vertical debit spread (Buy ATM Put, Sell OTM Put) for moderate downward moves with defined risk.";

  public async analyze(context: MarketContext): Promise<StrategyAnalysis> {
    const { spotPrice, indicators, volatility } = context;
    const rsi = indicators?.rsi14 ?? 50;
    const ema20 = indicators?.ema20 ?? spotPrice;
    const ema50 = indicators?.ema50 ?? spotPrice;
    const ivRank = volatility?.ivRank ?? 50;

    let score = 55;
    const rationale: string[] = [];

    const isBearish = spotPrice <= ema20 || ema20 < ema50;
    if (isBearish) {
      score += 20;
      rationale.push("Price structure supports moderate downward continuation");
    }

    if (rsi >= 35 && rsi <= 52) {
      score += 15;
      rationale.push(`Consistent downward momentum (RSI: ${rsi.toFixed(1)})`);
    }

    if (ivRank >= 30 && ivRank <= 75) {
      score += 10;
      rationale.push(`Moderate IV Rank (${ivRank}%) makes debit spread hedging efficient`);
    }

    const marketMatch = isBearish && score >= this.config.minConfidence;
    const regime = isBearish ? "BEARISH" : "NEUTRAL";

    let proposal: TradeProposal | undefined;
    if (marketMatch && context.optionChain) {
      const step = context.optionChain.stepSize || (spotPrice > 40000 ? 500 : spotPrice > 15000 ? 100 : 50);
      const atmStrike = context.optionChain.atmStrike || Math.round(spotPrice / step) * step;
      const otmStrike = atmStrike - step * 2;

      const signal: StrategySignal = {
        strategyId: this.id,
        strategyName: this.name,
        underlying: context.underlying,
        action: "ENTER",
        bias: "BEARISH",
        confidence: score,
        reasons: rationale,
        recommendedExpiry: context.optionChain.selectedExpiry || "2026-09-04",
        suggestedStrikes: [atmStrike, otmStrike],
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
    const buyStrike = signal.suggestedStrikes[0] || Math.round(spot / step) * step;
    const sellStrike = signal.suggestedStrikes[1] || buyStrike - step * 2;
    const expiry = signal.recommendedExpiry;

    const buyPremium = Math.round(spot * 0.021 * 100) / 100;
    const sellPremium = Math.round(spot * 0.008 * 100) / 100;
    const width = buyStrike - sellStrike;

    const leg1: OptionLeg = {
      legId: `leg-1-buy-put-${buyStrike}`,
      symbol: `${context.underlying}-${expiry}-${buyStrike}-PE`,
      underlying: context.underlying,
      optionType: "PUT",
      side: "BUY",
      strike: buyStrike,
      expiry,
      quantity: 1,
      premium: buyPremium,
      orderType: "MARKET",
      delta: -0.48,
      gamma: 0.002,
      theta: -12.0,
      vega: 21.5,
    };

    const leg2: OptionLeg = {
      legId: `leg-2-sell-put-${sellStrike}`,
      symbol: `${context.underlying}-${expiry}-${sellStrike}-PE`,
      underlying: context.underlying,
      optionType: "PUT",
      side: "SELL",
      strike: sellStrike,
      expiry,
      quantity: 1,
      premium: sellPremium,
      orderType: "MARKET",
      delta: -0.24,
      gamma: 0.0013,
      theta: 8.0,
      vega: -14.5,
    };

    const legs = [leg1, leg2];
    const greeks = this.aggregateGreeks(legs);
    const { netCost, isCredit } = this.calculateNetDebitCredit(legs);
    const maxLoss = netCost;
    const maxProfit = Math.round((width - netCost) * 100) / 100;
    const breakevens = [buyStrike - netCost];
    const payoffCurve = this.generatePayoffGrid(spot, legs);

    return {
      proposalId: `prop-${this.id}-${Date.now()}`,
      strategyId: this.id,
      strategyName: this.name,
      underlying: context.underlying,
      assetClass: context.assetClass,
      legs,
      entryReason: signal.reasons.join(". "),
      marketRegime: "BEARISH",
      confidence: signal.confidence,
      spotPrice: spot,
      netDebitOrCredit: netCost,
      isCredit,
      maxProfit,
      maxLoss,
      breakevens,
      riskReward: `${(maxProfit / Math.max(1, maxLoss)).toFixed(2)}:1`,
      requiredMargin: netCost,
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
