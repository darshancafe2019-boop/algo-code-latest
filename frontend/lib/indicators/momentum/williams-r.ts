import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";

export interface WilliamsRResultValue {
  williamsR: number | null;
}

export const WilliamsR: IndicatorDefinition<WilliamsRResultValue> = {
  id: "williams_r",
  name: "Williams %R",
  shortName: "%R",
  category: "MOMENTUM",
  description: "Momentum oscillator measuring overbought and oversold levels between 0 and -100.",
  version: "1.0.0",
  overlay: false,
  requiredCandles: 14,
  supportedTimeframes: ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"],
  parameters: {
    period: {
      name: "period",
      label: "Period",
      type: "number",
      default: 14,
      min: 2,
      max: 100,
    },
  },
  calculate: (candles, params) => {
    const start = performance.now();
    const period = Number(params?.period) || 14;

    if (!candles || candles.length < period) {
      return {
        indicatorId: "williams_r",
        symbol: "",
        timeframe: "",
        series: [],
        latest: { williamsR: null },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: { period },
        isValid: false,
      };
    }

    const series: WilliamsRResultValue[] = [];
    for (let i = 0; i < candles.length; i++) {
      if (i < period - 1) {
        series.push({ williamsR: null });
        continue;
      }
      let highestHigh = -Infinity;
      let lowestLow = Infinity;
      for (let j = i - period + 1; j <= i; j++) {
        if (candles[j].high > highestHigh) highestHigh = candles[j].high;
        if (candles[j].low < lowestLow) lowestLow = candles[j].low;
      }
      const range = highestHigh - lowestLow;
      const wr = range === 0 ? -50 : ((highestHigh - candles[i].close) / range) * -100;
      series.push({ williamsR: wr });
    }

    const latest = series[series.length - 1] || { williamsR: null };
    return {
      indicatorId: "williams_r",
      symbol: "",
      timeframe: "",
      series,
      latest,
      status: "LIVE",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: { period },
      isValid: latest.williamsR !== null,
    };
  },
};
