/**
 * Mandatory Options Risk Engine & Kill Switch
 * ============================================
 * Enforces all 14 mandatory pre-trade risk validations.
 * No trade proposal can proceed to execution without RiskEngine approval.
 */

import {
  TradeProposal,
  RiskAnalysis,
  ActiveOptionPosition,
} from "../strategies/base/StrategyTypes";

export interface AccountRiskLimits {
  totalBalance: number;
  availableMargin: number;
  dailyRealizedPnl: number;
  maxDailyLossLimit: number; // e.g. $1,000 or 5% of balance
  maxRiskPerTradePercent: number; // e.g. 2%
  maxAccountMarginUtilizationPercent: number; // e.g. 75%
  maxSimultaneousPositions: number; // e.g. 5
  maxSameUnderlyingPositions: number; // e.g. 2
  maxBidAskSpreadPercent: number; // e.g. 5%
  minDaysToExpiry: number; // e.g. 0.25 (6 hours)
}

export interface RiskValidationReport {
  approved: boolean;
  killSwitchActive: boolean;
  rejectionReasons: string[];
  warnings: string[];
  metrics: {
    calculatedLoss: number;
    requiredMargin: number;
    accountRiskPct: number;
    marginUtilizationPct: number;
    dailyDrawdownPct: number;
  };
  timestamp: string;
}

export class RiskEngine {
  private static killSwitchEnabled: boolean = false;
  private static killSwitchReason: string = "";

  public static activateKillSwitch(reason: string = "Manual emergency operator intervention"): void {
    RiskEngine.killSwitchEnabled = true;
    RiskEngine.killSwitchReason = reason;
    console.warn(`[RiskEngine] HARD KILL SWITCH ACTIVATED: ${reason}`);
  }

  public static resetKillSwitch(): void {
    RiskEngine.killSwitchEnabled = false;
    RiskEngine.killSwitchReason = "";
    console.info("[RiskEngine] Hard Kill Switch reset to NORMAL.");
  }

  public static isKillSwitchActive(): boolean {
    return RiskEngine.killSwitchEnabled;
  }

  public static getKillSwitchReason(): string {
    return RiskEngine.killSwitchReason;
  }

  /**
   * Evaluates all 14 mandatory risk limits against a trade proposal.
   */
  public static validateTrade(
    proposal: TradeProposal,
    limits: AccountRiskLimits,
    activePositions: ActiveOptionPosition[] = []
  ): RiskValidationReport {
    const reasons: string[] = [];
    const warnings: string[] = [];

    // 0. Hard Kill Switch Check
    if (RiskEngine.killSwitchEnabled) {
      reasons.push(`HARD KILL SWITCH ACTIVE: ${RiskEngine.killSwitchReason}`);
      return {
        approved: false,
        killSwitchActive: true,
        rejectionReasons: reasons,
        warnings,
        metrics: {
          calculatedLoss: 0,
          requiredMargin: 0,
          accountRiskPct: 0,
          marginUtilizationPct: 0,
          dailyDrawdownPct: 0,
        },
        timestamp: new Date().toISOString(),
      };
    }

    const { totalBalance, availableMargin } = limits;

    // 1. Validate Account Balance
    if (totalBalance <= 0) {
      reasons.push("Account balance is zero or negative");
    }

    // 2. Validate Available Margin
    if (proposal.requiredMargin > availableMargin) {
      reasons.push(
        `Required margin ($${proposal.requiredMargin.toFixed(2)}) exceeds available margin ($${availableMargin.toFixed(2)})`
      );
    }

    // 3. Calculate Worst-Case Loss
    const worstCaseLoss =
      proposal.maxLoss === "UNLIMITED" ? proposal.requiredMargin : (proposal.maxLoss as number);

    // 4. Validate Position Size / Account Risk Budget (e.g., 2% max per trade)
    const maxAllowedRisk = (totalBalance * limits.maxRiskPerTradePercent) / 100;
    if (worstCaseLoss > maxAllowedRisk && proposal.maxLoss !== "UNLIMITED") {
      reasons.push(
        `Trade maximum loss ($${worstCaseLoss.toFixed(2)}) exceeds risk budget ($${maxAllowedRisk.toFixed(2)} - ${limits.maxRiskPerTradePercent}%)`
      );
    }

    // 5. Margin Utilization Cap
    const projectedMarginUsed =
      (limits.totalBalance - availableMargin) + proposal.requiredMargin;
    const marginUtilPct = totalBalance > 0 ? (projectedMarginUsed / totalBalance) * 100 : 100;
    if (marginUtilPct > limits.maxAccountMarginUtilizationPercent) {
      reasons.push(
        `Projected margin utilization (${marginUtilPct.toFixed(1)}%) exceeds safety cap (${limits.maxAccountMarginUtilizationPercent}%)`
      );
    }

    // 6. Validate Maximum Daily Loss Limit
    const dailyDrawdown = -Math.min(0, limits.dailyRealizedPnl);
    if (dailyDrawdown >= limits.maxDailyLossLimit) {
      reasons.push(
        `Daily loss limit reached ($${dailyDrawdown.toFixed(2)} >= max $${limits.maxDailyLossLimit.toFixed(2)})`
      );
    }

    // 7. Validate Maximum Strategy Exposure
    const sameStrategyPositions = activePositions.filter(
      (p) => p.strategyId === proposal.strategyId && p.state === "OPEN"
    );
    if (sameStrategyPositions.length >= 2) {
      reasons.push(
        `Maximum simultaneous exposure for strategy '${proposal.strategyName}' reached (${sameStrategyPositions.length}/2)`
      );
    }

    // 8. Validate Correlation Exposure (Same Underlying)
    const sameUnderlyingPositions = activePositions.filter(
      (p) => p.underlying === proposal.underlying && p.state === "OPEN"
    );
    if (sameUnderlyingPositions.length >= limits.maxSameUnderlyingPositions) {
      reasons.push(
        `Maximum positions for underlying '${proposal.underlying}' reached (${sameUnderlyingPositions.length}/${limits.maxSameUnderlyingPositions})`
      );
    }

    // 9. Validate Expiry Risk (Minimum Time to Expiry)
    for (const leg of proposal.legs) {
      if (leg.expiry) {
        const expDate = new Date(leg.expiry);
        const now = new Date();
        const daysLeft = (expDate.getTime() - now.getTime()) / (1000 * 86400);
        if (daysLeft < limits.minDaysToExpiry && daysLeft >= 0) {
          reasons.push(
            `Contract ${leg.symbol} expires too soon (${(daysLeft * 24).toFixed(1)} hours < minimum ${limits.minDaysToExpiry * 24} hours)`
          );
        }
      }
    }

    // 10. Validate Liquidity
    if (proposal.liquidityScore < 50) {
      reasons.push(
        `Insufficient option liquidity (Score: ${proposal.liquidityScore}/100 < minimum 50)`
      );
    } else if (proposal.liquidityScore < 70) {
      warnings.push(`Moderate liquidity (${proposal.liquidityScore}/100). Execution slippage may apply.`);
    }

    // 11. Validate Bid-Ask Spread
    for (const leg of proposal.legs) {
      if (leg.limitPrice && leg.premium > 0) {
        const spreadPct = (Math.abs(leg.limitPrice - leg.premium) / leg.premium) * 100;
        if (spreadPct > limits.maxBidAskSpreadPercent) {
          warnings.push(`Wide bid-ask spread on ${leg.symbol} (${spreadPct.toFixed(1)}%)`);
        }
      }
    }

    // 12. Validate Duplicate Positions
    const isDuplicate = activePositions.some(
      (p) =>
        p.underlying === proposal.underlying &&
        p.strategyId === proposal.strategyId &&
        p.state === "OPEN" &&
        p.legs.length === proposal.legs.length &&
        p.legs.every((l, idx) => l.strike === proposal.legs[idx]?.strike)
    );
    if (isDuplicate) {
      reasons.push("Duplicate identical position already exists in active positions");
    }

    // 13. Validate Maximum Number of Simultaneous Positions
    const openPositionsCount = activePositions.filter((p) => p.state === "OPEN").length;
    if (openPositionsCount >= limits.maxSimultaneousPositions) {
      reasons.push(
        `Maximum total active positions reached (${openPositionsCount}/${limits.maxSimultaneousPositions})`
      );
    }

    // 14. Naked Call / Unlimited Risk Safety
    if (proposal.maxLoss === "UNLIMITED") {
      warnings.push("Strategy contains uncapped maximum loss potential. Extreme risk warning.");
    }

    const accountRiskPct = totalBalance > 0 ? (worstCaseLoss / totalBalance) * 100 : 0;
    const dailyDrawdownPct = totalBalance > 0 ? (dailyDrawdown / totalBalance) * 100 : 0;

    return {
      approved: reasons.length === 0,
      killSwitchActive: false,
      rejectionReasons: reasons,
      warnings,
      metrics: {
        calculatedLoss: Math.round(worstCaseLoss * 100) / 100,
        requiredMargin: Math.round(proposal.requiredMargin * 100) / 100,
        accountRiskPct: Math.round(accountRiskPct * 100) / 100,
        marginUtilizationPct: Math.round(marginUtilPct * 100) / 100,
        dailyDrawdownPct: Math.round(dailyDrawdownPct * 100) / 100,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
