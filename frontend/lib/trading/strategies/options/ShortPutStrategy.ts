import { BaseOptionStrategy } from "../base/BaseStrategy";
import {
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  OptionLeg,
} from "../base/StrategyTypes";

export class ShortPutStrategy extends BaseOptionStrategy {
  public readonly id = "short-put";
  public readonly name = "Short Put";
  public readonly description = "Single-leg naked or standard short put option collecting premium with neutral-to-bullish outlook.";

  public async analyze(context: MarketContext): Promise<StrategyAnalysis> {
    const { spotPrice, indicators, volatility } = context;
    const rsi = indicators?.rsi14 ?? 50;
    const ema20 = indicators?.ema20 ?? spotPrice;
    const ivRank = volatility?.ivRank ?? 50;

    let score = 50;
    const rationale: string[] = [];

    if (spotPrice >= ema20) {
      score += 20;
      rationale.push("Price maintaining support above 20 EMA");
    }

    if (rsi >= 45 && rsi <= 65) {
      score += 15;
      rationale.push(`Stable neutral-to-bullish momentum with RSI at ${rsi.toFixed(1)}`);
    }

    if (ivRank >= 55) {
      score += 15;
      rationale.push(`Elevated IV Rank (${ivRank}%) gives favorable premium credit`);
    }

    const marketMatch = score >= this.config.minConfidence;
    const regime = spotPrice >= ema20 ? "BULLISH" : "NEUTRAL";

    let proposal: TradeProposal | undefined;
    if (marketMatch && context.optionChain) {
      const step = context.optionChain.stepSize || 50;
      const strike = (context.optionChain.atmStrike || spotPrice) - step;
      const signal: StrategySignal = {
        strategyId: this.id,
        strategyName: this.name,
        underlying: context.underlying,
        action: "ENTER",
        bias: "BULLISH",
        confidence: score,
        reasons: rationale,
        recommendedExpiry: context.optionChain.selectedExpiry || "2026-09-04",
        suggestedStrikes: [strike],
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
    const step = context.optionChain?.stepSize || 50;
    const strike = signal.suggestedStrikes[0] || Math.round((spot - step) / step) * step;
    const expiry = signal.recommendedExpiry;
    const premium = Math.round(spot * 0.018 * 100) / 100;
    const quantity = 1;

    const leg: OptionLeg = {
      legId: `leg-1-put-${strike}`,
      symbol: `${context.underlying}-${expiry}-${strike}-PE`,
      underlying: context.underlying,
      optionType: "PUT",
      side: "SELL",
      strike,
      expiry,
      quantity,
      premium,
      orderType: "LIMIT",
      limitPrice: premium,
      delta: 0.32,
      gamma: -0.0015,
      theta: 9.5,
      vega: -14.2,
    };

    const netCredit = premium * quantity;
    const maxLoss = Math.round((strike - premium) * quantity * 100) / 100;
    const requiredMargin = Math.round((spot * 0.15 + premium) * quantity * 100) / 100;

    return {
      proposalId: `prop-sp-${Date.now()}`,
      strategyId: this.id,
      strategyName: this.name,
      underlying: context.underlying,
      assetClass: context.assetClass,
      legs: [leg],
      entryReason: signal.reasons.join(". "),
      marketRegime: "BULLISH",
      confidence: signal.confidence,
      spotPrice: spot,
      netDebitOrCredit: -netCredit,
      isCredit: true,
      maxProfit: netCredit,
      maxLoss,
      breakevens: [strike - premium],
      riskReward: roundNumber(netCredit / maxLoss, 2),
      requiredMargin,
      greeks: {
        delta: 0.32,
        gamma: -0.0015,
        theta: 9.5,
        vega: -14.2,
      },
      liquidityScore: 92,
      validationStatus: "PENDING",
      rejectionReasons: [],
      executionMode: "PAPER",
      createdAt: new Date().toISOString(),
    };
  }
}

function roundNumber(num: number, dec: number): number {
  const factor = Math.pow(10, dec);
  return Math.round(num * factor) / factor;
}
