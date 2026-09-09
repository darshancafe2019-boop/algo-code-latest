import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";
import { calculateSMAValues } from "../trend/sma";

export interface StdDevResultValue {
  stdev: number | null;
}

export const StandardDeviation: IndicatorDefinition<StdDevResultValue> = {
  id: "standard_deviation",
  name: "Standard Deviation",
  shortName: "StdDev",
  category: "VOLATILITY",
  description: "Statistical measurement of price volatility computing dispersion from the mean.",
  version: "1.0.0",
  overlay: false,
  requiredCandles: 20,
  supportedTimeframes: ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"],
  parameters: {
    period: {
      name: "period",
      label: "Period",
      type: "number",
      default: 20,
      min: 2,
      max: 100,
    },
  },
  calculate: (candles, params) => {
    const start = performance.now();
    const period = Number(params?.period) || 20;

    if (!candles || candles.length < period) {
      return {
        indicatorId: "standard_deviation",
        symbol: "",
        timeframe: "",
        series: [],
        latest: { stdev: null },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: { period },
        isValid: false,
      };
    }

    const closes = candles.map((c) => c.close);
    const sma = calculateSMAValues(closes, period);
    const series: StdDevResultValue[] = [];

    for (let i = 0; i < candles.length; i++) {
      const mean = sma[i];
      if (mean === null || i < period - 1) {
        series.push({ stdev: null });
        continue;
      }
      let varianceSum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        varianceSum += Math.pow(closes[j] - mean, 2);
      }
      series.push({ stdev: Math.sqrt(varianceSum / period) });
    }

    const latest = series[series.length - 1] || { stdev: null };
    return {
      indicatorId: "standard_deviation",
      symbol: "",
      timeframe: "",
      series,
      latest,
      status: "LIVE",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: { period },
      isValid: latest.stdev !== null,
    };
  },
};
