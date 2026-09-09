import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";

export interface VWAPResultValue {
  vwap: number | null;
  upperBand1?: number | null;
  lowerBand1?: number | null;
  upperBand2?: number | null;
  lowerBand2?: number | null;
}

export const VWAP: IndicatorDefinition<VWAPResultValue> = {
  id: "vwap",
  name: "Volume Weighted Average Price",
  shortName: "VWAP",
  category: "TREND",
  description: "Benchmark volume weighted price showing true institutional liquidity fair value.",
  version: "1.0.0",
  overlay: true,
  requiredCandles: 5,
  supportedTimeframes: ["1m", "3m", "5m", "15m", "30m", "1h"],
  parameters: {
    bandMultiplier1: {
      name: "bandMultiplier1",
      label: "Band Multiplier 1",
      type: "number",
      default: 1.0,
      min: 0.1,
      max: 5.0,
      step: 0.1,
    },
    bandMultiplier2: {
      name: "bandMultiplier2",
      label: "Band Multiplier 2",
      type: "number",
      default: 2.0,
      min: 0.1,
      max: 5.0,
      step: 0.1,
    },
  },
  calculate: (candles, params) => {
    const start = performance.now();
    const mult1 = Number(params?.bandMultiplier1) || 1.0;
    const mult2 = Number(params?.bandMultiplier2) || 2.0;

    if (!candles || candles.length === 0) {
      return {
        indicatorId: "vwap",
        symbol: "",
        timeframe: "",
        series: [],
        latest: { vwap: null },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: { bandMultiplier1: mult1, bandMultiplier2: mult2 },
        isValid: false,
      };
    }

    let cumulativeTypicalVolume = 0;
    let cumulativeVolume = 0;
    const series: VWAPResultValue[] = [];

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const typicalPrice = (c.high + c.low + c.close) / 3;
      const vol = Math.max(1, c.volume || 1);

      cumulativeTypicalVolume += typicalPrice * vol;
      cumulativeVolume += vol;

      const vwapVal = cumulativeTypicalVolume / cumulativeVolume;

      // Variance calculation for standard deviation bands
      let varianceSum = 0;
      for (let j = 0; j <= i; j++) {
        const cj = candles[j];
        const tp = (cj.high + cj.low + cj.close) / 3;
        const vj = Math.max(1, cj.volume || 1);
        varianceSum += vj * Math.pow(tp - vwapVal, 2);
      }
      const stdev = Math.sqrt(varianceSum / cumulativeVolume);

      series.push({
        vwap: vwapVal,
        upperBand1: vwapVal + stdev * mult1,
        lowerBand1: vwapVal - stdev * mult1,
        upperBand2: vwapVal + stdev * mult2,
        lowerBand2: vwapVal - stdev * mult2,
      });
    }

    const latest = series[series.length - 1] || { vwap: null };
    let signal: IndicatorSignal | undefined;

    if (latest.vwap !== null && candles.length > 0) {
      const curPrice = candles[candles.length - 1].close;
      signal = {
        type: curPrice >= latest.vwap ? "BULLISH" : "BEARISH",
        score: curPrice >= latest.vwap ? 0.6 : -0.6,
        reason: `Price is trading ${curPrice >= latest.vwap ? "above" : "below"} Session VWAP`,
        timestamp: Date.now(),
      };
    }

    return {
      indicatorId: "vwap",
      symbol: "",
      timeframe: "",
      series,
      latest,
      signal,
      status: "LIVE",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: { bandMultiplier1: mult1, bandMultiplier2: mult2 },
      isValid: latest.vwap !== null,
    };
  },
};
