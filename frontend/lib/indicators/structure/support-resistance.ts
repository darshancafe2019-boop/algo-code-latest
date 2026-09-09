import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";

export interface SupportResistanceResultValue {
  support1: number | null;
  support2: number | null;
  resistance1: number | null;
  resistance2: number | null;
}

export const SupportResistance: IndicatorDefinition<SupportResistanceResultValue> = {
  id: "support_resistance",
  name: "Support & Resistance Levels",
  shortName: "S/R",
  category: "STRUCTURE",
  description: "Dynamic swing high and swing low horizontal support/resistance zones.",
  version: "1.0.0",
  overlay: true,
  requiredCandles: 20,
  supportedTimeframes: ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"],
  parameters: {
    leftBars: {
      name: "leftBars",
      label: "Left Pivot Bars",
      type: "number",
      default: 5,
      min: 1,
      max: 20,
    },
    rightBars: {
      name: "rightBars",
      label: "Right Pivot Bars",
      type: "number",
      default: 5,
      min: 1,
      max: 20,
    },
  },
  calculate: (candles, params) => {
    const start = performance.now();
    const left = Number(params?.leftBars) || 5;
    const right = Number(params?.rightBars) || 5;

    if (!candles || candles.length < left + right + 1) {
      return {
        indicatorId: "support_resistance",
        symbol: "",
        timeframe: "",
        series: [],
        latest: { support1: null, support2: null, resistance1: null, resistance2: null },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: { leftBars: left, rightBars: right },
        isValid: false,
      };
    }

    const swingHighs: number[] = [];
    const swingLows: number[] = [];

    for (let i = left; i < candles.length - right; i++) {
      let isHigh = true;
      let isLow = true;
      const curH = candles[i].high;
      const curL = candles[i].low;

      for (let j = i - left; j <= i + right; j++) {
        if (j === i) continue;
        if (candles[j].high > curH) isHigh = false;
        if (candles[j].low < curL) isLow = false;
      }

      if (isHigh) swingHighs.push(curH);
      if (isLow) swingLows.push(curL);
    }

    const lastClose = candles[candles.length - 1].close;
    const sortedHighs = [...swingHighs].filter((h) => h > lastClose).sort((a, b) => a - b);
    const sortedLows = [...swingLows].filter((l) => l < lastClose).sort((a, b) => b - a);

    const r1 = sortedHighs[0] || null;
    const r2 = sortedHighs[1] || null;
    const s1 = sortedLows[0] || null;
    const s2 = sortedLows[1] || null;

    const series: SupportResistanceResultValue[] = candles.map(() => ({
      support1: s1,
      support2: s2,
      resistance1: r1,
      resistance2: r2,
    }));

    const latest = { support1: s1, support2: s2, resistance1: r1, resistance2: r2 };
    return {
      indicatorId: "support_resistance",
      symbol: "",
      timeframe: "",
      series,
      latest,
      status: "LIVE",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: { leftBars: left, rightBars: right },
      isValid: s1 !== null || r1 !== null,
    };
  },
};
