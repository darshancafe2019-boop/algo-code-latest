import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";

export interface PSARResultValue {
  sar: number | null;
  trend: "BULL" | "BEAR" | null;
}

export const ParabolicSAR: IndicatorDefinition<PSARResultValue> = {
  id: "parabolic_sar",
  name: "Parabolic SAR",
  shortName: "PSAR",
  category: "TREND",
  description: "Stop-and-reverse trailing stop indicator setting potential trailing stop points on trend breakouts.",
  version: "1.0.0",
  overlay: true,
  requiredCandles: 10,
  supportedTimeframes: ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"],
  parameters: {
    startAf: {
      name: "startAf",
      label: "Start Acceleration Factor",
      type: "number",
      default: 0.02,
      min: 0.005,
      max: 0.1,
      step: 0.005,
    },
    incrementAf: {
      name: "incrementAf",
      label: "Increment AF",
      type: "number",
      default: 0.02,
      min: 0.005,
      max: 0.1,
      step: 0.005,
    },
    maxAf: {
      name: "maxAf",
      label: "Maximum AF",
      type: "number",
      default: 0.2,
      min: 0.05,
      max: 0.5,
      step: 0.01,
    },
  },
  calculate: (candles, params) => {
    const start = performance.now();
    const startAf = Number(params?.startAf) || 0.02;
    const incAf = Number(params?.incrementAf) || 0.02;
    const maxAf = Number(params?.maxAf) || 0.2;

    if (!candles || candles.length < 10) {
      return {
        indicatorId: "parabolic_sar",
        symbol: "",
        timeframe: "",
        series: [],
        latest: { sar: null, trend: null },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: { startAf, incrementAf: incAf, maxAf },
        isValid: false,
      };
    }

    const series: PSARResultValue[] = [];
    let isBull = candles[1].close >= candles[0].close;
    let af = startAf;
    let ep = isBull ? Math.max(candles[0].high, candles[1].high) : Math.min(candles[0].low, candles[1].low);
    let sar = isBull ? Math.min(candles[0].low, candles[1].low) : Math.max(candles[0].high, candles[1].high);

    series.push({ sar: null, trend: null });
    series.push({ sar, trend: isBull ? "BULL" : "BEAR" });

    for (let i = 2; i < candles.length; i++) {
      let nextSar = sar + af * (ep - sar);

      if (isBull) {
        nextSar = Math.min(nextSar, candles[i - 1].low, candles[i - 2].low);
        if (candles[i].low < nextSar) {
          isBull = false;
          nextSar = ep;
          af = startAf;
          ep = candles[i].low;
        } else {
          if (candles[i].high > ep) {
            ep = candles[i].high;
            af = Math.min(af + incAf, maxAf);
          }
        }
      } else {
        nextSar = Math.max(nextSar, candles[i - 1].high, candles[i - 2].high);
        if (candles[i].high > nextSar) {
          isBull = true;
          nextSar = ep;
          af = startAf;
          ep = candles[i].high;
        } else {
          if (candles[i].low < ep) {
            ep = candles[i].low;
            af = Math.min(af + incAf, maxAf);
          }
        }
      }

      sar = nextSar;
      series.push({ sar, trend: isBull ? "BULL" : "BEAR" });
    }

    const latest = series[series.length - 1] || { sar: null, trend: null };
    let signal: IndicatorSignal | undefined;
    if (latest.trend) {
      signal = {
        type: latest.trend === "BULL" ? "BULLISH" : "BEARISH",
        score: latest.trend === "BULL" ? 0.6 : -0.6,
        reason: `Parabolic SAR is in ${latest.trend === "BULL" ? "BULLISH" : "BEARISH"} trend trailing at ${latest.sar?.toFixed(2)}`,
        timestamp: Date.now(),
      };
    }

    return {
      indicatorId: "parabolic_sar",
      symbol: "",
      timeframe: "",
      series,
      latest,
      signal,
      status: "LIVE",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: { startAf, incrementAf: incAf, maxAf },
      isValid: latest.sar !== null,
    };
  },
};
