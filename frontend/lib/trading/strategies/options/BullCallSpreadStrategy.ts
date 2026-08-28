import { BaseOptionStrategy } from "../base/BaseStrategy";
import {
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  OptionLeg,
} from "../base/StrategyTypes";

export class BullCallSpreadStrategy extends BaseOptionStrategy {
  public readonly id = "bull-call-spread";
  public readonly name = "Bull Call Spread";
  public readonly description = "Vertical debit spread (Buy ATM Call, Sell OTM Call) with defined risk and reduced net premium cost.";

  public async analyze(context: MarketContext): Promise<StrategyAnalysis> {
    const { spotPrice, indicators, volatility } = context;
    const rsi = indicators?.rsi14 ?? 50;
    const ema20 = indicators?.ema20 ?? spotPrice;
    const ema50 = indicators?.ema50 ?? spotPrice;
    const ivRank = volatility?.ivRank ?? 50;

    let score = 55;
    const rationale: string[] = [];

    const isBullish = spotPrice >= ema20 || ema20 > ema50;
    if (isBullish) {
      score += 20;
      rationale.push("Price structure supports moderate upside above moving averages");
    }

    if (rsi >= 48 && rsi <= 65) {
      score += 15;
      rationale.push(`Healthy upward momentum (RSI: ${rsi.toFixed(1)})`);
    }

    if (ivRank >= 30 && ivRank <= 70) {
      score += 10;
      rationale.push(`Moderate IV Rank (${ivRank}%) makes vertical spread cost-effective`);
    }

    const marketMatch = isBullish && score >= this.config.minConfidence;
    const regime = isBullish ? "BULLISH" : "NEUTRAL";

    let proposal: TradeProposal | undefined;
    if (marketMatch && context.optionChain) {
      const step = context.optionChain.stepSize || (spotPrice > 40000 ? 500 : spotPrice > 15000 ? 100 : 50);
      const atmStrike = context.optionChain.atmStrike || Math.round(spotPrice / step) * step;
      const otmStrike = atmStrike + step * 2;

      const signal: StrategySignal = {
        strategyId: this.id,
        strategyName: this.name,
        underlying: context.underlying,
        action: "ENTER",
        bias: "BULLISH",
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
    const sellStrike = signal.suggestedStrikes[1] || buyStrike + step * 2;
    const expiry = signal.recommendedExpiry;

    const buyPremium = Math.round(spot * 0.022 * 100) / 100;
    const sellPremium = Math.round(spot * 0.009 * 100) / 100;
    const width = sellStrike - buyStrike;

    const leg1: OptionLeg = {
      legId: `leg-1-buy-call-${buyStrike}`,
      symbol: `${context.underlying}-${expiry}-${buyStrike}-CE`,
      underlying: context.underlying,
      optionType: "CALL",
      side: "BUY",
      strike: buyStrike,
      expiry,
      quantity: 1,
      premium: buyPremium,
      orderType: "MARKET",
      delta: 0.52,
      gamma: 0.002,
      theta: -12.5,
      vega: 22.0,
    };

    const leg2: OptionLeg = {
      legId: `leg-2-sell-call-${sellStrike}`,
      symbol: `${context.underlying}-${expiry}-${sellStrike}-CE`,
      underlying: context.underlying,
      optionType: "CALL",
      side: "SELL",
      strike: sellStrike,
      expiry,
      quantity: 1,
      premium: sellPremium,
      orderType: "MARKET",
      delta: 0.28,
      gamma: 0.0014,
      theta: 8.5,
      vega: -15.2,
    };

    const legs = [leg1, leg2];
    const greeks = this.aggregateGreeks(legs);
    const { netCost, isCredit } = this.calculateNetDebitCredit(legs);
    const maxLoss = netCost;
    const maxProfit = Math.round((width - netCost) * 100) / 100;
    const breakevens = [buyStrike + netCost];
    const payoffCurve = this.generatePayoffGrid(spot, legs);

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
