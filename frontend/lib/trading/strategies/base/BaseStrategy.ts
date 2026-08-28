/**
 * Abstract Base Option Strategy
 * ==============================
 * Provides common analytical utilities, Black-Scholes Greeks summation,
 * payoff grid calculation, margin estimates, and standard risk validation.
 */

import {
  TradingStrategy,
  StrategyConfig,
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  ValidationResult,
  TradeProposal,
  RiskAnalysis,
  ExitDecision,
  AdjustmentDecision,
  ActiveOptionPosition,
  OptionLeg,
  GreeksSummary,
  StrategyPayoffPoint,
} from "./StrategyTypes";

export abstract class BaseOptionStrategy implements TradingStrategy {
  public abstract readonly id: string;
  public abstract readonly name: string;
  public readonly category: "options" = "options";
  public abstract readonly description: string;

  public config: StrategyConfig;

  constructor(defaultConfig?: Partial<StrategyConfig>) {
    this.config = {
      enabled: true,
      maxPositions: 2,
      riskPerTradePercent: 1.5,
      minConfidence: 65,
      takeProfitPercent: 50, // 50% max profit for credit spreads
      stopLossPercent: 100, // 1x premium or defined risk stop
      maxDaysToExpiry: 45,
      minLiquidityScore: 60,
      paperTrading: true,
      ...defaultConfig,
    };
  }

  public updateConfig(newConfig: Partial<StrategyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public abstract analyze(context: MarketContext): Promise<StrategyAnalysis>;

  public abstract buildTrade(signal: StrategySignal, context: MarketContext): Promise<TradeProposal>;

  public async validate(signal: StrategySignal): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!signal.underlying) errors.push("Missing underlying symbol");
    if (!signal.recommendedExpiry) errors.push("Missing recommended expiry");
    if (!signal.suggestedStrikes || signal.suggestedStrikes.length === 0) {
      errors.push("No option strikes suggested for strategy");
    }

    if (signal.confidence < this.config.minConfidence) {
      warnings.push(
        `Signal confidence (${signal.confidence}%) is below strategy threshold (${this.config.minConfidence}%)`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      timestamp: new Date().toISOString(),
    };
  }

  public async shouldEnter(context: MarketContext): Promise<boolean> {
    if (!this.config.enabled) return false;
    const analysis = await this.analyze(context);
    return analysis.marketMatch && analysis.suitabilityScore >= this.config.minConfidence;
  }

  public async shouldExit(
    position: ActiveOptionPosition,
    context: MarketContext
  ): Promise<ExitDecision> {
    const pnlPct = (position.unrealizedPnl / Math.max(1, Math.abs(position.entryNetCost))) * 100;

    // Profit Target Check
    if (pnlPct >= this.config.takeProfitPercent) {
      return {
        shouldExit: true,
        reason: `Profit target reached (+${pnlPct.toFixed(1)}% vs. target ${this.config.takeProfitPercent}%)`,
        exitType: "PROFIT_TARGET",
        recommendedUrgency: "NORMAL",
      };
    }

    // Stop Loss Check
    if (pnlPct <= -this.config.stopLossPercent) {
      return {
        shouldExit: true,
        reason: `Stop loss breached (${pnlPct.toFixed(1)}% vs. stop -${this.config.stopLossPercent}%)`,
        exitType: "STOP_LOSS",
        recommendedUrgency: "HIGH",
      };
    }

    // Time to Expiry Check
    if (position.daysToExpiry <= 0.25) {
      return {
        shouldExit: true,
        reason: "Contract approaching immediate expiration (< 6 hours left)",
        exitType: "TIME_STOP",
        recommendedUrgency: "HIGH",
      };
    }

    return { shouldExit: false };
  }

  public async getRisk(proposal: TradeProposal, accountBalance: number): Promise<RiskAnalysis> {
    const reasons: string[] = [];
    const warnings: string[] = [];

    const worstCaseLoss =
      proposal.maxLoss === "UNLIMITED" ? proposal.requiredMargin : (proposal.maxLoss as number);

    const maxAllowedRisk = (accountBalance * this.config.riskPerTradePercent) / 100;

    if (worstCaseLoss > maxAllowedRisk && proposal.maxLoss !== "UNLIMITED") {
      reasons.push(
        `Max trade risk ($${worstCaseLoss.toFixed(2)}) exceeds allocated budget ($${maxAllowedRisk.toFixed(2)} - ${this.config.riskPerTradePercent}%)`
      );
    }

    if (proposal.requiredMargin > accountBalance * 0.8) {
      reasons.push(
        `Required margin ($${proposal.requiredMargin.toFixed(2)}) exceeds 80% total account balance`
      );
    }

    if (proposal.liquidityScore < this.config.minLiquidityScore) {
      warnings.push(
        `Liquidity score (${proposal.liquidityScore}) is below recommended threshold (${this.config.minLiquidityScore})`
      );
    }

    const marginUtilPct = accountBalance > 0 ? (proposal.requiredMargin / accountBalance) * 100 : 0;
    const accountRiskPct = accountBalance > 0 ? (worstCaseLoss / accountBalance) * 100 : 0;

    return {
      approved: reasons.length === 0,
      maxRiskAmount: worstCaseLoss,
      accountRiskPct: Math.round(accountRiskPct * 100) / 100,
      marginUtilizationPct: Math.round(marginUtilPct * 100) / 100,
      rejectionReasons: reasons,
      warnings,
    };
  }

  // --- Analytical Helpers for Derived Option Strategies ---

  protected aggregateGreeks(legs: OptionLeg[]): GreeksSummary {
    let delta = 0;
    let gamma = 0;
    let theta = 0;
    let vega = 0;
    let rho = 0;

    for (const leg of legs) {
      const multiplier = (leg.side === "BUY" ? 1 : -1) * leg.quantity;
      delta += (leg.delta || 0) * multiplier;
      gamma += (leg.gamma || 0) * multiplier;
      theta += (leg.theta || 0) * multiplier;
      vega += (leg.vega || 0) * multiplier;
      rho += (leg.rho || 0) * multiplier;
    }

    return {
      delta: Math.round(delta * 1000) / 1000,
      gamma: Math.round(gamma * 10000) / 10000,
      theta: Math.round(theta * 100) / 100,
      vega: Math.round(vega * 100) / 100,
      rho: Math.round(rho * 1000) / 1000,
    };
  }

  protected calculateNetDebitCredit(legs: OptionLeg[]): { netCost: number; isCredit: boolean } {
    let net = 0;
    for (const leg of legs) {
      const cost = leg.premium * leg.quantity;
      if (leg.side === "BUY") {
        net += cost; // Debit
      } else {
        net -= cost; // Credit
      }
    }
    return {
      netCost: Math.round(net * 100) / 100,
      isCredit: net < 0,
    };
  }

  protected generatePayoffGrid(
    spotPrice: number,
    legs: OptionLeg[],
    rangePct: number = 0.2,
    steps: number = 25
  ): StrategyPayoffPoint[] {
    const minPrice = spotPrice * (1 - rangePct);
    const maxPrice = spotPrice * (1 + rangePct);
    const stepSize = (maxPrice - minPrice) / steps;
    const points: StrategyPayoffPoint[] = [];

    const { netCost } = this.calculateNetDebitCredit(legs);

    for (let p = minPrice; p <= maxPrice; p += stepSize) {
      let expiryPayoff = 0;

      for (const leg of legs) {
        const isCall = leg.optionType === "CALL" || leg.optionType === "CE";
        const intrinsic = isCall ? Math.max(0, p - leg.strike) : Math.max(0, leg.strike - p);
        const positionMultiplier = leg.side === "BUY" ? 1 : -1;
        expiryPayoff += intrinsic * positionMultiplier * leg.quantity;
      }

      // Net PnL = Payoff - Initial Debit (+ Initial Credit)
      const pnl = expiryPayoff - netCost;
      points.push({ price: Math.round(p * 10) / 10, pnl: Math.round(pnl * 100) / 100 });
    }

    return points;
  }
}
