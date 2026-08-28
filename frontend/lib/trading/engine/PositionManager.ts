/**
 * Options Position Manager
 * ========================
 * Continuously tracks, updates, and monitors active multi-leg option positions
 * as composite risk units with real-time Greeks drift, P&L, and exit triggers.
 */

import {
  ActiveOptionPosition,
  GreeksSummary,
  ExitDecision,
  AdjustmentDecision,
  MarketContext,
} from "../strategies/base/StrategyTypes";
import { StrategyRegistry } from "../strategies/base/StrategyRegistry";

export class PositionManager {
  private static instance: PositionManager;
  private positions: Map<string, ActiveOptionPosition> = new Map();

  private constructor() {}

  public static getInstance(): PositionManager {
    if (!PositionManager.instance) {
      PositionManager.instance = new PositionManager();
    }
    return PositionManager.instance;
  }

  public addPosition(position: ActiveOptionPosition): void {
    this.positions.set(position.positionId, position);
  }

  public getPosition(positionId: string): ActiveOptionPosition | undefined {
    return this.positions.get(positionId);
  }

  public getAllPositions(): ActiveOptionPosition[] {
    return Array.from(this.positions.values());
  }

  public getOpenPositions(): ActiveOptionPosition[] {
    return Array.from(this.positions.values()).filter((p) => p.state === "OPEN");
  }

  /**
   * Update real-time market spot and option contract quotes across all open positions.
   */
  public updateMarketPrices(
    underlying: string,
    spotPrice: number,
    optionQuotes: Record<string, number> = {}
  ): void {
    const now = new Date();

    for (const pos of this.positions.values()) {
      if (pos.underlying !== underlying || pos.state !== "OPEN") continue;

      pos.currentSpotPrice = spotPrice;
      pos.updatedAt = now.toISOString();

      // Recalculate days to expiry
      if (pos.expiryDate) {
        const expDate = new Date(pos.expiryDate);
        pos.daysToExpiry = Math.max(0, (expDate.getTime() - now.getTime()) / (1000 * 86400));
      }

      // Re-evaluate net value across all legs
      let currentNetValue = 0;
      for (const leg of pos.legs) {
        const quote = optionQuotes[leg.symbol] || leg.premium;
        if (leg.side === "BUY") {
          currentNetValue += quote * leg.quantity;
        } else {
          currentNetValue -= quote * leg.quantity;
        }
      }

      pos.currentNetValue = Math.round(currentNetValue * 100) / 100;
      pos.unrealizedPnl = Math.round((pos.currentNetValue - pos.entryNetCost) * 100) / 100;

      const baseCost = Math.max(1, Math.abs(pos.entryNetCost));
      pos.roiPct = Math.round((pos.unrealizedPnl / baseCost) * 10000) / 100;
    }
  }

  /**
   * Check all open positions against their respective strategy exit conditions.
   */
  public async evaluateExits(
    context: MarketContext
  ): Promise<Array<{ positionId: string; decision: ExitDecision }>> {
    const exits: Array<{ positionId: string; decision: ExitDecision }> = [];

    for (const pos of this.getOpenPositions()) {
      if (pos.underlying !== context.underlying) continue;

      const strategy = StrategyRegistry.getStrategy(pos.strategyId);
      if (strategy) {
        try {
          const decision = await strategy.shouldExit(pos, context);
          if (decision.shouldExit) {
            exits.push({ positionId: pos.positionId, decision });
          }
        } catch (err) {
          console.error(`[PositionManager] Error evaluating exit for ${pos.positionId}:`, err);
        }
      }
    }

    return exits;
  }

  /**
   * Close a specific active position.
   */
  public closePosition(
    positionId: string,
    reason: string = "Manual Close",
    realizedPnl?: number
  ): ActiveOptionPosition | null {
    const pos = this.positions.get(positionId);
    if (!pos) return null;

    pos.state = "CLOSED";
    pos.closedAt = new Date().toISOString();
    pos.realizedPnl = realizedPnl !== undefined ? realizedPnl : pos.unrealizedPnl;
    pos.unrealizedPnl = 0;

    if (!pos.exitHistory) pos.exitHistory = [];
    pos.exitHistory.push({
      timestamp: pos.closedAt,
      reason,
      pnl: pos.realizedPnl,
    });

    return pos;
  }

  /**
   * Emergency close all open positions.
   */
  public closeAllPositions(reason: string = "EMERGENCY_HALT"): ActiveOptionPosition[] {
    const closed: ActiveOptionPosition[] = [];
    for (const pos of this.getOpenPositions()) {
      const closedPos = this.closePosition(pos.positionId, reason);
      if (closedPos) closed.push(closedPos);
    }
    return closed;
  }

  /**
   * Aggregate total portfolio Greeks across all open positions.
   */
  public getAggregatedPortfolioGreeks(): GreeksSummary {
    let delta = 0;
    let gamma = 0;
    let theta = 0;
    let vega = 0;
    let rho = 0;

    for (const pos of this.getOpenPositions()) {
      delta += pos.aggregateGreeks.delta || 0;
      gamma += pos.aggregateGreeks.gamma || 0;
      theta += pos.aggregateGreeks.theta || 0;
      vega += pos.aggregateGreeks.vega || 0;
      rho += pos.aggregateGreeks.rho || 0;
    }

    return {
      delta: Math.round(delta * 1000) / 1000,
      gamma: Math.round(gamma * 10000) / 10000,
      theta: Math.round(theta * 100) / 100,
      vega: Math.round(vega * 100) / 100,
      rho: Math.round(rho * 1000) / 1000,
    };
  }
}

export const globalPositionManager = PositionManager.getInstance();
