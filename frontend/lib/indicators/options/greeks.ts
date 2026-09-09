import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal, OptionsDataFeed } from "../types";

export interface GreeksResultValue {
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
}

export const OptionGreeks: IndicatorDefinition<GreeksResultValue> = {
  id: "option_greeks",
  name: "Option Greeks Matrix",
  shortName: "Greeks",
  category: "OPTIONS",
  description: "Live option sensitivity measures: Delta (directional exposure), Gamma, Theta (time decay), and Vega.",
  version: "1.0.0",
  overlay: false,
  requiredCandles: 0,
  supportedTimeframes: ["1m", "5m", "15m", "1h", "1d"],
  parameters: {},
  calculate: (candles, params, optionsData) => {
    const start = performance.now();
    const latest = {
      delta: optionsData?.delta ?? null,
      gamma: optionsData?.gamma ?? null,
      theta: optionsData?.theta ?? null,
      vega: optionsData?.vega ?? null,
    };

    return {
      indicatorId: "option_greeks",
      symbol: "",
      timeframe: "",
      series: [latest],
      latest,
      status: latest.delta !== null ? "LIVE" : "INSUFFICIENT_DATA",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: {},
      isValid: latest.delta !== null,
    };
  },
};
