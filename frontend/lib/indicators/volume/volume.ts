import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";
import { calculateSMAValues } from "../trend/sma";

export interface VolumeResultValue {
  volume: number;
  volumeSMA: number | null;
  isBull: boolean;
}

export const VolumeIndicator: IndicatorDefinition<VolumeResultValue> = {
  id: "volume",
  name: "Volume & Volume SMA",
  shortName: "VOL",
  category: "VOLUME",
  description: "Traded contracts/shares volume histogram with customizable moving average overlay.",
  version: "1.0.0",
  overlay: false,
  requiredCandles: 20,
  supportedTimeframes: ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"],
  parameters: {
    smaPeriod: {
      name: "smaPeriod",
      label: "Volume MA Period",
      type: "number",
      default: 20,
      min: 1,
      max: 100,
    },
  },
  calculate: (candles, params) => {
    const start = performance.now();
    const period = Number(params?.smaPeriod) || 20;

    if (!candles || candles.length < period) {
      return {
        indicatorId: "volume",
        symbol: "",
        timeframe: "",
        series: [],
        latest: { volume: 0, volumeSMA: null, isBull: true },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: { smaPeriod: period },
        isValid: false,
      };
    }

    const rawVolumes = candles.map((c) => c.volume || 0);
    const volumeSMAs = calculateSMAValues(rawVolumes, period);

    const series: VolumeResultValue[] = candles.map((c, i) => ({
      volume: c.volume || 0,
      volumeSMA: volumeSMAs[i],
      isBull: c.close >= c.open,
    }));

    const latest = series[series.length - 1] || { volume: 0, volumeSMA: null, isBull: true };
    let signal: IndicatorSignal | undefined;

    if (latest.volumeSMA !== null && latest.volume > latest.volumeSMA * 1.5) {
      signal = {
        type: latest.isBull ? "BULLISH" : "BEARISH",
        score: latest.isBull ? 0.6 : -0.6,
        reason: `Volume Expansion (${(latest.volume / latest.volumeSMA).toFixed(1)}x over ${period} SMA)`,
        timestamp: Date.now(),
      };
    }

    return {
      indicatorId: "volume",
      symbol: "",
      timeframe: "",
      series,
      latest,
      signal,
      status: "LIVE",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: { smaPeriod: period },
      isValid: true,
    };
  },
};
