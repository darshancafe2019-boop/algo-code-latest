import { IndicatorPreset } from "./types";

export const STANDARD_INDICATOR_PRESETS: IndicatorPreset[] = [
  {
    id: "preset_dta_confirmation",
    name: "DTA Confluence Suite",
    category: "STRATEGY",
    description: "Multi-timeframe confirmation suite with 200 EMA, Supertrend, VWAP, and RSI.",
    indicators: [
      { id: "ema", timeframe: "15m", parameters: { period: 200 } },
      { id: "supertrend", timeframe: "5m", parameters: { atrPeriod: 10, multiplier: 3.0 } },
      { id: "vwap", timeframe: "5m", parameters: {} },
      { id: "rsi", timeframe: "1m", parameters: { period: 14 } },
      { id: "adx", timeframe: "5m", parameters: { period: 14, threshold: 25 } },
    ],
  },
  {
    id: "preset_trend_following",
    name: "Macro Trend Following",
    category: "TREND",
    description: "Robust trend structure setup with 50/200 EMA cross, Supertrend, and Parabolic SAR.",
    indicators: [
      { id: "ema", timeframe: "1h", parameters: { period: 50 } },
      { id: "ema", timeframe: "1h", parameters: { period: 200 } },
      { id: "supertrend", timeframe: "15m", parameters: { atrPeriod: 10, multiplier: 3.0 } },
      { id: "parabolic_sar", timeframe: "15m", parameters: {} },
      { id: "adx", timeframe: "15m", parameters: { period: 14 } },
    ],
  },
  {
    id: "preset_momentum_breakout",
    name: "Momentum & Breakout",
    category: "MOMENTUM",
    description: "Fast momentum oscillators featuring MACD, RSI, and Bollinger Bandwidth squeeze.",
    indicators: [
      { id: "macd", timeframe: "5m", parameters: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 } },
      { id: "rsi", timeframe: "5m", parameters: { period: 14 } },
      { id: "bollinger", timeframe: "5m", parameters: { period: 20, standardDeviation: 2.0 } },
      { id: "volume", timeframe: "5m", parameters: { smaPeriod: 20 } },
    ],
  },
  {
    id: "preset_scalping_pro",
    name: "1m / 3m Scalping Pro",
    category: "SCALPING",
    description: "High-speed intraday scalping configuration with VWAP, Stochastic, ATR, and CVD.",
    indicators: [
      { id: "vwap", timeframe: "1m", parameters: {} },
      { id: "stochastic", timeframe: "1m", parameters: { kPeriod: 14, kSmoothing: 3, dPeriod: 3 } },
      { id: "atr", timeframe: "1m", parameters: { period: 14 } },
      { id: "cvd", timeframe: "1m", parameters: {} },
    ],
  },
  {
    id: "preset_options_flow",
    name: "Options & Greeks Analytics",
    category: "OPTIONS",
    description: "Derivatives flow tracker measuring Implied Volatility, Option Greeks, Open Interest, and PCR.",
    indicators: [
      { id: "options_iv", timeframe: "15m", parameters: { period: 252 } },
      { id: "option_greeks", timeframe: "5m", parameters: {} },
      { id: "open_interest", timeframe: "5m", parameters: {} },
      { id: "pcr", timeframe: "5m", parameters: {} },
    ],
  },
  {
    id: "preset_crypto_perps",
    name: "Crypto Derivatives & Volatility",
    category: "CRYPTO",
    description: "Designed for Bitcoin & Ethereum perpetuals with Keltner Channels, CVD, and MFI.",
    indicators: [
      { id: "keltner", timeframe: "15m", parameters: { emaPeriod: 20, atrPeriod: 10, multiplier: 2.0 } },
      { id: "cvd", timeframe: "5m", parameters: {} },
      { id: "mfi", timeframe: "15m", parameters: { period: 14 } },
      { id: "obv", timeframe: "15m", parameters: {} },
    ],
  },
];
