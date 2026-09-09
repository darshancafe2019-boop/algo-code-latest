import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";

export interface WMAResultValue {
  value: number | null;
}

export const WMA: IndicatorDefinition<WMAResultValue> = {
  id: "wma",
  name: "Weighted Moving Average",
  shortName: "WMA",
  category: "TREND",
  description: "Linearly weighted moving average putting linearly increasing weight on recent price points.",
  version: "1.0.0",
  overlay: true,
  requiredCandles: 10,
  supportedTimeframes: ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"],
  parameters: {
    period: {
      name: "period",
      label: "Period",
      type: "number",
      default: 20,
      min: 1,
      max: 500,
      step: 1,
    },
  },
  calculate: (candles, params) => {
    const start = performance.now();
    const period = Number(params?.period) || 20;

    if (!candles || candles.length < period) {
      return {
        indicatorId: "wma",
        symbol: "",
        timeframe: "",
        series: [],
        latest: { value: null },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: { period },
        isValid: false,
      };
    }

    const denom = (period * (period + 1)) / 2;
    const series: WMAResultValue[] = [];

    for (let i = 0; i < candles.length; i++) {
      if (i < period - 1) {
        series.push({ value: null });
        continue;
      }
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += candles[i - period + 1 + j].close * (j + 1);
      }
      series.push({ value: sum / denom });
    }

    const latest = series[series.length - 1] || { value: null };
    return {
      indicatorId: "wma",
      symbol: "",
      timeframe: "",
      series,
      latest,
      status: "LIVE",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: { period },
      isValid: latest.value !== null,
    };
  },
};
