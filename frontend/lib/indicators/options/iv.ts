import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal, OptionsDataFeed } from "../types";

export interface IVResultValue {
  iv: number | null;
  ivRank: number | null;
}

export const IVIndicator: IndicatorDefinition<IVResultValue> = {
  id: "options_iv",
  name: "Implied Volatility & IV Rank",
  shortName: "IV",
  category: "OPTIONS",
  description: "Real-time ATM Implied Volatility percentage and calculated 52-week IV Rank when historical data is available.",
  version: "1.0.0",
  overlay: false,
  requiredCandles: 0,
  supportedTimeframes: ["5m", "15m", "1h", "1d"],
  parameters: {
    period: {
      name: "period",
      label: "Historical IV Rank Lookback",
      type: "number",
      default: 252,
      min: 20,
      max: 500,
    },
  },
  calculate: (candles, params, optionsData) => {
    const start = performance.now();
    const period = Number(params?.period) || 252;

    const curIV = optionsData?.iv ?? (candles.length > 0 ? candles[candles.length - 1].iv ?? null : null);
    let ivRank: number | null = null;

    if (curIV !== null && optionsData?.historicalIv && optionsData.historicalIv.length >= 20) {
      const hist = optionsData.historicalIv.slice(-period);
      const minIV = Math.min(...hist);
      const maxIV = Math.max(...hist);
      if (maxIV > minIV) {
        ivRank = ((curIV - minIV) / (maxIV - minIV)) * 100;
      }
    }

    const latest = { iv: curIV, ivRank };
    let signal: IndicatorSignal | undefined;

    if (ivRank !== null) {
      if (ivRank >= 75) {
        signal = {
          type: "OVERBOUGHT",
          score: -0.6,
          reason: `High IV Rank (${ivRank.toFixed(1)}% >= 75%) - Favorable for Option Selling`,
          timestamp: Date.now(),
        };
      } else if (ivRank <= 25) {
        signal = {
          type: "OVERSOLD",
          score: 0.6,
          reason: `Low IV Rank (${ivRank.toFixed(1)}% <= 25%) - Favorable for Option Buying`,
          timestamp: Date.now(),
        };
      }
    }

    return {
      indicatorId: "options_iv",
      symbol: "",
      timeframe: "",
      series: [latest],
      latest,
      signal,
      status: curIV !== null ? "LIVE" : "INSUFFICIENT_DATA",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: { period },
      isValid: curIV !== null,
    };
  },
};
