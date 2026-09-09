import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";

export interface CVDResultValue {
  cvd: number;
  delta: number;
}

export const CVD: IndicatorDefinition<CVDResultValue> = {
  id: "cvd",
  name: "Cumulative Volume Delta",
  shortName: "CVD",
  category: "VOLUME",
  description: "Aggregates buy vs sell market order volume delta to reveal aggressive institutional flow.",
  version: "1.0.0",
  overlay: false,
  requiredCandles: 10,
  supportedTimeframes: ["1m", "3m", "5m", "15m", "30m", "1h"],
  parameters: {},
  calculate: (candles) => {
    const start = performance.now();

    if (!candles || candles.length < 10) {
      return {
        indicatorId: "cvd",
        symbol: "",
        timeframe: "",
        series: [],
        latest: { cvd: 0, delta: 0 },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: {},
        isValid: false,
      };
    }

    let runningCVD = 0;
    const series: CVDResultValue[] = [];

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      let barDelta = 0;

      if (c.buyerMakerRatio !== undefined) {
        // If true taker buy ratio is available from WebSocket
        const buyVol = c.volume * c.buyerMakerRatio;
        const sellVol = c.volume * (1 - c.buyerMakerRatio);
        barDelta = buyVol - sellVol;
      } else {
        // Approximate from candle wick/body pressure
        const range = Math.max(0.01, c.high - c.low);
        const bullRatio = (c.close - c.low) / range;
        const bearRatio = (c.high - c.close) / range;
        barDelta = (bullRatio - bearRatio) * (c.volume || 0);
      }

      runningCVD += barDelta;
      series.push({ cvd: runningCVD, delta: barDelta });
    }

    const latest = series[series.length - 1] || { cvd: 0, delta: 0 };
    return {
      indicatorId: "cvd",
      symbol: "",
      timeframe: "",
      series,
      latest,
      status: "LIVE",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: {},
      isValid: true,
    };
  },
};
