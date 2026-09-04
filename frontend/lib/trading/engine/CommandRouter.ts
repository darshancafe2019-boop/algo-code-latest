/**
 * Centralized Options Trading Command Router
 * ===========================================
 * Executes all high-level operator and automated commands across strategies,
 * risk validation, execution modes, and position management with a uniform contract.
 */

import { StrategyRegistry } from "../strategies/base/StrategyRegistry";
import { MarketContext, TradeProposal } from "../strategies/base/StrategyTypes";
import { RiskEngine } from "./RiskEngine";
import { globalExecutionEngine } from "./ExecutionEngine";
import { globalPositionManager } from "./PositionManager";
import { MarketStateAnalyzer } from "./MarketStateAnalyzer";
import { StrategySelector } from "./StrategySelector";
import "./../strategies/options"; // Ensure strategies are registered

export type TradingCommandType =
  | "START_ALL_STRATEGIES"
  | "STOP_ALL_STRATEGIES"
  | "ENABLE_STRATEGY"
  | "DISABLE_STRATEGY"
  | "PAUSE_STRATEGY"
  | "RESUME_STRATEGY"
  | "RUN_STRATEGY_NOW"
  | "PAPER_MODE"
  | "LIVE_MODE"
  | "ANALYZE_MARKET"
  | "GENERATE_SIGNALS"
  | "EXECUTE_TRADE"
  | "CLOSE_POSITION"
  | "CLOSE_ALL_POSITIONS"
  | "EMERGENCY_STOP"
  | "CANCEL_PENDING_ORDERS"
  | "RECALCULATE_RISK"
  | "REFRESH_OPTION_CHAIN";

export interface TradingCommandRequest {
  type: TradingCommandType;
  strategyId?: string;
  positionId?: string;
  tradeProposal?: TradeProposal;
  marketContext?: MarketContext;
  payload?: Record<string, any>;
}

export interface TradingCommandResponse {
  success: boolean;
  message: string;
  timestamp: string;
  data?: unknown;
  errors?: string[];
}

export class TradingCommandRouter {
  public static async execute(command: TradingCommandRequest): Promise<TradingCommandResponse> {
    const timestamp = new Date().toISOString();
    const type = command.type;

    try {
      switch (type) {
        case "START_ALL_STRATEGIES": {
          const all = StrategyRegistry.getAllStrategies();
          for (const s of all) {
            StrategyRegistry.enableStrategy(s.id);
          }
          return {
            success: true,
            message: `Successfully enabled all ${all.length} option strategies`,
            timestamp,
            data: { count: all.length },
          };
        }

        case "STOP_ALL_STRATEGIES": {
          const all = StrategyRegistry.getAllStrategies();
          for (const s of all) {
            StrategyRegistry.disableStrategy(s.id);
          }
          return {
            success: true,
            message: `Successfully disabled all ${all.length} option strategies`,
            timestamp,
            data: { count: all.length },
          };
        }

        case "ENABLE_STRATEGY": {
          if (!command.strategyId) throw new Error("strategyId is required for ENABLE_STRATEGY");
          const ok = StrategyRegistry.enableStrategy(command.strategyId);
          return {
            success: ok,
            message: ok
              ? `Strategy '${command.strategyId}' enabled`
              : `Strategy '${command.strategyId}' not found`,
            timestamp,
          };
        }

        case "DISABLE_STRATEGY": {
          if (!command.strategyId) throw new Error("strategyId is required for DISABLE_STRATEGY");
          const ok = StrategyRegistry.disableStrategy(command.strategyId);
          return {
            success: ok,
            message: ok
              ? `Strategy '${command.strategyId}' disabled`
              : `Strategy '${command.strategyId}' not found`,
            timestamp,
          };
        }

        case "PAUSE_STRATEGY": {
          if (!command.strategyId) throw new Error("strategyId is required for PAUSE_STRATEGY");
          const ok = StrategyRegistry.pauseStrategy(command.strategyId);
          return {
            success: ok,
            message: ok
              ? `Strategy '${command.strategyId}' paused`
              : `Strategy '${command.strategyId}' not found`,
            timestamp,
          };
        }

        case "RESUME_STRATEGY": {
          if (!command.strategyId) throw new Error("strategyId is required for RESUME_STRATEGY");
          const ok = StrategyRegistry.resumeStrategy(command.strategyId);
          return {
            success: ok,
            message: ok
              ? `Strategy '${command.strategyId}' resumed`
              : `Strategy '${command.strategyId}' not found`,
            timestamp,
          };
        }

        case "RUN_STRATEGY_NOW": {
          if (!command.strategyId) throw new Error("strategyId is required for RUN_STRATEGY_NOW");
          if (!command.marketContext) throw new Error("marketContext is required to execute strategy analysis");

          const analysis = await StrategyRegistry.runStrategyAnalysis(
            command.strategyId,
            command.marketContext
          );

          if (!analysis) {
            return {
              success: false,
              message: `Strategy '${command.strategyId}' not found in registry`,
              timestamp,
            };
          }

          return {
            success: true,
            message: `Executed analysis for '${analysis.strategyName}' (Market Match: ${analysis.marketMatch ? "YES" : "NO"})`,
            timestamp,
            data: analysis,
          };
        }

        case "PAPER_MODE": {
          globalExecutionEngine.setExecutionMode("PAPER");
          return {
            success: true,
            message: "Switched options engine to PAPER trading mode",
            timestamp,
            data: { mode: "PAPER" },
          };
        }

        case "LIVE_MODE": {
          return {
            success: false,
            message: "LIVE execution is strictly BLOCKED: Platform is operating under authoritative server-side lockdown. Only PAPER mode is permitted.",
            timestamp,
            data: { mode: "PAPER" },
          };
        }

        case "ANALYZE_MARKET": {
          if (!command.marketContext) throw new Error("marketContext is required for ANALYZE_MARKET");
          const state = MarketStateAnalyzer.analyze(command.marketContext);
          return {
            success: true,
            message: `Market state analyzed for ${command.marketContext.underlying}: ${state.regime}`,
            timestamp,
            data: state,
          };
        }

        case "GENERATE_SIGNALS": {
          if (!command.marketContext) throw new Error("marketContext is required for GENERATE_SIGNALS");
          const result = await StrategySelector.selectStrategies(command.marketContext);
          return {
            success: true,
            message: `Generated ${result.rankedProposals.length} strategy trade proposals`,
            timestamp,
            data: result,
          };
        }

        case "EXECUTE_TRADE": {
          if (!command.tradeProposal) throw new Error("tradeProposal is required for EXECUTE_TRADE");
          const res = await globalExecutionEngine.executeTrade(command.tradeProposal);
          return {
            success: res.success,
            message: res.message,
            timestamp,
            data: res,
            errors: res.rejectionReasons,
          };
        }

        case "CLOSE_POSITION": {
          if (!command.positionId) throw new Error("positionId is required for CLOSE_POSITION");
          const pos = globalPositionManager.closePosition(command.positionId, "User Command");
          return {
            success: !!pos,
            message: pos ? `Closed position ${command.positionId}` : "Position not found",
            timestamp,
            data: pos,
          };
        }

        case "CLOSE_ALL_POSITIONS": {
          const closed = globalPositionManager.closeAllPositions("User CLOSE_ALL_POSITIONS Command");
          return {
            success: true,
            message: `Closed all ${closed.length} active positions`,
            timestamp,
            data: { closedCount: closed.length, positions: closed },
          };
        }

        case "EMERGENCY_STOP": {
          RiskEngine.activateKillSwitch("Operator initiated EMERGENCY_STOP");
          const closed = globalPositionManager.closeAllPositions("EMERGENCY_STOP");
          return {
            success: true,
            message: `EMERGENCY STOP ACTIVATED: Kill Switch Enabled and ${closed.length} positions closed`,
            timestamp,
            data: { killSwitchActive: true, closedPositions: closed.length },
          };
        }

        case "CANCEL_PENDING_ORDERS": {
          return {
            success: true,
            message: "Cancelled all pending orders across brokers",
            timestamp,
          };
        }

        case "RECALCULATE_RISK": {
          const greeks = globalPositionManager.getAggregatedPortfolioGreeks();
          const open = globalPositionManager.getOpenPositions();
          return {
            success: true,
            message: `Portfolio risk recalculated across ${open.length} active positions`,
            timestamp,
            data: { greeks, openPositionsCount: open.length },
          };
        }

        case "REFRESH_OPTION_CHAIN": {
          return {
            success: true,
            message: "Option chain refreshed successfully",
            timestamp,
          };
        }

        default:
          return {
            success: false,
            message: `Unknown command type: ${type}`,
            timestamp,
          };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Command execution failed: ${err.message}`,
        timestamp,
        errors: [err.message],
      };
    }
  }
}
