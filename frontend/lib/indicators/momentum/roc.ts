import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";

export interface ROCResultValue {
  roc: number | null;
}

export const ROC: IndicatorDefinition<ROCResultValue> = {
  id: "roc",
  name: "Rate of Change",
  shortName: "ROC",
  category: "MOMENTUM",
  description: "Pure momentum oscillator measuring the percentage change in price from one period to the next.",
  version: "1.0.0",
  overlay: false,
  requiredCandles: 12,
  supportedTimeframes: ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"],
  parameters: {
    period: {
      name: "period",
      label: "Period",
      type: "number",
      default: 12,
      min: 1,
      max: 100,
    },
  },
  calculate: (candles, params) => {
    const start = performance.now();
    const period = Number(params?.period) || 12;

    if (!candles || candles.length <= period) {
      return {
        indicatorId: "roc",
        symbol: "",
        timeframe: "",
        series: [],
        latest: { roc: null },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: { period },
        isValid: false,
      };
    }

    const series: ROCResultValue[] = [];
    for (let i = 0; i < candles.length; i++) {
      if (i < period) {
        series.push({ roc: null });
        continue;
      }
      const prevClose = candles[i - period].close;
      const rocVal = prevClose === 0 ? 0 : ((candles[i].close - prevClose) / prevClose) * 100;
      series.push({ roc: rocVal });
    }

    const latest = series[series.length - 1] || { roc: null };
    return {
      indicatorId: "roc",
      symbol: "",
      timeframe: "",
      series,
      latest,
      status: "LIVE",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: { period },
      isValid: latest.roc !== null,
    };
  },
};
