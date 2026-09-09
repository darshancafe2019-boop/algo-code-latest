/**
 * Indicator Signal Service
 * Bridges Quantitative Indicators with Strategy Decision Engines (DTA, Volume Star, Options, Perps).
 */

import { CandleData, IndicatorResult, OptionsDataFeed, StrategyIndicatorRequirement } from "./types";
import { indicatorEngine } from "./engine";
import { IndicatorConfluenceEngine, ConfluenceReport } from "./confluence";

export class IndicatorSignalService {
  private static instance: IndicatorSignalService;

  private constructor() {}

  public static getInstance(): IndicatorSignalService {
    if (!IndicatorSignalService.instance) {
      IndicatorSignalService.instance = new IndicatorSignalService();
    }
    return IndicatorSignalService.instance;
  }

  /**
   * Evaluates strategy requirements against multi-timeframe candles.
   */
  public evaluateStrategyRequirements(
    requirements: StrategyIndicatorRequirement[],
    candleMapByTimeframe: Record<string, CandleData[]>,
    symbol: string,
    optionsData?: OptionsDataFeed
  ): {
    results: Map<string, IndicatorResult<any>>;
    confluence: ConfluenceReport;
    isSatisfied: boolean;
  } {
    const results = new Map<string, IndicatorResult<any>>();
    const resultsList: IndicatorResult<any>[] = [];

    for (const req of requirements) {
      const candles = candleMapByTimeframe[req.timeframe] || candleMapByTimeframe["5m"] || [];
      const res = indicatorEngine.compute(
        req.id,
        candles,
        req.parameters,
        optionsData,
        { symbol, timeframe: req.timeframe }
      );
      results.set(`${req.id}:${req.timeframe}`, res);
      resultsList.push(res);
    }

    const confluence = IndicatorConfluenceEngine.calculateConfluence(resultsList);
    const requiredOnly = requirements.filter((r) => !r.optional);
    const allRequiredValid = requiredOnly.every((r) => results.get(`${r.id}:${r.timeframe}`)?.isValid);

    return {
      results,
      confluence,
      isSatisfied: allRequiredValid,
    };
  }
}

export const indicatorSignalService = IndicatorSignalService.getInstance();
