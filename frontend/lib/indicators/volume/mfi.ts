import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";

export interface MFIResultValue {
  mfi: number | null;
}

export const MFI: IndicatorDefinition<MFIResultValue> = {
  id: "mfi",
  name: "Money Flow Index",
  shortName: "MFI",
  category: "VOLUME",
  description: "Volume-weighted Relative Strength Index measuring buying and selling pressure.",
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
      min: 2,
      max: 100,
    },
  },
  calculate: (candles, params) => {
    const start = performance.now();
    const period = Number(params?.period) || 14;

    if (!candles || candles.length <= period) {
      return {
        indicatorId: "mfi",
        symbol: "",
        timeframe: "",
        series: [],
        latest: { mfi: null },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: { period },
        isValid: false,
      };
    }

    const tps = candles.map((c) => (c.high + c.low + c.close) / 3);
    const rawMoneyFlow = candles.map((c, i) => tps[i] * (c.volume || 0));

    const series: MFIResultValue[] = [];
    for (let i = 0; i < candles.length; i++) {
      if (i < period) {
        series.push({ mfi: null });
        continue;
      }
      let posFlow = 0;
      let negFlow = 0;

      for (let j = i - period + 1; j <= i; j++) {
        if (j === 0) continue;
        if (tps[j] > tps[j - 1]) {
          posFlow += rawMoneyFlow[j];
        } else if (tps[j] < tps[j - 1]) {
          negFlow += rawMoneyFlow[j];
        }
      }

      const moneyRatio = negFlow === 0 ? 100 : posFlow / negFlow;
      const mfiVal = 100 - 100 / (1 + moneyRatio);
      series.push({ mfi: mfiVal });
    }

    const latest = series[series.length - 1] || { mfi: null };
    let signal: IndicatorSignal | undefined;

    if (latest.mfi !== null) {
      if (latest.mfi >= 80) {
        signal = {
          type: "OVERBOUGHT",
          score: -0.7,
          reason: `MFI Overbought (${latest.mfi.toFixed(1)} >= 80)`,
          timestamp: Date.now(),
        };
      } else if (latest.mfi <= 20) {
        signal = {
          type: "OVERSOLD",
          score: 0.7,
          reason: `MFI Oversold (${latest.mfi.toFixed(1)} <= 20)`,
          timestamp: Date.now(),
        };
      }
    }

    return {
      indicatorId: "mfi",
      symbol: "",
      timeframe: "",
      series,
      latest,
      signal,
      status: "LIVE",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: { period },
      isValid: latest.mfi !== null,
    };
  },
};
