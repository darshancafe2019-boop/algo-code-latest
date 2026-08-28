import { BaseOptionStrategy } from "../base/BaseStrategy";
import {
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  OptionLeg,
} from "../base/StrategyTypes";

export class LongPutStrategy extends BaseOptionStrategy {
  public readonly id = "long-put";
  public readonly name = "Long Put";
  public readonly description = "Single-leg long put option designed for strong bearish downside breakdowns with defined risk.";

  public async analyze(context: MarketContext): Promise<StrategyAnalysis> {
    const { spotPrice, indicators, volatility } = context;
    const rsi = indicators?.rsi14 ?? 50;
    const ema20 = indicators?.ema20 ?? spotPrice;
    const ema50 = indicators?.ema50 ?? spotPrice;
    const ivRank = volatility?.ivRank ?? 50;

    let score = 50;
    const rationale: string[] = [];

    const isBearishTrend = spotPrice < ema20 && ema20 <= ema50;
    if (isBearishTrend) {
      score += 25;
      rationale.push("Underlying is trending below 20 and 50 EMA");
    }

    if (rsi <= 48 && rsi >= 32) {
      score += 15;
      rationale.push(`Bearish momentum confirmed with RSI at ${rsi.toFixed(1)} (not oversold)`);
    } else if (rsi < 30) {
      score -= 20;
      rationale.push(`RSI is oversold (${rsi.toFixed(1)}), increasing technical bounce risk`);
    }

    if (ivRank <= 45) {
      score += 10;
      rationale.push(`Moderate/Low IV Rank (${ivRank}%), providing favorable premium entry`);
    } else if (ivRank > 80) {
      score -= 15;
      rationale.push(`High IV Rank (${ivRank}%), elevated volatility crush risk`);
    }

    const marketMatch = isBearishTrend && score >= this.config.minConfidence;
    const regime = isBearishTrend ? "BEARISH" : "NEUTRAL";

    let proposal: TradeProposal | undefined;
    if (marketMatch && context.optionChain) {
      const signal: StrategySignal = {
        strategyId: this.id,
        strategyName: this.name,
        underlying: context.underlying,
        action: "ENTER",
        bias: "BEARISH",
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

    const premium = Math.round(spot * 0.022 * 100) / 100;
    const quantity = 1;

    const leg: OptionLeg = {
      legId: `leg-1-put-${strike}`,
      symbol: `${context.underlying}-${expiry}-${strike}-PE`,
      underlying: context.underlying,
      optionType: "PUT",
      side: "BUY",
      strike,
      expiry,
      quantity,
      premium,
      orderType: "MARKET",
      delta: -0.48,
      gamma: 0.002,
      theta: -12.0,
      vega: 21.5,
      rho: -0.04,
    };

    const legs = [leg];
    const greeks = this.aggregateGreeks(legs);
    const { netCost, isCredit } = this.calculateNetDebitCredit(legs);
    const breakevens = [strike - premium];
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
      maxProfit: strike - premium,
      maxLoss: netCost,
      breakevens,
      riskReward: `${((strike - premium) / netCost).toFixed(2)}:1`,
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
