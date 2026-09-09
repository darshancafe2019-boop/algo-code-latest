import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal, OptionsDataFeed } from "../types";

export interface OIResultValue {
  openInterest: number | null;
  oiChange: number | null;
}

export const OpenInterest: IndicatorDefinition<OIResultValue> = {
  id: "open_interest",
  name: "Open Interest & OI Flow",
  shortName: "OI",
  category: "OPTIONS",
  description: "Total outstanding derivative contracts and net session OI change for institutional positioning analysis.",
  version: "1.0.0",
  overlay: false,
  requiredCandles: 0,
  supportedTimeframes: ["1m", "5m", "15m", "1h", "1d"],
  parameters: {},
  calculate: (candles, params, optionsData) => {
    const start = performance.now();
    const curOI = optionsData?.oi ?? (candles.length > 0 ? candles[candles.length - 1].openInterest ?? null : null);
    const oiChg = optionsData?.oiChange ?? null;

    const latest = { openInterest: curOI, oiChange: oiChg };
    let signal: IndicatorSignal | undefined;

    if (oiChg !== null && curOI !== null) {
      if (oiChg > 0) {
        signal = {
          type: "BULLISH",
          score: 0.5,
          reason: `Fresh Build-Up: Open Interest expanded by +${oiChg.toLocaleString()} contracts`,
          timestamp: Date.now(),
        };
      } else if (oiChg < 0) {
        signal = {
          type: "BEARISH",
          score: -0.5,
          reason: `Long Unwinding / Short Covering: Open Interest dropped by ${oiChg.toLocaleString()} contracts`,
          timestamp: Date.now(),
        };
      }
    }

    return {
      indicatorId: "open_interest",
      symbol: "",
      timeframe: "",
      series: [latest],
      latest,
      signal,
      status: curOI !== null ? "LIVE" : "INSUFFICIENT_DATA",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: {},
      isValid: curOI !== null,
    };
  },
};
