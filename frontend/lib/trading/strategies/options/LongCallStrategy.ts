import { BaseOptionStrategy } from "../base/BaseStrategy";
import {
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  OptionLeg,
} from "../base/StrategyTypes";

export class LongCallStrategy extends BaseOptionStrategy {
  public readonly id = "long-call";
  public readonly name = "Long Call";
  public readonly description = "Single-leg long call option designed for strong bullish upside breakouts with defined risk.";

  public async analyze(context: MarketContext): Promise<StrategyAnalysis> {
    const { spotPrice, indicators, volatility } = context;
    const rsi = indicators?.rsi14 ?? 50;
    const ema20 = indicators?.ema20 ?? spotPrice;
    const ema50 = indicators?.ema50 ?? spotPrice;
    const ivRank = volatility?.ivRank ?? 50;

    let score = 50;
    const rationale: string[] = [];

    const isBullishTrend = spotPrice > ema20 && ema20 >= ema50;
    if (isBullishTrend) {
      score += 25;
      rationale.push("Underlying is trending above 20 and 50 EMA");
    }

    if (rsi >= 50 && rsi <= 68) {
      score += 15;
      rationale.push(`Bullish momentum confirmed with RSI at ${rsi.toFixed(1)} (not overbought)`);
    } else if (rsi > 70) {
      score -= 20;
      rationale.push(`RSI is overbought (${rsi.toFixed(1)}), increasing pullback risk`);
    }

    // Long calls benefit from low IV that is expected to rise
    if (ivRank <= 40) {
      score += 10;
      rationale.push(`Low IV Rank (${ivRank}%), providing cheaper premium entry`);
    } else if (ivRank > 75) {
      score -= 15;
      rationale.push(`High IV Rank (${ivRank}%), elevated volatility crush risk for net debit`);
    }

    const marketMatch = isBullishTrend && score >= this.config.minConfidence;
    const regime = isBullishTrend ? "BULLISH" : "NEUTRAL";

    let proposal: TradeProposal | undefined;
    if (marketMatch && context.optionChain) {
      const signal: StrategySignal = {
        strategyId: this.id,
        strategyName: this.name,
        underlying: context.underlying,
        action: "ENTER",
        bias: "BULLISH",
        confidence: score,
        reasons: rationale,
        recommendedExpiry: context.optionChain.selectedExpiry || "2026-09-04",
        suggestedStrikes: [context.optionChain.atmStrike || spotPrice],
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
    const strike = signal.suggestedStrikes[0] || Math.round(spot / step) * step;
    const expiry = signal.recommendedExpiry;

    // Estimate realistic premium based on 2-3% of spot or ATM quote
    const premium = Math.round(spot * 0.022 * 100) / 100;
    const quantity = 1;

    const leg: OptionLeg = {
      legId: `leg-1-call-${strike}`,
      symbol: `${context.underlying}-${expiry}-${strike}-CE`,
      underlying: context.underlying,
      optionType: "CALL",
      side: "BUY",
      strike,
      expiry,
      quantity,
      premium,
      orderType: "MARKET",
      delta: 0.52,
      gamma: 0.002,
      theta: -12.5,
      vega: 22.0,
      rho: 0.04,
    };

    const legs = [leg];
    const greeks = this.aggregateGreeks(legs);
    const { netCost, isCredit } = this.calculateNetDebitCredit(legs);
    const breakevens = [strike + premium];
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
      maxProfit: "UNLIMITED",
      maxLoss: netCost,
      breakevens,
      riskReward: "Unlimited / Capped Risk",
      requiredMargin: netCost,
      greeks,
      payoffCurve,
      liquidityScore: 85,
      validationStatus: "PENDING",
      rejectionReasons: [],
      executionMode: this.config.paperTrading ? "PAPER" : "LIVE",
      createdAt: new Date().toISOString(),
    };
  }
}
