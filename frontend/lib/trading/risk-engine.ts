/**
 * Universal Server-Side Pre-Trade Risk Engine & Kill-Switch
 */
import { NormalizedOrder } from "../brokers/types";

export interface RiskCheckResult {
  passed: boolean;
  blockedReason?: string;
  code?: string;
}

export interface RiskLimits {
  maxPositionSize: number;
  maxOrderValue: number;
  maxDailyLoss: number;
  maxOpenOrders: number;
  allowLiveTrading: boolean;
  killSwitchActive: boolean;
}

export class UniversalRiskEngine {
  private static instance: UniversalRiskEngine | null = null;
  private limits: RiskLimits = {
    maxPositionSize: 10.0,
    maxOrderValue: 500000.0, // ₹5,00,000 / $500,000
    maxDailyLoss: 25000.0,
    maxOpenOrders: 20,
    allowLiveTrading: process.env.LIVE_TRADING_ENABLED === "true",
    killSwitchActive: false,
  };

  public static getInstance(): UniversalRiskEngine {
    if (!UniversalRiskEngine.instance) {
      UniversalRiskEngine.instance = new UniversalRiskEngine();
    }
    return UniversalRiskEngine.instance;
  }

  public setKillSwitch(active: boolean): void {
    this.limits.killSwitchActive = active;
  }

  public isKillSwitchActive(): boolean {
    return this.limits.killSwitchActive;
  }

  public validatePreTrade(order: NormalizedOrder, estimatedLtp?: number): RiskCheckResult {
    // 1. Emergency Kill Switch Check
    if (this.limits.killSwitchActive) {
      return {
        passed: false,
        code: "KILL_SWITCH_ACTIVE",
        blockedReason: "CRITICAL: Global Emergency Kill-Switch is active. All new order submissions are halted.",
      };
    }

    // 2. Quantity & Sizing Sanity
    if (!order.quantity || order.quantity <= 0) {
      return {
        passed: false,
        code: "INVALID_QUANTITY",
        blockedReason: `Order quantity (${order.quantity}) must be strictly greater than zero.`,
      };
    }

    if (order.quantity > this.limits.maxPositionSize) {
      return {
        passed: false,
        code: "MAX_POSITION_SIZE_EXCEEDED",
        blockedReason: `Order quantity ${order.quantity} exceeds maximum allowed position size (${this.limits.maxPositionSize}).`,
      };
    }

    // 3. Estimated Order Notional Value Check
    const refPrice = order.price || estimatedLtp || 0;
    if (refPrice > 0) {
      const notional = order.quantity * refPrice;
      if (notional > this.limits.maxOrderValue) {
        return {
          passed: false,
          code: "MAX_ORDER_VALUE_EXCEEDED",
          blockedReason: `Estimated order value ₹${notional.toLocaleString()} exceeds hard risk limit of ₹${this.limits.maxOrderValue.toLocaleString()}.`,
        };
      }
    }

    // 4. Live Trading Authorization
    const tradingMode = (process.env.TRADING_MODE || "PAPER").toUpperCase();
    if (tradingMode === "LIVE" && !this.limits.allowLiveTrading) {
      return {
        passed: false,
        code: "LIVE_TRADING_DISARMED",
        blockedReason: "Live trading is disarmed in platform settings. Set LIVE_TRADING_ENABLED=true to arm live execution.",
      };
    }

    return { passed: true };
  }
}

export const riskEngine = UniversalRiskEngine.getInstance();
