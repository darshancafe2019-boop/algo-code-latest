import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";

export interface OBVResultValue {
  obv: number;
}

export const OBV: IndicatorDefinition<OBVResultValue> = {
  id: "obv",
  name: "On-Balance Volume",
  shortName: "OBV",
  category: "VOLUME",
  description: "Cumulative volume momentum indicator relating volume flow to price change.",
  version: "1.0.0",
  overlay: false,
  requiredCandles: 10,
  supportedTimeframes: ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"],
  parameters: {},
  calculate: (candles) => {
    const start = performance.now();

    if (!candles || candles.length < 10) {
      return {
        indicatorId: "obv",
        symbol: "",
        timeframe: "",
        series: [],
        latest: { obv: 0 },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: {},
        isValid: false,
      };
    }

    const series: OBVResultValue[] = [{ obv: candles[0].volume || 0 }];
    let curOBV = candles[0].volume || 0;

    for (let i = 1; i < candles.length; i++) {
      const prevClose = candles[i - 1].close;
      const curClose = candles[i].close;
      const vol = candles[i].volume || 0;

      if (curClose > prevClose) {
        curOBV += vol;
      } else if (curClose < prevClose) {
        curOBV -= vol;
      }
      series.push({ obv: curOBV });
    }

    const latest = series[series.length - 1] || { obv: 0 };
    return {
      indicatorId: "obv",
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
