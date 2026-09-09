import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";

export interface ATRResultValue {
  atr: number | null;
  tr: number | null;
}

export function calculateATRValues(candles: CandleData[], period: number): (number | null)[] {
  if (!candles || candles.length < period) {
    return new Array(candles?.length || 0).fill(null);
  }

  const trList: number[] = [candles[0].high - candles[0].low];
  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low - candles[i - 1].close);
    trList.push(Math.max(hl, hc, lc));
  }

  const result: (number | null)[] = new Array(candles.length).fill(null);
  let trSum = 0;
  for (let i = 0; i < period; i++) {
    trSum += trList[i];
  }
  let prevATR = trSum / period;
  result[period - 1] = prevATR;

  for (let i = period; i < candles.length; i++) {
    const curATR = (prevATR * (period - 1) + trList[i]) / period;
    result[i] = curATR;
    prevATR = curATR;
  }

  return result;
}

export const ATR: IndicatorDefinition<ATRResultValue> = {
  id: "atr",
  name: "Average True Range",
  shortName: "ATR",
  category: "VOLATILITY",
  description: "Market volatility indicator measuring the true range of price movement over a given period.",
  version: "1.0.0",
  overlay: false,
  requiredCandles: 14,
  supportedTimeframes: ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"],
  parameters: {
    period: {
      name: "period",
      label: "Period",
      type: "number",
      default: 14,
      min: 1,
      max: 100,
    },
  },
  calculate: (candles, params) => {
    const start = performance.now();
    const period = Number(params?.period) || 14;

    if (!candles || candles.length < period) {
      return {
        indicatorId: "atr",
        symbol: "",
        timeframe: "",
        series: [],
        latest: { atr: null, tr: null },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: { period },
        isValid: false,
      };
    }

    const atrValues = calculateATRValues(candles, period);
    const series: ATRResultValue[] = atrValues.map((v, i) => {
      let tr = candles[i].high - candles[i].low;
      if (i > 0) {
        tr = Math.max(
          candles[i].high - candles[i].low,
          Math.abs(candles[i].high - candles[i - 1].close),
          Math.abs(candles[i].low - candles[i - 1].close)
        );
      }
      return { atr: v, tr };
    });

    const latest = series[series.length - 1] || { atr: null, tr: null };

    return {
      indicatorId: "atr",
      symbol: "",
      timeframe: "",
      series,
      latest,
      status: "LIVE",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: { period },
      isValid: latest.atr !== null,
    };
  },
};
