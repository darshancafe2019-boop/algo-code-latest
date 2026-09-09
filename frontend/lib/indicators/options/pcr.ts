import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal, OptionsDataFeed } from "../types";

export interface PCRResultValue {
  pcrOI: number | null;
  pcrVolume: number | null;
  callOI: number | null;
  putOI: number | null;
}

export const PCR: IndicatorDefinition<PCRResultValue> = {
  id: "pcr",
  name: "Put-Call Ratio (PCR)",
  shortName: "PCR",
  category: "OPTIONS",
  description: "Ratio of put options to call options volume and open interest indicating market sentiment extremes.",
  version: "1.0.0",
  overlay: false,
  requiredCandles: 0,
  supportedTimeframes: ["1m", "5m", "15m", "1h", "1d"],
  parameters: {},
  calculate: (candles, params, optionsData) => {
    const start = performance.now();
    const callOI = optionsData?.callOi ?? null;
    const putOI = optionsData?.putOi ?? null;
    const callVol = optionsData?.callVolume ?? null;
    const putVol = optionsData?.putVolume ?? null;

    const pcrOI = callOI !== null && putOI !== null && callOI > 0 ? putOI / callOI : null;
    const pcrVolume = callVol !== null && putVol !== null && callVol > 0 ? putVol / callVol : null;

    const latest = { pcrOI, pcrVolume, callOI, putOI };
    let signal: IndicatorSignal | undefined;

    if (pcrOI !== null) {
      if (pcrOI >= 1.4) {
        signal = {
          type: "OVERBOUGHT",
          score: -0.65,
          reason: `High PCR (${pcrOI.toFixed(2)} >= 1.4) - Heavy Put Writing / Potential Reversal Top`,
          timestamp: Date.now(),
        };
      } else if (pcrOI <= 0.7) {
        signal = {
          type: "OVERSOLD",
          score: 0.65,
          reason: `Low PCR (${pcrOI.toFixed(2)} <= 0.7) - Heavy Call Writing / Potential Reversal Bottom`,
          timestamp: Date.now(),
        };
      } else {
        signal = {
          type: "NEUTRAL",
          score: 0.0,
          reason: `Balanced PCR (${pcrOI.toFixed(2)})`,
          timestamp: Date.now(),
        };
      }
    }

    return {
      indicatorId: "pcr",
      symbol: "",
      timeframe: "",
      series: [latest],
      latest,
      signal,
      status: pcrOI !== null ? "LIVE" : "INSUFFICIENT_DATA",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: {},
      isValid: pcrOI !== null,
    };
  },
};
