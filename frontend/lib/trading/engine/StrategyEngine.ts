/**
 * Unified Options Trading Strategy Engine
 * ========================================
 * High-level orchestration engine uniting Market Analysis,
 * Strategy Selection, Risk Validation, Atomic Execution, and Position Lifecycle.
 */

import { StrategyRegistry } from "../strategies/base/StrategyRegistry";
import { MarketContext, TradeProposal } from "../strategies/base/StrategyTypes";
import { MarketStateAnalyzer, AnalyzedMarketState } from "./MarketStateAnalyzer";
import { StrategySelector, StrategySelectionResult } from "./StrategySelector";
import { RiskEngine } from "./RiskEngine";
import { globalExecutionEngine, ExecutionResult } from "./ExecutionEngine";
import { globalPositionManager, PositionManager } from "./PositionManager";
import { TradingCommandRouter } from "./CommandRouter";
import "./../strategies/options"; // Ensure all 17 strategies are registered

export interface OptionsEngineTelemetry {
  operatingMode: "PAPER" | "LIVE";
  killSwitchActive: boolean;
  totalRegisteredStrategies: number;
  enabledStrategiesCount: number;
  openPositionsCount: number;
  portfolioGreeks: { delta: number; gamma: number; theta: number; vega: number };
  timestamp: string;
}

export class StrategyEngine {
  private static instance: StrategyEngine;
  private isAutoTradingEnabled: boolean = false;

  private constructor() {}

  public static getInstance(): StrategyEngine {
    if (!StrategyEngine.instance) {
      StrategyEngine.instance = new StrategyEngine();
    }
    return StrategyEngine.instance;
  }

  public setAutoTrading(enabled: boolean): void {
    this.isAutoTradingEnabled = enabled;
  }

  public isAutoTrading(): boolean {
    return this.isAutoTradingEnabled;
  }

  /**
   * Run the complete autonomous options cycle:
   * 1. Analyze Market State
   * 2. Select & Rank Strategies
   * 3. Validate Top Proposal with Risk Engine
   * 4. Optionally Auto-Execute (if configured)
   * 5. Evaluate Exits on Active Positions
   */
  public async runFullCycle(context: MarketContext): Promise<{
    analyzedState: AnalyzedMarketState;
    selectionResult: StrategySelectionResult;
    topProposal?: TradeProposal;
    executionResult?: ExecutionResult;
    exitEvaluations: any[];
    telemetry: OptionsEngineTelemetry;
  }> {
    // 1. Ingest and Analyze Market State
    const analyzedState = MarketStateAnalyzer.analyze(context);

    // 2. Select & Rank Matching Strategies
    const selectionResult = await StrategySelector.selectStrategies(context);
    const topProposal = selectionResult.primaryRecommendation;

    let executionResult: ExecutionResult | undefined;

    // 3. Auto-Execution (if enabled and proposal is highly confident)
    if (this.isAutoTradingEnabled && topProposal && topProposal.confidence >= 75) {
      executionResult = await globalExecutionEngine.executeTrade(topProposal);
    }

    // 4. Evaluate Exits on Active Positions
    const exitEvaluations = await globalPositionManager.evaluateExits(context);

    // 5. Update Position Market Prices
    globalPositionManager.updateMarketPrices(context.underlying, context.spotPrice);

    return {
      analyzedState,
      selectionResult,
      topProposal,
      executionResult,
      exitEvaluations,
      telemetry: this.getTelemetry(),
    };
  }

  public getTelemetry(): OptionsEngineTelemetry {
    return {
      operatingMode: globalExecutionEngine.getExecutionMode(),
      killSwitchActive: RiskEngine.isKillSwitchActive(),
      totalRegisteredStrategies: StrategyRegistry.getAllStrategies().length,
      enabledStrategiesCount: StrategyRegistry.getEnabledStrategies().length,
      openPositionsCount: globalPositionManager.getOpenPositions().length,
      portfolioGreeks: globalPositionManager.getAggregatedPortfolioGreeks(),
      timestamp: new Date().toISOString(),
    };
  }
}

export const globalStrategyEngine = StrategyEngine.getInstance();
export {
  StrategyRegistry,
  MarketStateAnalyzer,
  StrategySelector,
  RiskEngine,
  globalExecutionEngine,
  globalPositionManager,
  TradingCommandRouter,
};
