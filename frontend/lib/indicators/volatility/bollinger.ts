import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";
import { calculateSMAValues } from "../trend/sma";

export interface BollingerResultValue {
  upper: number | null;
  middle: number | null;
  lower: number | null;
  bandwidth: number | null;
  percentB: number | null;
}

export const BollingerBands: IndicatorDefinition<BollingerResultValue> = {
  id: "bollinger",
  name: "Bollinger Bands",
  shortName: "BB",
  category: "VOLATILITY",
  description: "Volatility bands placed above and below a moving average with standard deviation offsets.",
  version: "1.0.0",
  overlay: true,
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
    standardDeviation: {
      name: "standardDeviation",
      label: "Std Dev Multiplier",
      type: "number",
      default: 2.0,
      min: 0.5,
      max: 5.0,
      step: 0.1,
    },
  },
  calculate: (candles, params) => {
    const start = performance.now();
    const period = Number(params?.period) || 20;
    const stdDevMult = Number(params?.standardDeviation) || 2.0;

    if (!candles || candles.length < period) {
      return {
        indicatorId: "bollinger",
        symbol: "",
        timeframe: "",
        series: [],
        latest: { upper: null, middle: null, lower: null, bandwidth: null, percentB: null },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: { period, standardDeviation: stdDevMult },
        isValid: false,
      };
    }

    const closes = candles.map((c) => c.close);
    const middleValues = calculateSMAValues(closes, period);
    const series: BollingerResultValue[] = [];

    for (let i = 0; i < candles.length; i++) {
      const mid = middleValues[i];
      if (mid === null || i < period - 1) {
        series.push({ upper: null, middle: null, lower: null, bandwidth: null, percentB: null });
        continue;
      }

      let varianceSum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        varianceSum += Math.pow(closes[j] - mid, 2);
      }
      const stdev = Math.sqrt(varianceSum / period);
      const upper = mid + stdDevMult * stdev;
      const lower = mid - stdDevMult * stdev;
      const bandwidth = mid === 0 ? 0 : ((upper - lower) / mid) * 100;
      const percentB = upper === lower ? 0.5 : (closes[i] - lower) / (upper - lower);

      series.push({ upper, middle: mid, lower, bandwidth, percentB });
    }

    const latest = series[series.length - 1] || { upper: null, middle: null, lower: null, bandwidth: null, percentB: null };
    let signal: IndicatorSignal | undefined;

    if (latest.percentB !== null && candles.length > 0) {
      if (latest.percentB >= 1.0) {
        signal = {
          type: "OVERBOUGHT",
          score: -0.65,
          reason: `Price pierced above Upper Bollinger Band (${latest.upper?.toFixed(2)})`,
          timestamp: Date.now(),
        };
      } else if (latest.percentB <= 0.0) {
        signal = {
          type: "OVERSOLD",
          score: 0.65,
          reason: `Price pierced below Lower Bollinger Band (${latest.lower?.toFixed(2)})`,
          timestamp: Date.now(),
        };
      }
    }

    return {
      indicatorId: "bollinger",
      symbol: "",
      timeframe: "",
      series,
      latest,
      signal,
      status: "LIVE",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: { period, standardDeviation: stdDevMult },
      isValid: latest.upper !== null,
    };
  },
};
