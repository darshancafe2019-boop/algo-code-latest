/**
 * Central Indicator Engine
 * High-performance, memoized calculation engine for multi-symbol, multi-timeframe quantitative analytics.
 */

import {
  CandleData,
  IndicatorDefinition,
  IndicatorResult,
  OptionsDataFeed,
  ActiveIndicatorInstance,
} from "./types";
import { indicatorRegistry } from "./registry";

export interface ComputeOptions {
  closedCandleOnly?: boolean;
  symbol?: string;
  timeframe?: string;
  dataSource?: string;
}

export class IndicatorEngine {
  private static instance: IndicatorEngine;
  private cache: Map<string, { result: IndicatorResult<any>; timestamp: number; candleCount: number }> = new Map();
  private cacheTTLMs = 1500; // 1.5s cache for identical query states

  private constructor() {}

  public static getInstance(): IndicatorEngine {
    if (!IndicatorEngine.instance) {
      IndicatorEngine.instance = new IndicatorEngine();
    }
    return IndicatorEngine.instance;
  }

  /**
   * Generates a deterministic cache key for memoization.
   */
  private getCacheKey(
    indicatorId: string,
    symbol: string,
    timeframe: string,
    params: Record<string, any>,
    candleCount: number,
    closedCandleOnly: boolean
  ): string {
    const sortedParams = JSON.stringify(params || {});
    return `${indicatorId}:${symbol}:${timeframe}:${candleCount}:${closedCandleOnly}:${sortedParams}`;
  }

  /**
   * Compute a single indicator with memoization and safety checks.
   */
  public compute<T = Record<string, number | null>>(
    indicatorId: string,
    candles: CandleData[],
    params: Record<string, any> = {},
    optionsData?: OptionsDataFeed,
    options: ComputeOptions = {}
  ): IndicatorResult<T> {
    const symbol = options.symbol || "NIFTY";
    const timeframe = options.timeframe || "5m";
    const closedCandleOnly = options.closedCandleOnly ?? false;

    const def = indicatorRegistry.get(indicatorId);
    if (!def) {
      return {
        indicatorId,
        symbol,
        timeframe,
        series: [],
        latest: {} as T,
        status: "ERROR",
        timestamp: Date.now(),
        parameters: params,
        isValid: false,
        errorMessage: `Indicator '${indicatorId}' is not registered in IndicatorRegistry.`,
      };
    }

    // Handle closed candle mode
    const workingCandles =
      closedCandleOnly && candles.length > 1 ? candles.slice(0, candles.length - 1) : candles;

    // Check cache
    const cacheKey = this.getCacheKey(indicatorId, symbol, timeframe, params, workingCandles.length, closedCandleOnly);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTLMs && cached.candleCount === workingCandles.length) {
      return cached.result as IndicatorResult<T>;
    }

    try {
      const mergedParams = {
        ...Object.fromEntries(Object.entries(def.parameters).map(([k, v]) => [k, v.default])),
        ...params,
      };

      const result = def.calculate(workingCandles, mergedParams, optionsData);
      result.symbol = symbol;
      result.timeframe = timeframe;
      result.dataSource = options.dataSource || "CENTRAL_MARKET_DATA";

      // Store in cache
      this.cache.set(cacheKey, {
        result,
        timestamp: Date.now(),
        candleCount: workingCandles.length,
      });

      return result as IndicatorResult<T>;
    } catch (err: any) {
      console.error(`[IndicatorEngine] Calculation error in '${indicatorId}':`, err);
      return {
        indicatorId,
        symbol,
        timeframe,
        series: [],
        latest: {} as T,
        status: "ERROR",
        timestamp: Date.now(),
        parameters: params,
        isValid: false,
        errorMessage: err?.message || "Calculation failed",
      };
    }
  }

  /**
   * Compute a suite of active indicator instances.
   */
  public computeBatch(
    instances: ActiveIndicatorInstance[],
    candleMapByTimeframe: Record<string, CandleData[]>,
    symbol: string,
    optionsData?: OptionsDataFeed,
    options: ComputeOptions = {}
  ): Map<string, IndicatorResult<any>> {
    const results = new Map<string, IndicatorResult<any>>();

    for (const inst of instances) {
      if (!inst.enabled) continue;
      const tf = inst.timeframe || "5m";
      const candles = candleMapByTimeframe[tf] || candleMapByTimeframe["5m"] || [];

      const res = this.compute(
        inst.indicatorId,
        candles,
        inst.parameters,
        optionsData,
        { ...options, symbol, timeframe: tf }
      );
      results.set(inst.instanceId, res);
    }

    return results;
  }

  /**
   * Clear computation cache.
   */
  public clearCache(): void {
    this.cache.clear();
  }
}

export const indicatorEngine = IndicatorEngine.getInstance();
