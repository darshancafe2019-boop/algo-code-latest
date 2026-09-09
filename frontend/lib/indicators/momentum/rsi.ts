import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";

export interface RSIResultValue {
  rsi: number | null;
}

export function calculateRSIValues(prices: number[], period: number): (number | null)[] {
  if (prices.length <= period || period <= 0) {
    return new Array(prices.length).fill(null);
  }

  const result: (number | null)[] = new Array(prices.length).fill(null);
  let gainSum = 0;
  let lossSum = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gainSum += diff;
    else lossSum += Math.abs(diff);
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result[period] = 100 - 100 / (1 + rs);

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result[i] = 100 - 100 / (1 + rs);
  }

  return result;
}

export const RSI: IndicatorDefinition<RSIResultValue> = {
  id: "rsi",
  name: "Relative Strength Index",
  shortName: "RSI",
  category: "MOMENTUM",
  description: "Oscillator measuring the speed and change of price movements between 0 and 100.",
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
    overbought: {
      name: "overbought",
      label: "Overbought Level",
      type: "number",
      default: 70,
      min: 50,
      max: 95,
    },
    oversold: {
      name: "oversold",
      label: "Oversold Level",
      type: "number",
      default: 30,
      min: 5,
      max: 50,
    },
  },
  calculate: (candles, params) => {
    const start = performance.now();
    const period = Number(params?.period) || 14;
    const overbought = Number(params?.overbought) || 70;
    const oversold = Number(params?.oversold) || 30;

    if (!candles || candles.length <= period) {
      return {
        indicatorId: "rsi",
        symbol: "",
        timeframe: "",
        series: [],
        latest: { rsi: null },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: { period, overbought, oversold },
        isValid: false,
      };
    }

    const closes = candles.map((c) => c.close);
    const rsiValues = calculateRSIValues(closes, period);
    const series: RSIResultValue[] = rsiValues.map((v) => ({ rsi: v }));
    const latest = series[series.length - 1] || { rsi: null };

    let signal: IndicatorSignal | undefined;
    if (latest.rsi !== null) {
      if (latest.rsi >= overbought) {
        signal = {
          type: "OVERBOUGHT",
          score: -0.7,
          reason: `RSI is Overbought at ${latest.rsi.toFixed(1)} (>= ${overbought})`,
          timestamp: Date.now(),
        };
      } else if (latest.rsi <= oversold) {
        signal = {
          type: "OVERSOLD",
          score: 0.7,
          reason: `RSI is Oversold at ${latest.rsi.toFixed(1)} (<= ${oversold})`,
          timestamp: Date.now(),
        };
      } else if (latest.rsi > 50) {
        signal = {
          type: "BULLISH",
          score: 0.35,
          reason: `RSI above 50 midline at ${latest.rsi.toFixed(1)}`,
          timestamp: Date.now(),
        };
      } else {
        signal = {
          type: "BEARISH",
          score: -0.35,
          reason: `RSI below 50 midline at ${latest.rsi.toFixed(1)}`,
          timestamp: Date.now(),
        };
      }
    }

    return {
      indicatorId: "rsi",
      symbol: "",
      timeframe: "",
      series,
      latest,
      signal,
      status: "LIVE",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: { period, overbought, oversold },
      isValid: latest.rsi !== null,
    };
  },
};
