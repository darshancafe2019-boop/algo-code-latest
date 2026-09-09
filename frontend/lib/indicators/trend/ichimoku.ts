import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";

export interface IchimokuResultValue {
  tenkanSen: number | null;
  kijunSen: number | null;
  senkouSpanA: number | null;
  senkouSpanB: number | null;
  chikouSpan: number | null;
}

function getHighestHigh(candles: CandleData[], start: number, end: number): number {
  let highest = -Infinity;
  for (let i = start; i <= end; i++) {
    if (candles[i].high > highest) highest = candles[i].high;
  }
  return highest;
}

function getLowestLow(candles: CandleData[], start: number, end: number): number {
  let lowest = Infinity;
  for (let i = start; i <= end; i++) {
    if (candles[i].low < lowest) lowest = candles[i].low;
  }
  return lowest;
}

export const Ichimoku: IndicatorDefinition<IchimokuResultValue> = {
  id: "ichimoku",
  name: "Ichimoku Kinko Hyo",
  shortName: "Ichimoku",
  category: "TREND",
  description: "Comprehensive trend equilibrium indicator defining support/resistance, trend direction, and momentum.",
  version: "1.0.0",
  overlay: true,
  requiredCandles: 52,
  supportedTimeframes: ["5m", "15m", "30m", "1h", "4h", "1d"],
  parameters: {
    tenkanPeriod: {
      name: "tenkanPeriod",
      label: "Tenkan-sen Period (Conversion Line)",
      type: "number",
      default: 9,
      min: 1,
      max: 50,
    },
    kijunPeriod: {
      name: "kijunPeriod",
      label: "Kijun-sen Period (Base Line)",
      type: "number",
      default: 26,
      min: 1,
      max: 100,
    },
    senkouBPeriod: {
      name: "senkouBPeriod",
      label: "Senkou Span B Period (Leading Span B)",
      type: "number",
      default: 52,
      min: 1,
      max: 200,
    },
  },
  calculate: (candles, params) => {
    const start = performance.now();
    const tenkan = Number(params?.tenkanPeriod) || 9;
    const kijun = Number(params?.kijunPeriod) || 26;
    const senkouB = Number(params?.senkouBPeriod) || 52;

    if (!candles || candles.length < senkouB) {
      return {
        indicatorId: "ichimoku",
        symbol: "",
        timeframe: "",
        series: [],
        latest: { tenkanSen: null, kijunSen: null, senkouSpanA: null, senkouSpanB: null, chikouSpan: null },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: { tenkanPeriod: tenkan, kijunPeriod: kijun, senkouBPeriod: senkouB },
        isValid: false,
      };
    }

    const series: IchimokuResultValue[] = [];

    for (let i = 0; i < candles.length; i++) {
      const tenkanVal =
        i >= tenkan - 1
          ? (getHighestHigh(candles, i - tenkan + 1, i) + getLowestLow(candles, i - tenkan + 1, i)) / 2
          : null;

      const kijunVal =
        i >= kijun - 1
          ? (getHighestHigh(candles, i - kijun + 1, i) + getLowestLow(candles, i - kijun + 1, i)) / 2
          : null;

      const spanA = tenkanVal !== null && kijunVal !== null ? (tenkanVal + kijunVal) / 2 : null;

      const spanB =
        i >= senkouB - 1
          ? (getHighestHigh(candles, i - senkouB + 1, i) + getLowestLow(candles, i - senkouB + 1, i)) / 2
          : null;

      const chikou = i < candles.length - kijun ? candles[i + kijun]?.close || null : null;

      series.push({
        tenkanSen: tenkanVal,
        kijunSen: kijunVal,
        senkouSpanA: spanA,
        senkouSpanB: spanB,
        chikouSpan: chikou,
      });
    }

    const latest = series[series.length - 1] || {
      tenkanSen: null,
      kijunSen: null,
      senkouSpanA: null,
      senkouSpanB: null,
      chikouSpan: null,
    };

    let signal: IndicatorSignal | undefined;
    if (latest.tenkanSen !== null && latest.kijunSen !== null && candles.length > 0) {
      const curPrice = candles[candles.length - 1].close;
      const isAboveCloud = latest.senkouSpanA !== null && latest.senkouSpanB !== null && curPrice > Math.max(latest.senkouSpanA, latest.senkouSpanB);
      const isBelowCloud = latest.senkouSpanA !== null && latest.senkouSpanB !== null && curPrice < Math.min(latest.senkouSpanA, latest.senkouSpanB);

      if (isAboveCloud && latest.tenkanSen > latest.kijunSen) {
        signal = {
          type: "BULLISH",
          score: 0.85,
          reason: "Price above Kumo Cloud with Tenkan/Kijun Bullish TK Cross",
          timestamp: Date.now(),
        };
      } else if (isBelowCloud && latest.tenkanSen < latest.kijunSen) {
        signal = {
          type: "BEARISH",
          score: -0.85,
          reason: "Price below Kumo Cloud with Tenkan/Kijun Bearish TK Cross",
          timestamp: Date.now(),
        };
      }
    }

    return {
      indicatorId: "ichimoku",
      symbol: "",
      timeframe: "",
      series,
      latest,
      signal,
      status: "LIVE",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: { tenkanPeriod: tenkan, kijunPeriod: kijun, senkouBPeriod: senkouB },
      isValid: latest.tenkanSen !== null,
    };
  },
};
