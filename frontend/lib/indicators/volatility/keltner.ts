import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";
import { calculateEMAValues } from "../trend/ema";
import { calculateATRValues } from "./atr";

export interface KeltnerResultValue {
  upper: number | null;
  middle: number | null;
  lower: number | null;
}

export const KeltnerChannels: IndicatorDefinition<KeltnerResultValue> = {
  id: "keltner",
  name: "Keltner Channels",
  shortName: "KC",
  category: "VOLATILITY",
  description: "Volatility-based envelope using EMA for the center line and ATR for band distance.",
  version: "1.0.0",
  overlay: true,
  requiredCandles: 20,
  supportedTimeframes: ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"],
  parameters: {
    emaPeriod: {
      name: "emaPeriod",
      label: "EMA Period",
      type: "number",
      default: 20,
      min: 2,
      max: 100,
    },
    atrPeriod: {
      name: "atrPeriod",
      label: "ATR Period",
      type: "number",
      default: 10,
      min: 2,
      max: 100,
    },
    multiplier: {
      name: "multiplier",
      label: "ATR Multiplier",
      type: "number",
      default: 2.0,
      min: 0.5,
      max: 5.0,
      step: 0.1,
    },
  },
  calculate: (candles, params) => {
    const start = performance.now();
    const emaPeriod = Number(params?.emaPeriod) || 20;
    const atrPeriod = Number(params?.atrPeriod) || 10;
    const mult = Number(params?.multiplier) || 2.0;

    if (!candles || candles.length < Math.max(emaPeriod, atrPeriod)) {
      return {
        indicatorId: "keltner",
        symbol: "",
        timeframe: "",
        series: [],
        latest: { upper: null, middle: null, lower: null },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: { emaPeriod, atrPeriod, multiplier: mult },
        isValid: false,
      };
    }

    const closes = candles.map((c) => c.close);
    const middleEMA = calculateEMAValues(closes, emaPeriod);
    const atrValues = calculateATRValues(candles, atrPeriod);

    const series: KeltnerResultValue[] = [];
    for (let i = 0; i < candles.length; i++) {
      const mid = middleEMA[i];
      const atr = atrValues[i];
      if (mid === null || atr === null) {
        series.push({ upper: null, middle: null, lower: null });
      } else {
        series.push({
          upper: mid + mult * atr,
          middle: mid,
          lower: mid - mult * atr,
        });
      }
    }

    const latest = series[series.length - 1] || { upper: null, middle: null, lower: null };
    return {
      indicatorId: "keltner",
      symbol: "",
      timeframe: "",
      series,
      latest,
      status: "LIVE",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: { emaPeriod, atrPeriod, multiplier: mult },
      isValid: latest.upper !== null,
    };
  },
};
