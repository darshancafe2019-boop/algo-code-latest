import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";
import { calculateSMAValues } from "../trend/sma";

export interface StochResultValue {
  k: number | null;
  d: number | null;
}

export const Stochastic: IndicatorDefinition<StochResultValue> = {
  id: "stochastic",
  name: "Stochastic Oscillator",
  shortName: "Stoch",
  category: "MOMENTUM",
  description: "Compares a particular closing price of a security to a range of its prices over a certain period.",
  version: "1.0.0",
  overlay: false,
  requiredCandles: 20,
  supportedTimeframes: ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"],
  parameters: {
    kPeriod: {
      name: "kPeriod",
      label: "%K Period",
      type: "number",
      default: 14,
      min: 1,
      max: 100,
    },
    kSmoothing: {
      name: "kSmoothing",
      label: "%K Smoothing",
      type: "number",
      default: 3,
      min: 1,
      max: 50,
    },
    dPeriod: {
      name: "dPeriod",
      label: "%D Period",
      type: "number",
      default: 3,
      min: 1,
      max: 50,
    },
  },
  calculate: (candles, params) => {
    const start = performance.now();
    const kPeriod = Number(params?.kPeriod) || 14;
    const kSmooth = Number(params?.kSmoothing) || 3;
    const dPeriod = Number(params?.dPeriod) || 3;

    if (!candles || candles.length < kPeriod + kSmooth + dPeriod) {
      return {
        indicatorId: "stochastic",
        symbol: "",
        timeframe: "",
        series: [],
        latest: { k: null, d: null },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: { kPeriod, kSmoothing: kSmooth, dPeriod },
        isValid: false,
      };
    }

    // 1. Raw %K
    const rawK: (number | null)[] = [];
    for (let i = 0; i < candles.length; i++) {
      if (i < kPeriod - 1) {
        rawK.push(null);
        continue;
      }
      let highestHigh = -Infinity;
      let lowestLow = Infinity;
      for (let j = i - kPeriod + 1; j <= i; j++) {
        if (candles[j].high > highestHigh) highestHigh = candles[j].high;
        if (candles[j].low < lowestLow) lowestLow = candles[j].low;
      }
      const range = highestHigh - lowestLow;
      const kVal = range === 0 ? 50 : ((candles[i].close - lowestLow) / range) * 100;
      rawK.push(kVal);
    }

    // 2. Smoothed %K
    const validRawK = rawK.filter((v): v is number => v !== null);
    const smoothedKValid = calculateSMAValues(validRawK, kSmooth);
    const smoothedK: (number | null)[] = new Array(candles.length).fill(null);
    for (let i = 0; i < smoothedKValid.length; i++) {
      smoothedK[kPeriod - 1 + i] = smoothedKValid[i];
    }

    // 3. %D (SMA of Smoothed %K)
    const validSmoothedK = smoothedK.filter((v): v is number => v !== null);
    const dValid = calculateSMAValues(validSmoothedK, dPeriod);
    const dLine: (number | null)[] = new Array(candles.length).fill(null);
    for (let i = 0; i < dValid.length; i++) {
      dLine[kPeriod - 1 + kSmooth - 1 + i] = dValid[i];
    }

    const series: StochResultValue[] = candles.map((_, i) => ({
      k: smoothedK[i],
      d: dLine[i],
    }));

    const latest = series[series.length - 1] || { k: null, d: null };
    let signal: IndicatorSignal | undefined;

    if (latest.k !== null && latest.d !== null) {
      if (latest.k >= 80 && latest.d >= 80) {
        signal = {
          type: "OVERBOUGHT",
          score: -0.7,
          reason: `Stochastic %K & %D Overbought (>= 80)`,
          timestamp: Date.now(),
        };
      } else if (latest.k <= 20 && latest.d <= 20) {
        signal = {
          type: "OVERSOLD",
          score: 0.7,
          reason: `Stochastic %K & %D Oversold (<= 20)`,
          timestamp: Date.now(),
        };
      }
    }

    return {
      indicatorId: "stochastic",
      symbol: "",
      timeframe: "",
      series,
      latest,
      signal,
      status: "LIVE",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: { kPeriod, kSmoothing: kSmooth, dPeriod },
      isValid: latest.k !== null,
    };
  },
};
