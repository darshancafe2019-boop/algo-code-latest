/**
 * QUANT.OS CENTRAL STRATEGY RISK ENGINE
 * =====================================
 * Authoritative risk and position sizing engine for Quant.OS.
 *
 * Core Rules:
 * 1. Strategies NEVER size positions independently.
 * 2. All 30 strategies send proposed trades (Entry, Stop, Target) to this central engine.
 * 3. Default: TRADING_MODE = "PAPER", LIVE_TRADING_ENABLED = false.
 * 4. Default risk: 0.5% per trade.
 * 5. Leverage CANNOT silently increase maximum account dollar risk.
 */

export interface RiskEngineConfig {
  tradingMode: "PAPER" | "LIVE";
  liveTradingEnabled: boolean;
  defaultRiskPctPerTrade: number; // e.g., 0.5%
  maxRiskPctPerTrade: number; // e.g., 2.0%
  maxAccountOpenRiskPct: number; // e.g., 6.0% total open risk
  maxSingleInstrumentNotionalPct: number; // e.g., 25.0% of equity
  maxSingleFamilyRiskPct: number; // e.g., 2.0%
  accountEquity: number;
  takerFeeRate: number; // e.g., 0.0005 (0.05%)
  makerFeeRate: number; // e.g., 0.0002 (0.02%)
  estimatedSlippagePct: number; // e.g., 0.0005 (0.05%)
  estimatedFundingRatePer8h: number; // e.g., 0.0001 (0.01%)
}

export const DEFAULT_RISK_CONFIG: RiskEngineConfig = {
  tradingMode: "PAPER",
  liveTradingEnabled: false,
  defaultRiskPctPerTrade: 0.5,
  maxRiskPctPerTrade: 2.0,
  maxAccountOpenRiskPct: 6.0,
  maxSingleInstrumentNotionalPct: 25.0,
  maxSingleFamilyRiskPct: 2.0,
  accountEquity: 100000.0, // Default $100k demo/paper equity
  takerFeeRate: 0.0005,
  makerFeeRate: 0.0002,
  estimatedSlippagePct: 0.0005,
  estimatedFundingRatePer8h: 0.0001,
};

export interface ProposedTradeOrder {
  strategyId: string;
  strategyNumber: string;
  strategyName: string;
  strategyVersion: string;
  instrument: string;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  requestedRiskPct?: number;
  leverage?: number;
}

export interface RiskEvaluationResult {
  approved: boolean;
  decision: "APPROVED" | "REDUCED" | "REJECTED";
  rejectionReason?: string;
  accountEquity: number;
  riskPct: number;
  maxLossAmount: number;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  stopDistanceAmount: number;
  stopDistancePct: number;
  targetDistanceAmount: number;
  targetDistancePct: number;
  rrRatio: number;
  positionSizeUnits: number;
  notionalValue: number;
  leverage: number;
  marginRequired: number;
  estimatedFeeAmount: number;
  estimatedSlippageAmount: number;
  totalOpenRiskPct: number;
  correlationExposureFactor: number;
  evaluatedAt: string;
}

export class StrategyRiskEngine {
  private config: RiskEngineConfig;

  constructor(config: Partial<RiskEngineConfig> = {}) {
    this.config = { ...DEFAULT_RISK_CONFIG, ...config };
  }

  public updateConfig(newConfig: Partial<RiskEngineConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): RiskEngineConfig {
    return { ...this.config };
  }

  /**
   * Authoritative position sizing and pre-trade risk evaluation.
   */
  public evaluateTradeRisk(
    proposed: ProposedTradeOrder,
    currentOpenRiskPct: number = 0.0
  ): RiskEvaluationResult {
    const {
      accountEquity,
      defaultRiskPctPerTrade,
      maxRiskPctPerTrade,
      maxAccountOpenRiskPct,
      maxSingleInstrumentNotionalPct,
      takerFeeRate,
      estimatedSlippagePct,
      tradingMode,
      liveTradingEnabled,
    } = this.config;

    const {
      entryPrice,
      stopPrice,
      targetPrice,
      direction,
      requestedRiskPct = defaultRiskPctPerTrade,
      leverage = 1,
    } = proposed;

    // 1. Safety Guard: Validate Live Trading
    if (tradingMode === "LIVE" && !liveTradingEnabled) {
      return this._buildRejection(
        proposed,
        "LIVE_TRADING_DISABLED: System is strictly locked to PAPER mode. Enable live trading in settings with explicit authorization."
      );
    }

    // 2. Validate price levels
    if (entryPrice <= 0 || stopPrice <= 0 || targetPrice <= 0) {
      return this._buildRejection(proposed, "INVALID_PRICES: Entry, Stop, and Target prices must be greater than zero.");
    }

    if (direction === "LONG") {
      if (stopPrice >= entryPrice) {
        return this._buildRejection(proposed, `INVALID_LONG_STOP: Stop price ($${stopPrice}) must be below Entry price ($${entryPrice}).`);
      }
      if (targetPrice <= entryPrice) {
        return this._buildRejection(proposed, `INVALID_LONG_TARGET: Target price ($${targetPrice}) must be above Entry price ($${entryPrice}).`);
      }
    } else {
      if (stopPrice <= entryPrice) {
        return this._buildRejection(proposed, `INVALID_SHORT_STOP: Stop price ($${stopPrice}) must be above Entry price ($${entryPrice}).`);
      }
      if (targetPrice >= entryPrice) {
        return this._buildRejection(proposed, `INVALID_SHORT_TARGET: Target price ($${targetPrice}) must be below Entry price ($${entryPrice}).`);
      }
    }

    // 3. Calculate stop distance
    const stopDistanceAmount = Math.abs(entryPrice - stopPrice);
    const stopDistancePct = (stopDistanceAmount / entryPrice) * 100;
    const targetDistanceAmount = Math.abs(targetPrice - entryPrice);
    const targetDistancePct = (targetDistanceAmount / entryPrice) * 100;
    const rrRatio = targetDistanceAmount / stopDistanceAmount;

    if (stopDistancePct < 0.1) {
      return this._buildRejection(proposed, `STOP_TOO_TIGHT: Stop distance (${stopDistancePct.toFixed(2)}%) is below minimum 0.10% threshold.`);
    }

    // 4. Calculate risk allocation
    let effectiveRiskPct = Math.min(requestedRiskPct, maxRiskPctPerTrade);
    let decision: "APPROVED" | "REDUCED" = "APPROVED";

    if (currentOpenRiskPct + effectiveRiskPct > maxAccountOpenRiskPct) {
      const remainingRiskRoom = Math.max(0, maxAccountOpenRiskPct - currentOpenRiskPct);
      if (remainingRiskRoom < 0.1) {
        return this._buildRejection(
          proposed,
          `MAX_OPEN_RISK_EXCEEDED: Total open risk is ${currentOpenRiskPct.toFixed(1)}%. Account max open risk limit is ${maxAccountOpenRiskPct.toFixed(1)}%.`
        );
      }
      effectiveRiskPct = remainingRiskRoom;
      decision = "REDUCED";
    }

    // Maximum dollar loss allowed on this trade
    const maxLossAmount = accountEquity * (effectiveRiskPct / 100);

    // 5. Position Size Calculation (Sizing by Stop Loss Distance)
    // Position Size Units = Max Dollar Loss / Stop Distance Per Unit
    const rawPositionUnits = maxLossAmount / stopDistanceAmount;
    const positionSizeUnits = Number(rawPositionUnits.toFixed(4));
    const notionalValue = Number((positionSizeUnits * entryPrice).toFixed(2));

    // Cap single instrument notional
    const maxNotionalAllowed = accountEquity * (maxSingleInstrumentNotionalPct / 100);
    let finalPositionUnits = positionSizeUnits;
    let finalNotional = notionalValue;

    if (notionalValue > maxNotionalAllowed) {
      finalNotional = maxNotionalAllowed;
      finalPositionUnits = Number((finalNotional / entryPrice).toFixed(4));
      decision = "REDUCED";
    }

    const effectiveLeverage = Math.max(1, leverage);
    const marginRequired = Number((finalNotional / effectiveLeverage).toFixed(2));
    const estimatedFeeAmount = Number((finalNotional * takerFeeRate * 2).toFixed(2)); // Round-trip fee
    const estimatedSlippageAmount = Number((finalNotional * estimatedSlippagePct).toFixed(2));

    return {
      approved: true,
      decision,
      accountEquity,
      riskPct: effectiveRiskPct,
      maxLossAmount: Number((finalPositionUnits * stopDistanceAmount).toFixed(2)),
      entryPrice,
      stopPrice,
      targetPrice,
      stopDistanceAmount,
      stopDistancePct,
      targetDistanceAmount,
      targetDistancePct,
      rrRatio: Number(rrRatio.toFixed(2)),
      positionSizeUnits: finalPositionUnits,
      notionalValue: finalNotional,
      leverage: effectiveLeverage,
      marginRequired,
      estimatedFeeAmount,
      estimatedSlippageAmount,
      totalOpenRiskPct: Number((currentOpenRiskPct + effectiveRiskPct).toFixed(2)),
      correlationExposureFactor: 1.0,
      evaluatedAt: new Date().toISOString(),
    };
  }

  private _buildRejection(proposed: ProposedTradeOrder, reason: string): RiskEvaluationResult {
    const stopDistance = Math.abs(proposed.entryPrice - proposed.stopPrice) || 0;
    return {
      approved: false,
      decision: "REJECTED",
      rejectionReason: reason,
      accountEquity: this.config.accountEquity,
      riskPct: 0,
      maxLossAmount: 0,
      entryPrice: proposed.entryPrice,
      stopPrice: proposed.stopPrice,
      targetPrice: proposed.targetPrice,
      stopDistanceAmount: stopDistance,
      stopDistancePct: proposed.entryPrice > 0 ? (stopDistance / proposed.entryPrice) * 100 : 0,
      targetDistanceAmount: Math.abs(proposed.targetPrice - proposed.entryPrice) || 0,
      targetDistancePct: 0,
      rrRatio: 0,
      positionSizeUnits: 0,
      notionalValue: 0,
      leverage: proposed.leverage || 1,
      marginRequired: 0,
      estimatedFeeAmount: 0,
      estimatedSlippageAmount: 0,
      totalOpenRiskPct: 0,
      correlationExposureFactor: 0,
      evaluatedAt: new Date().toISOString(),
    };
  }
}

export const strategyRiskEngine = new StrategyRiskEngine();
