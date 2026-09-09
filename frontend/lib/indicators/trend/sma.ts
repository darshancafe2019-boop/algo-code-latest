import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";

export interface SMAResultValue {
  value: number | null;
}

export function calculateSMAValues(prices: number[], period: number): (number | null)[] {
  if (prices.length < period || period <= 0) {
    return new Array(prices.length).fill(null);
  }

  const result: (number | null)[] = new Array(prices.length).fill(null);
  let sum = 0;

  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  result[period - 1] = sum / period;

  for (let i = period; i < prices.length; i++) {
    sum += prices[i] - prices[i - period];
    result[i] = sum / period;
  }

  return result;
}

export const SMA: IndicatorDefinition<SMAResultValue> = {
  id: "sma",
  name: "Simple Moving Average",
  shortName: "SMA",
  category: "TREND",
  description: "Arithmetic moving average calculating the average price over a specified period.",
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
      ],
    },
  },
  calculate: (candles, params) => {
    const start = performance.now();
    const period = Number(params?.period) || 200;
    const sourceKey = params?.source || "close";

    if (!candles || candles.length === 0) {
      return {
        indicatorId: "sma",
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
      return c.close;
    });

    const smaValues = calculateSMAValues(prices, period);
    const series: SMAResultValue[] = smaValues.map((v) => ({ value: v }));
    const latestVal = series[series.length - 1] || { value: null };

    let signal: IndicatorSignal | undefined;
    if (latestVal.value !== null && candles.length >= 1) {
      const curPrice = candles[candles.length - 1].close;
      signal = {
        type: curPrice >= latestVal.value ? "BULLISH" : "BEARISH",
        score: curPrice >= latestVal.value ? 0.4 : -0.4,
        reason: `Price is ${curPrice >= latestVal.value ? "above" : "below"} ${period} SMA`,
        timestamp: Date.now(),
      };
    }

    return {
      indicatorId: "sma",
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
