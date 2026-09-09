/**
 * Shared Indicator Engine - Types & Standard Interfaces
 * Production-Grade quantitative indicator framework for Quant.OS.
 */

export interface CandleData {
  timestamp: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  buyerMakerRatio?: number;
  openInterest?: number;
  iv?: number;
}

export type IndicatorCategory =
  | "ALL"
  | "TREND"
  | "MOMENTUM"
  | "VOLATILITY"
  | "VOLUME"
  | "STRENGTH"
  | "STRUCTURE"
  | "OPTIONS";

export type IndicatorCalculationStatus =
  | "LIVE"
  | "STALE"
  | "CALCULATING"
  | "INSUFFICIENT_DATA"
  | "ERROR";

export type SignalType =
  | "BULLISH"
  | "BEARISH"
  | "NEUTRAL"
  | "OVERBOUGHT"
  | "OVERSOLD"
  | "CROSS_UP"
  | "CROSS_DOWN"
  | "STRONG_TREND"
  | "WEAK_TREND";

export interface IndicatorSignal {
  type: SignalType;
  score: number; // -1.0 (strong bear) to +1.0 (strong bull)
  reason: string;
  timestamp: number;
}

export type ParameterType = "number" | "select" | "boolean" | "string";

export interface IndicatorParameterDef {
  name: string;
  label: string;
  type: ParameterType;
  default: any;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ label: string; value: any }>;
  description?: string;
}

export interface IndicatorResult<T = Record<string, number | null>> {
  indicatorId: string;
  symbol: string;
  timeframe: string;
  series: T[];
  latest: T;
  signal?: IndicatorSignal;
  status: IndicatorCalculationStatus;
  timestamp: number;
  executionLatencyMs?: number;
  parameters: Record<string, any>;
  dataSource?: string;
  isValid: boolean;
  errorMessage?: string;
}

export interface OptionsDataFeed {
  iv?: number;
  historicalIv?: number[];
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  oi?: number;
  oiChange?: number;
  callOi?: number;
  putOi?: number;
  callVolume?: number;
  putVolume?: number;
}

export interface IndicatorDefinition<T = Record<string, number | null>> {
  id: string;
  name: string;
  shortName: string;
  category: IndicatorCategory;
  description: string;
  version: string;
  overlay: boolean; // True if rendered on price chart, false if separate sub-chart pane
  parameters: Record<string, IndicatorParameterDef>;
  supportedTimeframes: string[];
  requiredCandles: number;
  calculate: (
    candles: CandleData[],
    params: Record<string, any>,
    optionsData?: OptionsDataFeed
  ) => IndicatorResult<T>;
}

export interface ActiveIndicatorInstance {
  instanceId: string;
  indicatorId: string;
  timeframe: string;
  enabled: boolean;
  visible: boolean;
  parameters: Record<string, any>;
  customColor?: string;
  addedAt: number;
}

export interface StrategyIndicatorRequirement {
  id: string;
  timeframe: string;
  parameters: Record<string, any>;
  optional?: boolean;
}

export interface StrategyIndicatorManifest {
  strategyId: string;
  strategyName: string;
  requiredIndicators: StrategyIndicatorRequirement[];
}

export interface IndicatorPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  indicators: Array<{
    id: string;
    timeframe: string;
    parameters: Record<string, any>;
  }>;
}
