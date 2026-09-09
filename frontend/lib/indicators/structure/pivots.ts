import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";

export interface PivotPointsResultValue {
  pivot: number | null;
  r1: number | null;
  r2: number | null;
  r3: number | null;
  s1: number | null;
  s2: number | null;
  s3: number | null;
}

export const PivotPoints: IndicatorDefinition<PivotPointsResultValue> = {
  id: "pivot_points",
  name: "Pivot Points Standard",
  shortName: "Pivots",
  category: "STRUCTURE",
  description: "Classic horizontal support and resistance benchmark levels calculated from previous period high, low, and close.",
  version: "1.0.0",
  overlay: true,
  requiredCandles: 2,
  supportedTimeframes: ["5m", "15m", "30m", "1h", "4h", "1d"],
  parameters: {
    type: {
      name: "type",
      label: "Calculation Type",
      type: "select",
      default: "standard",
      options: [
        { label: "Standard Floor", value: "standard" },
        { label: "Fibonacci", value: "fibonacci" },
        { label: "Woodie", value: "woodie" },
        { label: "Camarilla", value: "camarilla" },
      ],
    },
  },
  calculate: (candles, params) => {
    const start = performance.now();
    const pivotType = params?.type || "standard";

    if (!candles || candles.length < 2) {
      return {
        indicatorId: "pivot_points",
        symbol: "",
        timeframe: "",
        series: [],
        latest: { pivot: null, r1: null, r2: null, r3: null, s1: null, s2: null, s3: null },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: { type: pivotType },
        isValid: false,
      };
    }

    const series: PivotPointsResultValue[] = [];

    for (let i = 0; i < candles.length; i++) {
      const prev = i === 0 ? candles[0] : candles[i - 1];
      const h = prev.high;
      const l = prev.low;
      const c = prev.close;

      let p = (h + l + c) / 3;
      let r1 = 2 * p - l;
      let s1 = 2 * p - h;
      let r2 = p + (h - l);
      let s2 = p - (h - l);
      let r3 = h + 2 * (p - l);
      let s3 = l - 2 * (h - p);

      if (pivotType === "fibonacci") {
        const range = h - l;
        r1 = p + 0.382 * range;
        s1 = p - 0.382 * range;
        r2 = p + 0.618 * range;
        s2 = p - 0.618 * range;
        r3 = p + 1.0 * range;
        s3 = p - 1.0 * range;
      }

      series.push({ pivot: p, r1, r2, r3, s1, s2, s3 });
    }

    const latest = series[series.length - 1] || { pivot: null, r1: null, r2: null, r3: null, s1: null, s2: null, s3: null };

    return {
      indicatorId: "pivot_points",
      symbol: "",
      timeframe: "",
      series,
      latest,
      status: "LIVE",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: { type: pivotType },
      isValid: latest.pivot !== null,
    };
  },
};
