import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";

export interface CCIResultValue {
  cci: number | null;
}

export const CCI: IndicatorDefinition<CCIResultValue> = {
  id: "cci",
  name: "Commodity Channel Index",
  shortName: "CCI",
  category: "MOMENTUM",
  description: "Versatile indicator identifying cyclical turns in commodities, equities, and crypto.",
  version: "1.0.0",
  overlay: false,
  requiredCandles: 20,
  supportedTimeframes: ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"],
  parameters: {
    period: {
      name: "period",
      label: "Period",
      type: "number",
      default: 20,
      min: 2,
      max: 100,
    },
  },
  calculate: (candles, params) => {
    const start = performance.now();
    const period = Number(params?.period) || 20;

    if (!candles || candles.length < period) {
      return {
        indicatorId: "cci",
        symbol: "",
        timeframe: "",
        series: [],
        latest: { cci: null },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: { period },
        isValid: false,
      };
    }

    const tps = candles.map((c) => (c.high + c.low + c.close) / 3);
    const series: CCIResultValue[] = [];

    for (let i = 0; i < candles.length; i++) {
      if (i < period - 1) {
        series.push({ cci: null });
        continue;
      }
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += tps[j];
      }
      const smaTp = sum / period;

      let meanDevSum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        meanDevSum += Math.abs(tps[j] - smaTp);
      }
      const meanDev = meanDevSum / period;
      const cciVal = meanDev === 0 ? 0 : (tps[i] - smaTp) / (0.015 * meanDev);
      series.push({ cci: cciVal });
    }

    const latest = series[series.length - 1] || { cci: null };
    return {
      indicatorId: "cci",
      symbol: "",
      timeframe: "",
      series,
      latest,
      status: "LIVE",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: { period },
      isValid: latest.cci !== null,
    };
  },
};
