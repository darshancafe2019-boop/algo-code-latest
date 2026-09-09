import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";

export interface SupertrendResultValue {
  supertrend: number | null;
  direction: "UP" | "DOWN" | null;
  upperBand: number | null;
  lowerBand: number | null;
}

export const Supertrend: IndicatorDefinition<SupertrendResultValue> = {
  id: "supertrend",
  name: "Supertrend",
  shortName: "Supertrend",
  category: "TREND",
  description: "ATR-based trend-following indicator providing dynamic trailing stops and breakout signals.",
  version: "1.0.0",
  overlay: true,
  requiredCandles: 15,
  supportedTimeframes: ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"],
  parameters: {
    atrPeriod: {
      name: "atrPeriod",
      label: "ATR Period",
      type: "number",
      default: 10,
      min: 1,
      max: 100,
      step: 1,
    },
    multiplier: {
      name: "multiplier",
      label: "Multiplier",
      type: "number",
      default: 3.0,
      min: 0.5,
      max: 10.0,
      step: 0.1,
    },
  },
  calculate: (candles, params) => {
    const start = performance.now();
    const period = Number(params?.atrPeriod) || 10;
    const mult = Number(params?.multiplier) || 3.0;

    if (!candles || candles.length < period + 1) {
      return {
        indicatorId: "supertrend",
        symbol: "",
        timeframe: "",
        series: [],
        latest: { supertrend: null, direction: null, upperBand: null, lowerBand: null },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: { atrPeriod: period, multiplier: mult },
        isValid: false,
      };
    }

    // 1. Calculate ATR
    const trList: number[] = [candles[0].high - candles[0].low];
    for (let i = 1; i < candles.length; i++) {
      const hl = candles[i].high - candles[i].low;
      const hc = Math.abs(candles[i].high - candles[i - 1].close);
      const lc = Math.abs(candles[i].low - candles[i - 1].close);
      trList.push(Math.max(hl, hc, lc));
    }

    const atrList: number[] = new Array(candles.length).fill(0);
    let trSum = 0;
    for (let i = 0; i < period; i++) {
      trSum += trList[i];
    }
    atrList[period - 1] = trSum / period;
    for (let i = period; i < candles.length; i++) {
      atrList[i] = (atrList[i - 1] * (period - 1) + trList[i]) / period;
    }

    // 2. Calculate Basic Bands & Final Bands
    const series: SupertrendResultValue[] = [];
    let prevFinalUpper = 0;
    let prevFinalLower = 0;
    let prevSupertrend = 0;
    let prevDirection: "UP" | "DOWN" = "UP";

    for (let i = 0; i < candles.length; i++) {
      if (i < period) {
        series.push({ supertrend: null, direction: null, upperBand: null, lowerBand: null });
        continue;
      }

      const hl2 = (candles[i].high + candles[i].low) / 2;
      const atr = atrList[i];
      const basicUpper = hl2 + mult * atr;
      const basicLower = hl2 - mult * atr;

      // Final Upper Band
      let finalUpper = basicUpper;
      if (i > period && (basicUpper < prevFinalUpper || candles[i - 1].close > prevFinalUpper)) {
        finalUpper = basicUpper;
      } else if (i > period) {
        finalUpper = prevFinalUpper;
      }

      // Final Lower Band
      let finalLower = basicLower;
      if (i > period && (basicLower > prevFinalLower || candles[i - 1].close < prevFinalLower)) {
        finalLower = basicLower;
      } else if (i > period) {
        finalLower = prevFinalLower;
      }

      // Supertrend line
      let direction: "UP" | "DOWN" = "UP";
      let supertrendVal = finalLower;

      if (i === period) {
        direction = candles[i].close > finalUpper ? "UP" : "DOWN";
        supertrendVal = direction === "UP" ? finalLower : finalUpper;
      } else {
        if (prevSupertrend === prevFinalUpper) {
          direction = candles[i].close > finalUpper ? "UP" : "DOWN";
        } else {
          direction = candles[i].close < finalLower ? "DOWN" : "UP";
        }
        supertrendVal = direction === "UP" ? finalLower : finalUpper;
      }

      series.push({
        supertrend: supertrendVal,
        direction,
        upperBand: finalUpper,
        lowerBand: finalLower,
      });

      prevFinalUpper = finalUpper;
      prevFinalLower = finalLower;
      prevSupertrend = supertrendVal;
      prevDirection = direction;
    }

    const latest = series[series.length - 1] || { supertrend: null, direction: null, upperBand: null, lowerBand: null };
    let signal: IndicatorSignal | undefined;

    if (latest.direction) {
      signal = {
        type: latest.direction === "UP" ? "BULLISH" : "BEARISH",
        score: latest.direction === "UP" ? 0.75 : -0.75,
        reason: `Supertrend is ${latest.direction === "UP" ? "BULLISH (Green)" : "BEARISH (Red)"} at ${latest.supertrend?.toFixed(2)}`,
        timestamp: Date.now(),
      };
    }

    return {
      indicatorId: "supertrend",
      symbol: "",
      timeframe: "",
      series,
      latest,
      signal,
      status: "LIVE",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: { atrPeriod: period, multiplier: mult },
      isValid: latest.supertrend !== null,
    };
  },
};
