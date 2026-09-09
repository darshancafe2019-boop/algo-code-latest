import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";
import { calculateEMAValues } from "../trend/ema";

export interface MACDResultValue {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

export const MACD: IndicatorDefinition<MACDResultValue> = {
  id: "macd",
  name: "Moving Average Convergence Divergence",
  shortName: "MACD",
  category: "MOMENTUM",
  description: "Trend-following momentum indicator showing relationship between two exponential moving averages.",
  version: "1.0.0",
  overlay: false,
  requiredCandles: 35,
  supportedTimeframes: ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"],
  parameters: {
    fastPeriod: {
      name: "fastPeriod",
      label: "Fast EMA Period",
      type: "number",
      default: 12,
      min: 2,
      max: 100,
    },
    slowPeriod: {
      name: "slowPeriod",
      label: "Slow EMA Period",
      type: "number",
      default: 26,
      min: 5,
      max: 200,
    },
    signalPeriod: {
      name: "signalPeriod",
      label: "Signal EMA Period",
      type: "number",
      default: 9,
      min: 2,
      max: 50,
    },
  },
  calculate: (candles, params) => {
    const start = performance.now();
    const fast = Number(params?.fastPeriod) || 12;
    const slow = Number(params?.slowPeriod) || 26;
    const sig = Number(params?.signalPeriod) || 9;

    if (!candles || candles.length < slow) {
      return {
        indicatorId: "macd",
        symbol: "",
        timeframe: "",
        series: [],
        latest: { macd: null, signal: null, histogram: null },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: { fastPeriod: fast, slowPeriod: slow, signalPeriod: sig },
        isValid: false,
      };
    }

    const closes = candles.map((c) => c.close);
    const fastEMA = calculateEMAValues(closes, fast);
    const slowEMA = calculateEMAValues(closes, slow);

    const macdLine: (number | null)[] = new Array(closes.length).fill(null);
    for (let i = 0; i < closes.length; i++) {
      if (fastEMA[i] !== null && slowEMA[i] !== null) {
        macdLine[i] = fastEMA[i]! - slowEMA[i]!;
      }
    }

    // Filter valid macd points for signal line calculation
    const validStartIndex = slow - 1;
    const validMacd = macdLine.slice(validStartIndex) as number[];
    const signalEmaValid = calculateEMAValues(validMacd, sig);

    const signalLine: (number | null)[] = new Array(closes.length).fill(null);
    for (let i = 0; i < signalEmaValid.length; i++) {
      signalLine[validStartIndex + i] = signalEmaValid[i];
    }

    const series: MACDResultValue[] = [];
    for (let i = 0; i < closes.length; i++) {
      const m = macdLine[i];
      const s = signalLine[i];
      const h = m !== null && s !== null ? m - s : null;
      series.push({ macd: m, signal: s, histogram: h });
    }

    const latest = series[series.length - 1] || { macd: null, signal: null, histogram: null };
    const prev = series[series.length - 2] || { macd: null, signal: null, histogram: null };

    let signal: IndicatorSignal | undefined;
    if (latest.macd !== null && latest.signal !== null && latest.histogram !== null) {
      if (prev.histogram !== null && prev.histogram <= 0 && latest.histogram > 0) {
        signal = {
          type: "CROSS_UP",
          score: 0.85,
          reason: "MACD Line Crossed ABOVE Signal Line (Bullish Momentum Shift)",
          timestamp: Date.now(),
        };
      } else if (prev.histogram !== null && prev.histogram >= 0 && latest.histogram < 0) {
        signal = {
          type: "CROSS_DOWN",
          score: -0.85,
          reason: "MACD Line Crossed BELOW Signal Line (Bearish Momentum Shift)",
          timestamp: Date.now(),
        };
      } else if (latest.histogram > 0) {
        signal = {
          type: "BULLISH",
          score: 0.5,
          reason: `MACD Histogram is Positive (+${latest.histogram.toFixed(2)})`,
          timestamp: Date.now(),
        };
      } else {
        signal = {
          type: "BEARISH",
          score: -0.5,
          reason: `MACD Histogram is Negative (${latest.histogram.toFixed(2)})`,
          timestamp: Date.now(),
        };
      }
    }

    return {
      indicatorId: "macd",
      symbol: "",
      timeframe: "",
      series,
      latest,
      signal,
      status: "LIVE",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: { fastPeriod: fast, slowPeriod: slow, signalPeriod: sig },
      isValid: latest.macd !== null,
    };
  },
};
