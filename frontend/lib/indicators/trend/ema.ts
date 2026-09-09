import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";

export interface EMAResultValue {
  value: number | null;
}

export function calculateEMAValues(prices: number[], period: number): (number | null)[] {
  if (prices.length < period || period <= 0) {
    return new Array(prices.length).fill(null);
  }

  const result: (number | null)[] = new Array(prices.length).fill(null);
  const k = 2 / (period + 1);

  // Initial SMA as seed
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  let prevEMA = sum / period;
  result[period - 1] = prevEMA;

  for (let i = period; i < prices.length; i++) {
    const currentEMA = prices[i] * k + prevEMA * (1 - k);
    result[i] = currentEMA;
    prevEMA = currentEMA;
  }

  return result;
}

export const EMA: IndicatorDefinition<EMAResultValue> = {
  id: "ema",
  name: "Exponential Moving Average",
  shortName: "EMA",
  category: "TREND",
  description: "Weighted moving average giving higher weight to recent prices for trend direction.",
  version: "1.0.0",
  overlay: true,
  requiredCandles: 10,
  supportedTimeframes: ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"],
  parameters: {
    period: {
      name: "period",
      label: "Period",
      type: "number",
      default: 200,
      min: 1,
      max: 1000,
      step: 1,
    },
    source: {
      name: "source",
      label: "Source",
      type: "select",
      default: "close",
      options: [
        { label: "Close", value: "close" },
        { label: "Open", value: "open" },
        { label: "High", value: "high" },
        { label: "Low", value: "low" },
        { label: "HL2", value: "hl2" },
        { label: "HLC3", value: "hlc3" },
      ],
    },
  },
  calculate: (candles, params) => {
    const start = performance.now();
    const period = Number(params?.period) || 200;
    const sourceKey = params?.source || "close";

    if (!candles || candles.length === 0) {
      return {
        indicatorId: "ema",
        symbol: "",
        timeframe: "",
        series: [],
        latest: { value: null },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: { period, source: sourceKey },
        isValid: false,
      };
    }

    const prices = candles.map((c) => {
      if (sourceKey === "open") return c.open;
      if (sourceKey === "high") return c.high;
      if (sourceKey === "low") return c.low;
      if (sourceKey === "hl2") return (c.high + c.low) / 2;
      if (sourceKey === "hlc3") return (c.high + c.low + c.close) / 3;
      return c.close;
    });

    const emaValues = calculateEMAValues(prices, period);
    const series: EMAResultValue[] = emaValues.map((v) => ({ value: v }));
    const latestVal = series[series.length - 1] || { value: null };

    // Determine signal
    let signal: IndicatorSignal | undefined;
    if (latestVal.value !== null && candles.length >= 2) {
      const curPrice = candles[candles.length - 1].close;
      const prevPrice = candles[candles.length - 2].close;
      const prevEMA = series[series.length - 2]?.value;

      if (prevEMA !== null && prevPrice <= prevEMA && curPrice > latestVal.value) {
        signal = {
          type: "CROSS_UP",
          score: 0.8,
          reason: `Price crossed above ${period} EMA`,
          timestamp: Date.now(),
        };
      } else if (prevEMA !== null && prevPrice >= prevEMA && curPrice < latestVal.value) {
        signal = {
          type: "CROSS_DOWN",
          score: -0.8,
          reason: `Price crossed below ${period} EMA`,
          timestamp: Date.now(),
        };
      } else if (curPrice > latestVal.value) {
        signal = {
          type: "BULLISH",
          score: 0.5,
          reason: `Price trading above ${period} EMA`,
          timestamp: Date.now(),
        };
      } else {
        signal = {
          type: "BEARISH",
          score: -0.5,
          reason: `Price trading below ${period} EMA`,
          timestamp: Date.now(),
        };
      }
    }

    return {
      indicatorId: "ema",
      symbol: "",
      timeframe: "",
      series,
      latest: latestVal,
      signal,
      status: series.length >= period ? "LIVE" : "INSUFFICIENT_DATA",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: { period, source: sourceKey },
      isValid: latestVal.value !== null,
    };
  },
};
