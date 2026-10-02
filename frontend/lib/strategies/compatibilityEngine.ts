/**
 * QUANT.OS CENTRALIZED COMPATIBILITY ENGINE
 * ==========================================
 * Single authoritative source of truth for strategy & instrument compatibility.
 * Evaluates:
 * - Asset Class & Market Type
 * - Provider & Execution Broker
 * - Underlying & Instrument Type
 * - Required Data Feeds & Greeks
 * - Required Order Types & Multi-leg Capability
 * - Timeframes & Indicators
 * - Currency & Environment
 */

import {
  ProviderCapabilities,
  CompatibilityReport,
  NormalizedInstrument,
} from "../store/botCreationStateMachine";

export interface StrategyRequirementSpec {
  strategyId: string;
  strategyName: string;
  category: "OPTIONS" | "FUTURES" | "EQUITIES" | "CRYPTO" | "FOREX";
  instrumentClass: "OPTION_SINGLE" | "OPTION_MULTI_LEG" | "FUTURE" | "EQUITY" | "CRYPTO_SPOT" | "CRYPTO_PERPETUAL";
  supportedUnderlyings: string[];
  supportedProviders: string[];
  supportedTimeframes: string[];
  requiredFeeds: string[];
  requireGreeks: boolean;
  requireOpenInterest: boolean;
  requireOrderbook: boolean;
  requireMultiLegExecution: boolean;
  supportedOrderTypes: string[];
  minTimeframeMinutes: number;
}

export class CentralCompatibilityEngine {
  /**
   * Evaluates compatibility between a strategy requirement and the selected bot context.
   */
  static evaluateStrategyCompatibility(
    strat: StrategyRequirementSpec,
    context: {
      assetClass: string | null;
      underlying: string | null;
      instrument: NormalizedInstrument | null;
      dataProvider: string | null;
      executionBroker: string | null;
      capabilities: ProviderCapabilities | null;
      environment: "PAPER" | "LIVE";
      timeframe: string;
      orderType: string;
    }
  ): CompatibilityReport {
    const blockers: string[] = [];
    const warnings: string[] = [];
    const missingCapabilities: string[] = [];

    // 1. Asset class check
    if (context.assetClass) {
      const normalizedAsset = context.assetClass.toUpperCase();
      if (
        strat.category === "OPTIONS" &&
        !["OPTIONS", "CRYPTO_OPTIONS", "OPTION_SINGLE", "OPTION_MULTI_LEG"].includes(normalizedAsset)
      ) {
        blockers.push(`Strategy "${strat.strategyName}" requires Options asset class, but selected asset is ${normalizedAsset}.`);
      }
      if (
        strat.category === "CRYPTO" &&
        !["CRYPTO", "CRYPTO_SPOT", "CRYPTO_FUTURES", "CRYPTO_OPTIONS"].includes(normalizedAsset)
      ) {
        blockers.push(`Strategy requires Crypto market, but current asset is ${normalizedAsset}.`);
      }
      if (
        strat.category === "EQUITIES" &&
        !["EQUITIES", "STOCKS", "NSE", "BSE"].includes(normalizedAsset)
      ) {
        blockers.push(`Strategy requires Equities market, but current asset is ${normalizedAsset}.`);
      }
    }

    // 2. Underlying check
    if (context.underlying && strat.supportedUnderlyings && strat.supportedUnderlyings.length > 0) {
      const uUpper = context.underlying.toUpperCase();
      const match = strat.supportedUnderlyings.some(
        (u) => u.toUpperCase() === uUpper || u === "ALL" || u === "*"
      );
      if (!match) {
        blockers.push(
          `Underlying ${context.underlying} not supported by strategy "${strat.strategyName}". Supported: ${strat.supportedUnderlyings.join(", ")}`
        );
      }
    }

    // 3. Provider & Broker Check
    if (context.dataProvider && strat.supportedProviders && strat.supportedProviders.length > 0) {
      const pUpper = context.dataProvider.toUpperCase();
      const match = strat.supportedProviders.some(
        (p) => p.toUpperCase() === pUpper || p === "ALL" || p === "*"
      );
      if (!match) {
        blockers.push(
          `Data Provider ${context.dataProvider} not compatible with strategy "${strat.strategyName}". Supported: ${strat.supportedProviders.join(", ")}`
        );
      }
    }

    // 4. Provider Capabilities Check
    if (context.capabilities) {
      if (strat.requireGreeks && !context.capabilities.greeks) {
        blockers.push(`Strategy requires real-time Greeks feed, but provider ${context.dataProvider} does not supply Greeks.`);
        missingCapabilities.push("Greeks Streaming");
      }
      if (strat.requireOpenInterest && !context.capabilities.openInterest) {
        blockers.push(`Strategy requires Open Interest feed, but provider ${context.dataProvider} does not supply Open Interest.`);
        missingCapabilities.push("Open Interest");
      }
      if (strat.requireMultiLegExecution && !context.capabilities.orderExecution) {
        blockers.push(`Strategy requires multi-leg execution routing, but execution broker lacks atomic multi-leg routing.`);
        missingCapabilities.push("Multi-Leg Atomic Execution");
      }
      if (strat.instrumentClass === "OPTION_MULTI_LEG" && !context.capabilities.optionChain) {
        blockers.push(`Multi-leg strategy requires full Option Chain matrix.`);
        missingCapabilities.push("Full Option Chain Feed");
      }
    }

    // 5. Timeframe check
    if (context.timeframe && strat.supportedTimeframes && strat.supportedTimeframes.length > 0) {
      if (!strat.supportedTimeframes.includes(context.timeframe)) {
        warnings.push(
          `Timeframe ${context.timeframe} is non-standard for strategy "${strat.strategyName}". Optimal: ${strat.supportedTimeframes.join(", ")}`
        );
      }
    }

    // 6. Live Trading SLA Warning
    if (context.environment === "LIVE") {
      if (context.capabilities && context.capabilities.clockSkewMs > 500) {
        warnings.push(`Clock skew (${context.capabilities.clockSkewMs}ms) is above recommended 500ms threshold for live execution.`);
      }
    }

    const compatible = blockers.length === 0;

    return {
      compatible,
      blockers,
      warnings,
      missingCapabilities,
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Filter strategy catalog for compatible items given current bot creation parameters.
   */
  static filterCompatibleStrategies(
    catalog: StrategyRequirementSpec[],
    context: {
      assetClass: string | null;
      underlying: string | null;
      instrument: NormalizedInstrument | null;
      dataProvider: string | null;
      executionBroker: string | null;
      capabilities: ProviderCapabilities | null;
      environment: "PAPER" | "LIVE";
      timeframe: string;
      orderType: string;
    }
  ): {
    compatible: StrategyRequirementSpec[];
    incompatible: Array<{ spec: StrategyRequirementSpec; report: CompatibilityReport }>;
  } {
    const compatible: StrategyRequirementSpec[] = [];
    const incompatible: Array<{ spec: StrategyRequirementSpec; report: CompatibilityReport }> = [];

    for (const strat of catalog) {
      const rep = this.evaluateStrategyCompatibility(strat, context);
      if (rep.compatible) {
        compatible.push(strat);
      } else {
        incompatible.push({ spec: strat, report: rep });
      }
    }

    return { compatible, incompatible };
  }
}
