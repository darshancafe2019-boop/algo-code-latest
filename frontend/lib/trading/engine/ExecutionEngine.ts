/**
 * Unified Options Execution Engine
 * ================================
 * Validates proposals with the RiskEngine, executes multi-leg orders atomically
 * via the BrokerAdapter, and initializes tracked positions in PositionManager.
 */

import {
  TradeProposal,
  ActiveOptionPosition,
  ExecutionMode,
} from "../strategies/base/StrategyTypes";
import { RiskEngine, AccountRiskLimits } from "./RiskEngine";
import { BrokerAdapter, defaultPaperBroker, MultiLegOrderResult } from "./BrokerAdapter";
import { globalPositionManager } from "./PositionManager";

export interface ExecutionResult {
  success: boolean;
  message: string;
  orderResult?: MultiLegOrderResult;
  position?: ActiveOptionPosition;
  rejectionReasons?: string[];
  executionMode: ExecutionMode;
  timestamp: string;
}

export class ExecutionEngine {
  private static instance: ExecutionEngine;
  private brokerAdapter: BrokerAdapter = defaultPaperBroker;
  private executionMode: ExecutionMode = "PAPER";

  private constructor() {}

  public static getInstance(): ExecutionEngine {
    if (!ExecutionEngine.instance) {
      ExecutionEngine.instance = new ExecutionEngine();
    }
    return ExecutionEngine.instance;
  }

  public setBrokerAdapter(adapter: BrokerAdapter): void {
    this.brokerAdapter = adapter;
  }

  public setExecutionMode(mode: ExecutionMode): void {
    if (mode === "LIVE") {
      console.warn("LIVE mode strictly blocked by authoritative safety gate. Defaulting to PAPER.");
      this.executionMode = "PAPER";
      return;
    }
    this.executionMode = "PAPER";
  }

  public getExecutionMode(): ExecutionMode {
    return this.executionMode;
  }

  /**
   * Execute a trade proposal through the unified risk-check and order lifecycle.
   */
  public async executeTrade(
    proposal: TradeProposal,
    riskLimits?: Partial<AccountRiskLimits>
  ): Promise<ExecutionResult> {
    const now = new Date().toISOString();

    // 1. Fetch current broker account state
    const account = await this.brokerAdapter.getAccount();

    const limits: AccountRiskLimits = {
      totalBalance: account.balance,
      availableMargin: account.availableMargin,
      dailyRealizedPnl: 0,
      maxDailyLossLimit: 2500.0,
      maxRiskPerTradePercent: 2.0,
      maxAccountMarginUtilizationPercent: 75.0,
      maxSimultaneousPositions: 6,
      maxSameUnderlyingPositions: 2,
      maxBidAskSpreadPercent: 5.0,
      minDaysToExpiry: 0.25,
      ...riskLimits,
    };

    // 2. Mandatory Risk Engine Validation
    const activePositions = globalPositionManager.getAllPositions();
    const riskReport = RiskEngine.validateTrade(proposal, limits, activePositions);

    if (!riskReport.approved) {
      proposal.validationStatus = "REJECTED";
      proposal.rejectionReasons = riskReport.rejectionReasons;

      return {
        success: false,
        message: `Trade rejected by Risk Engine: ${riskReport.rejectionReasons.join("; ")}`,
        rejectionReasons: riskReport.rejectionReasons,
        executionMode: this.executionMode,
        timestamp: now,
      };
    }

    proposal.validationStatus = "APPROVED";

    // 3. Dispatch Multi-Leg Order to Broker Adapter
    try {
      const orderResult = await this.brokerAdapter.placeMultiLegOrder(proposal);

      if (orderResult.status !== "FILLED") {
        return {
          success: false,
          message: `Broker failed to fill order for ${proposal.strategyName}`,
          orderResult,
          executionMode: this.executionMode,
          timestamp: now,
        };
      }

      // 4. Create Tracked Active Option Position
      const newPosition: ActiveOptionPosition = {
        positionId: `pos-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        strategyId: proposal.strategyId,
        strategyName: proposal.strategyName,
        underlying: proposal.underlying,
        executionMode: this.executionMode,
        state: "OPEN",
        legs: proposal.legs,
        entrySpotPrice: proposal.spotPrice,
        currentSpotPrice: proposal.spotPrice,
        entryNetCost: orderResult.filledNetPrice,
        currentNetValue: orderResult.filledNetPrice,
        unrealizedPnl: 0,
        realizedPnl: 0,
        roiPct: 0,
        aggregateGreeks: proposal.greeks,
        openedAt: now,
        updatedAt: now,
        breakevens: proposal.breakevens,
        maxProfit: proposal.maxProfit,
        maxLoss: proposal.maxLoss,
        expiryDate: proposal.legs[0]?.expiry || "",
        daysToExpiry: 7.0,
        exitHistory: [],
      };

      globalPositionManager.addPosition(newPosition);

      return {
        success: true,
        message: `Successfully executed ${proposal.strategyName} in ${this.executionMode} mode`,
        orderResult,
        position: newPosition,
        executionMode: this.executionMode,
        timestamp: now,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Execution exception: ${err.message}`,
        rejectionReasons: [err.message],
        executionMode: this.executionMode,
        timestamp: now,
      };
    }
  }
}

export const globalExecutionEngine = ExecutionEngine.getInstance();
