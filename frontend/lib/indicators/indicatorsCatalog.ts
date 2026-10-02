/**
 * QUANT.OS AUTHORITATIVE 20 INDICATORS CATALOG & RULE COMPILER
 * ==============================================================
 * Comprehensive mathematical indicator definitions, parameters, calculation sources,
 * operators, multi-timeframe rules, and visual logic AST compiler.
 */

export type IndicatorOperator =
  | ">"
  | "<"
  | ">="
  | "<="
  | "=="
  | "!="
  | "CROSSES_ABOVE"
  | "CROSSES_BELOW"
  | "BETWEEN"
  | "RISING"
  | "FALLING";

export type IndicatorSource =
  | "CLOSE"
  | "OPEN"
  | "HIGH"
  | "LOW"
  | "HL2"
  | "HLC3"
  | "OHLC4"
  | "VOLUME";

export type Timeframe =
  | "1m"
  | "3m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "2h"
  | "4h"
  | "1D"
  | "1W";

export interface IndicatorParameterSpec {
  name: string;
  label: string;
  type: "number" | "select" | "source";
  defaultValue: number | string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export interface IndicatorDefinition {
  id: string;
  name: string;
  shortName: string;
  category: "TREND" | "MOMENTUM" | "VOLATILITY" | "VOLUME" | "STRUCTURE";
  description: string;
  defaultTimeframe: Timeframe;
  defaultSource: IndicatorSource;
  parameters: IndicatorParameterSpec[];
  defaultOperator: IndicatorOperator;
  defaultThreshold: number;
  thresholdUnit?: string;
  allowedOperators: IndicatorOperator[];
}

export const CANONICAL_20_INDICATORS: IndicatorDefinition[] = [
  {
    id: "EMA_9",
    name: "Exponential Moving Average (9)",
    shortName: "EMA 9",
    category: "TREND",
    description: "Fast exponential moving average for short-term momentum tracking and dynamic support/resistance.",
    defaultTimeframe: "5m",
    defaultSource: "CLOSE",
    parameters: [
      { name: "period", label: "Period", type: "number", defaultValue: 9, min: 2, max: 200 },
      { name: "offset", label: "Offset", type: "number", defaultValue: 0, min: -10, max: 10 },
    ],
    defaultOperator: "CROSSES_ABOVE",
    defaultThreshold: 0,
    allowedOperators: [">", "<", ">=", "<=", "CROSSES_ABOVE", "CROSSES_BELOW", "RISING", "FALLING"],
  },
  {
    id: "EMA_20",
    name: "Exponential Moving Average (20)",
    shortName: "EMA 20",
    category: "TREND",
    description: "Medium-term baseline for pullbacks, dynamic trend validation, and standard mean reversion.",
    defaultTimeframe: "15m",
    defaultSource: "CLOSE",
    parameters: [
      { name: "period", label: "Period", type: "number", defaultValue: 20, min: 5, max: 300 },
      { name: "offset", label: "Offset", type: "number", defaultValue: 0, min: -10, max: 10 },
    ],
    defaultOperator: ">",
    defaultThreshold: 0,
    allowedOperators: [">", "<", ">=", "<=", "CROSSES_ABOVE", "CROSSES_BELOW", "RISING", "FALLING"],
  },
  {
    id: "EMA_50",
    name: "Exponential Moving Average (50)",
    shortName: "EMA 50",
    category: "TREND",
    description: "Intermediate trend filter separating tactical counter-trend swings from core directional momentum.",
    defaultTimeframe: "1h",
    defaultSource: "CLOSE",
    parameters: [
      { name: "period", label: "Period", type: "number", defaultValue: 50, min: 10, max: 500 },
    ],
    defaultOperator: ">",
    defaultThreshold: 0,
    allowedOperators: [">", "<", ">=", "<=", "CROSSES_ABOVE", "CROSSES_BELOW", "RISING", "FALLING"],
  },
  {
    id: "EMA_200",
    name: "Exponential Moving Average (200)",
    shortName: "EMA 200",
    category: "TREND",
    description: "Macro institutional regime filter defining macro bull (> EMA200) vs macro bear (< EMA200).",
    defaultTimeframe: "1D",
    defaultSource: "CLOSE",
    parameters: [
      { name: "period", label: "Period", type: "number", defaultValue: 200, min: 50, max: 1000 },
    ],
    defaultOperator: ">",
    defaultThreshold: 0,
    allowedOperators: [">", "<", ">=", "<=", "CROSSES_ABOVE", "CROSSES_BELOW", "RISING", "FALLING"],
  },
  {
    id: "SMA",
    name: "Simple Moving Average",
    shortName: "SMA",
    category: "TREND",
    description: "Equal-weighted price average filtering out erratic market noise across higher timeframes.",
    defaultTimeframe: "1h",
    defaultSource: "CLOSE",
    parameters: [
      { name: "period", label: "Period", type: "number", defaultValue: 20, min: 2, max: 500 },
    ],
    defaultOperator: ">",
    defaultThreshold: 0,
    allowedOperators: [">", "<", ">=", "<=", "CROSSES_ABOVE", "CROSSES_BELOW"],
  },
  {
    id: "WMA",
    name: "Weighted Moving Average",
    shortName: "WMA",
    category: "TREND",
    description: "Linearly weighted moving average giving progressive precedence to recent price action.",
    defaultTimeframe: "15m",
    defaultSource: "CLOSE",
    parameters: [
      { name: "period", label: "Period", type: "number", defaultValue: 20, min: 2, max: 200 },
    ],
    defaultOperator: ">",
    defaultThreshold: 0,
    allowedOperators: [">", "<", ">=", "<=", "CROSSES_ABOVE", "CROSSES_BELOW"],
  },
  {
    id: "SUPERTREND",
    name: "Supertrend ATR Trailing Stop",
    shortName: "Supertrend",
    category: "TREND",
    description: "Volatility-adjusted directional trend line computing exact long/short flip levels using ATR bands.",
    defaultTimeframe: "15m",
    defaultSource: "HL2",
    parameters: [
      { name: "period", label: "ATR Period", type: "number", defaultValue: 10, min: 3, max: 50 },
      { name: "multiplier", label: "Multiplier", type: "number", defaultValue: 3.0, min: 0.5, max: 10, step: 0.1 },
    ],
    defaultOperator: "==",
    defaultThreshold: 1, // 1 = Bullish, -1 = Bearish
    allowedOperators: ["==", "!=", "CROSSES_ABOVE", "CROSSES_BELOW"],
  },
  {
    id: "RSI",
    name: "Relative Strength Index (14)",
    shortName: "RSI",
    category: "MOMENTUM",
    description: "Standard Wilder momentum oscillator measuring velocity and magnitude of directional price movements.",
    defaultTimeframe: "15m",
    defaultSource: "CLOSE",
    parameters: [
      { name: "period", label: "Period", type: "number", defaultValue: 14, min: 2, max: 100 },
    ],
    defaultOperator: ">",
    defaultThreshold: 55,
    thresholdUnit: "pts",
    allowedOperators: [">", "<", ">=", "<=", "BETWEEN", "CROSSES_ABOVE", "CROSSES_BELOW"],
  },
  {
    id: "RSI_DIVERGENCE",
    name: "RSI Regular & Hidden Divergence",
    shortName: "RSI Divergence",
    category: "MOMENTUM",
    description: "Algorithmic swing pivot detector identifying bullish/bearish price-to-momentum momentum divergences.",
    defaultTimeframe: "1h",
    defaultSource: "CLOSE",
    parameters: [
      { name: "period", label: "RSI Period", type: "number", defaultValue: 14, min: 5, max: 50 },
      { name: "lookback", label: "Pivot Lookback", type: "number", defaultValue: 5, min: 2, max: 20 },
    ],
    defaultOperator: "==",
    defaultThreshold: 1,
    allowedOperators: ["==", "!="],
  },
  {
    id: "MACD",
    name: "Moving Average Convergence Divergence",
    shortName: "MACD",
    category: "MOMENTUM",
    description: "Trend-following momentum indicator displaying relationship between two exponential moving averages.",
    defaultTimeframe: "15m",
    defaultSource: "CLOSE",
    parameters: [
      { name: "fastPeriod", label: "Fast EMA", type: "number", defaultValue: 12, min: 2, max: 100 },
      { name: "slowPeriod", label: "Slow EMA", type: "number", defaultValue: 26, min: 5, max: 200 },
      { name: "signalPeriod", label: "Signal Period", type: "number", defaultValue: 9, min: 2, max: 50 },
    ],
    defaultOperator: "CROSSES_ABOVE",
    defaultThreshold: 0,
    allowedOperators: [">", "<", ">=", "<=", "CROSSES_ABOVE", "CROSSES_BELOW", "RISING", "FALLING"],
  },
  {
    id: "BOLLINGER_BANDS",
    name: "Bollinger Bands (20, 2.0)",
    shortName: "Bollinger Bands",
    category: "VOLATILITY",
    description: "Volatility envelope standard deviation bands measuring statistical expansion and compression extremes.",
    defaultTimeframe: "15m",
    defaultSource: "CLOSE",
    parameters: [
      { name: "period", label: "SMA Period", type: "number", defaultValue: 20, min: 5, max: 100 },
      { name: "stdDev", label: "StdDev Multiplier", type: "number", defaultValue: 2.0, min: 0.5, max: 4.0, step: 0.1 },
    ],
    defaultOperator: "<",
    defaultThreshold: 0,
    allowedOperators: [">", "<", "CROSSES_ABOVE", "CROSSES_BELOW", "BETWEEN"],
  },
  {
    id: "VOLUME",
    name: "Raw Candle Volume",
    shortName: "Volume",
    category: "VOLUME",
    description: "Executed transaction volume per bar verifying institutional participation on breakout candles.",
    defaultTimeframe: "5m",
    defaultSource: "VOLUME",
    parameters: [],
    defaultOperator: ">",
    defaultThreshold: 100000,
    allowedOperators: [">", "<", ">=", "<="],
  },
  {
    id: "VOLUME_SMA",
    name: "Volume Simple Moving Average",
    shortName: "Volume SMA",
    category: "VOLUME",
    description: "Relative baseline volume average calculating relative volume multipliers (e.g. Volume > 1.5 * Volume SMA20).",
    defaultTimeframe: "15m",
    defaultSource: "VOLUME",
    parameters: [
      { name: "period", label: "Volume Period", type: "number", defaultValue: 20, min: 5, max: 100 },
      { name: "multiplier", label: "Threshold Multiplier", type: "number", defaultValue: 1.5, min: 0.5, max: 5.0, step: 0.1 },
    ],
    defaultOperator: ">",
    defaultThreshold: 1.5,
    allowedOperators: [">", "<", ">=", "<="],
  },
  {
    id: "OBV",
    name: "On-Balance Volume",
    shortName: "OBV",
    category: "VOLUME",
    description: "Cumulative momentum volume indicator measuring institutional accumulation and distribution pressure.",
    defaultTimeframe: "1h",
    defaultSource: "CLOSE",
    parameters: [],
    defaultOperator: "RISING",
    defaultThreshold: 0,
    allowedOperators: [">", "<", "RISING", "FALLING", "CROSSES_ABOVE", "CROSSES_BELOW"],
  },
  {
    id: "PIVOT_POINTS",
    name: "Classic / Fibonacci Pivot Points",
    shortName: "Pivot Points",
    category: "STRUCTURE",
    description: "Intraday mathematical support/resistance levels computed from prior session High, Low, and Close.",
    defaultTimeframe: "1D",
    defaultSource: "HLC3",
    parameters: [
      { name: "type", label: "Calculation Type", type: "select", defaultValue: "CLASSIC", options: ["CLASSIC", "FIBONACCI", "CAMARILLA", "WOODIE"] },
    ],
    defaultOperator: ">",
    defaultThreshold: 0,
    allowedOperators: [">", "<", "CROSSES_ABOVE", "CROSSES_BELOW"],
  },
  {
    id: "VWAP",
    name: "Volume Weighted Average Price",
    shortName: "VWAP",
    category: "VOLUME",
    description: "Intraday institutional benchmark calculating true average price weighted by cumulative executed volume.",
    defaultTimeframe: "5m",
    defaultSource: "HLC3",
    parameters: [
      { name: "sessionReset", label: "Reset Period", type: "select", defaultValue: "SESSION", options: ["SESSION", "WEEKLY", "MONTHLY"] },
    ],
    defaultOperator: ">",
    defaultThreshold: 0,
    allowedOperators: [">", "<", ">=", "<=", "CROSSES_ABOVE", "CROSSES_BELOW"],
  },
  {
    id: "ANCHORED_VWAP",
    name: "Anchored VWAP (AVWAP)",
    shortName: "Anchored VWAP",
    category: "VOLUME",
    description: "Volume Weighted Average Price calculated specifically from a significant event, high, low, or session open anchor.",
    defaultTimeframe: "15m",
    defaultSource: "HLC3",
    parameters: [
      { name: "anchorType", label: "Anchor Type", type: "select", defaultValue: "SESSION_OPEN", options: ["SESSION_OPEN", "WEEKLY_OPEN", "MONTHLY_OPEN", "SWING_HIGH", "SWING_LOW", "CUSTOM_TIMESTAMP"] },
    ],
    defaultOperator: ">",
    defaultThreshold: 0,
    allowedOperators: [">", "<", ">=", "<=", "CROSSES_ABOVE", "CROSSES_BELOW"],
  },
  {
    id: "ATR",
    name: "Average True Range (14)",
    shortName: "ATR",
    category: "VOLATILITY",
    description: "True volatility metric computing average range span across recent bars for dynamic volatility-based stops.",
    defaultTimeframe: "15m",
    defaultSource: "HLC3",
    parameters: [
      { name: "period", label: "Period", type: "number", defaultValue: 14, min: 2, max: 100 },
    ],
    defaultOperator: ">",
    defaultThreshold: 0,
    allowedOperators: [">", "<", ">=", "<=", "RISING", "FALLING"],
  },
  {
    id: "DONCHIAN",
    name: "Donchian Channels (20)",
    shortName: "Donchian Channels",
    category: "STRUCTURE",
    description: "Highest High and Lowest Low price bands over N periods capturing pure Turtle breakout extensions.",
    defaultTimeframe: "1h",
    defaultSource: "HIGH",
    parameters: [
      { name: "period", label: "Lookback Period", type: "number", defaultValue: 20, min: 5, max: 100 },
    ],
    defaultOperator: "CROSSES_ABOVE",
    defaultThreshold: 0,
    allowedOperators: [">", "<", "CROSSES_ABOVE", "CROSSES_BELOW"],
  },
  {
    id: "ADX",
    name: "Average Directional Index (14)",
    shortName: "ADX",
    category: "TREND",
    description: "Quantifies trend strength independently of direction. Values > 25 indicate strong trending regimes.",
    defaultTimeframe: "1h",
    defaultSource: "HLC3",
    parameters: [
      { name: "period", label: "Period", type: "number", defaultValue: 14, min: 2, max: 50 },
    ],
    defaultOperator: ">",
    defaultThreshold: 25,
    thresholdUnit: "pts",
    allowedOperators: [">", "<", ">=", "<=", "RISING", "FALLING"],
  },
];

export interface ActiveIndicatorRuleItem {
  id: string;
  indicatorId: string;
  enabled: boolean;
  timeframe: Timeframe;
  parameters: Record<string, any>;
  source: IndicatorSource;
  operator: IndicatorOperator;
  rightType: "THRESHOLD" | "INDICATOR" | "PRICE";
  rightThreshold?: number;
  rightIndicatorId?: string;
  isMandatory: boolean;
}

export interface RuleGroupNode {
  id: string;
  conjunction: "AND" | "OR";
  isNegated?: boolean; // NOT support
  rules: ActiveIndicatorRuleItem[];
  subGroups?: RuleGroupNode[];
}

export function compileVisualLogicTree(root: RuleGroupNode): { humanReadable: string; machineCode: string } {
  function compileNode(node: RuleGroupNode): string {
    const parts: string[] = [];

    for (const rule of node.rules) {
      if (!rule.enabled) continue;
      const ind = CANONICAL_20_INDICATORS.find((i) => i.id === rule.indicatorId);
      const indName = ind ? `${ind.shortName}[${rule.timeframe}]` : rule.indicatorId;
      const rightStr =
        rule.rightType === "THRESHOLD"
          ? String(rule.rightThreshold ?? 0)
          : rule.rightType === "INDICATOR"
          ? rule.rightIndicatorId || "ANOTHER_INDICATOR"
          : "CURRENT_PRICE";

      parts.push(`${indName} ${rule.operator} ${rightStr}`);
    }

    if (node.subGroups && node.subGroups.length > 0) {
      for (const sg of node.subGroups) {
        const subStr = compileNode(sg);
        if (subStr) parts.push(`(${subStr})`);
      }
    }

    if (parts.length === 0) return "TRUE";
    const joined = parts.join(` ${node.conjunction} `);
    return node.isNegated ? `NOT (${joined})` : joined;
  }

  const humanReadable = compileNode(root);
  const machineCode = JSON.stringify(root);
  return { humanReadable, machineCode };
}
