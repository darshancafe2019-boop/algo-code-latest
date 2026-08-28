/**
 * Market State Analyzer
 * =====================
 * Ingests multi-timeframe price action, technical indicators,
 * volatility metrics, PCR, Max Pain, and liquidity data to synthesize
 * an authoritative, deterministic Market State & Regime analysis.
 */

import {
  MarketContext,
  MarketRegime,
  DirectionalBias,
  VolatilityExpectation,
  ExpectedMagnitude,
} from "../strategies/base/StrategyTypes";

export interface AnalyzedMarketState {
  underlying: string;
  spotPrice: number;
  regime: MarketRegime;
  bias: DirectionalBias;
  volatilityExpectation: VolatilityExpectation;
  expectedMagnitude: ExpectedMagnitude;
  confidence: number;
  trendStrength: number; // 0 - 100
  momentumScore: number; // -100 to +100
  volatilityScore: number; // 0 - 100
  liquidityScore: number; // 0 - 100
  keyLevels: {
    support: number;
    resistance: number;
    maxPain: number;
    atmStrike: number;
  };
  metrics: {
    rsi: number;
    pcrOi: number;
    ivRank: number;
    atrPct: number;
    emaTrend: "STRONG_UP" | "UP" | "FLAT" | "DOWN" | "STRONG_DOWN";
  };
  dataAvailability: {
    spot: boolean;
    candles: boolean;
    indicators: boolean;
    chain: boolean;
    volatility: boolean;
    confidenceDeduction: number;
  };
  timestamp: string;
}

export class MarketStateAnalyzer {
  /**
   * Analyze the full market context and return an authoritative AnalyzedMarketState.
   */
  public static analyze(context: MarketContext): AnalyzedMarketState {
    const { spotPrice, indicators, volatility, optionChain, dataQuality } = context;

    // 1. Data Quality & Availability Audit
    let confidenceDeduction = 0;
    if (!dataQuality.indicatorsAvailable) confidenceDeduction += 15;
    if (!dataQuality.chainAvailable) confidenceDeduction += 20;
    if (dataQuality.isStale) confidenceDeduction += 15;

    // Extract core metrics with safe fallbacks
    const rsi = indicators?.rsi14 ?? 50.0;
    const ema20 = indicators?.ema20 ?? spotPrice;
    const ema50 = indicators?.ema50 ?? spotPrice;
    const ema200 = indicators?.ema200 ?? spotPrice;
    const atr = indicators?.atr14 ?? spotPrice * 0.015;
    const adx = indicators?.adx14 ?? 20.0;
    const ivRank = volatility?.ivRank ?? 45.0;
    const pcrOi = optionChain?.pcrOi ?? 1.0;
    const maxPain = optionChain?.maxPain ?? spotPrice;
    const step = optionChain?.stepSize || (spotPrice > 40000 ? 500 : spotPrice > 15000 ? 100 : 50);
    const atmStrike = optionChain?.atmStrike || Math.round(spotPrice / step) * step;

    const atrPct = (atr / Math.max(1, spotPrice)) * 100;

    // 2. Trend & Moving Average Structure
    let emaTrend: "STRONG_UP" | "UP" | "FLAT" | "DOWN" | "STRONG_DOWN" = "FLAT";
    let trendScore = 50;

    if (spotPrice > ema20 && ema20 > ema50 && ema50 > ema200) {
      emaTrend = "STRONG_UP";
      trendScore = 90;
    } else if (spotPrice > ema20 && ema20 >= ema50) {
      emaTrend = "UP";
      trendScore = 75;
    } else if (spotPrice < ema20 && ema20 < ema50 && ema50 < ema200) {
      emaTrend = "STRONG_DOWN";
      trendScore = 10;
    } else if (spotPrice < ema20 && ema20 <= ema50) {
      emaTrend = "DOWN";
      trendScore = 25;
    } else {
      emaTrend = "FLAT";
      trendScore = 50;
    }

    // 3. Momentum Score (-100 to +100)
    let momentum = (rsi - 50) * 2; // -100 (oversold) to +100 (overbought)
    if (indicators?.macd) {
      if (indicators.macd.histogram > 0) momentum += 15;
      if (indicators.macd.histogram < 0) momentum -= 15;
    }
    momentum = Math.max(-100, Math.min(100, momentum));

    // 4. Directional Bias
    let bias: DirectionalBias = "NEUTRAL";
    if (trendScore >= 75 && momentum > 10) {
      bias = "BULLISH";
    } else if (trendScore <= 25 && momentum < -10) {
      bias = "BEARISH";
    } else if (adx < 20 || (trendScore >= 40 && trendScore <= 60)) {
      bias = "NEUTRAL";
    } else {
      bias = "UNCERTAIN";
    }

    // 5. Volatility Expectation
    let volatilityExpectation: VolatilityExpectation = "NEUTRAL";
    if (ivRank > 65) {
      volatilityExpectation = "FALLING"; // IV crush expected
    } else if (ivRank < 35) {
      volatilityExpectation = "RISING"; // Vol expansion expected
    } else if (atrPct > 2.5) {
      volatilityExpectation = "HIGH";
    } else if (atrPct < 1.0) {
      volatilityExpectation = "LOW";
    }

    // 6. Expected Magnitude
    let expectedMagnitude: ExpectedMagnitude = "MODERATE";
    if (atrPct >= 2.5 || ivRank < 30) {
      expectedMagnitude = "LARGE";
    } else if (atrPct < 1.0 && adx < 18) {
      expectedMagnitude = "SMALL";
    }

    // 7. Market Regime Synthesis
    let regime: MarketRegime = "NEUTRAL";
    if (bias === "BULLISH" && trendScore >= 85) {
      regime = "STRONG_BULLISH";
    } else if (bias === "BULLISH") {
      regime = "BULLISH";
    } else if (bias === "BEARISH" && trendScore <= 15) {
      regime = "STRONG_BEARISH";
    } else if (bias === "BEARISH") {
      regime = "BEARISH";
    } else if (volatilityExpectation === "RISING" && expectedMagnitude === "LARGE") {
      regime = "HIGH_VOLATILITY";
    } else if (adx < 22 && Math.abs(momentum) < 25) {
      regime = "RANGE_BOUND";
    } else if (ivRank < 30) {
      regime = "LOW_VOLATILITY";
    }

    // Base confidence
    let baseConfidence = 85 - confidenceDeduction;
    if (adx >= 25) baseConfidence += 5;
    if (optionChain && optionChain.strikes.length >= 10) baseConfidence += 5;
    const finalConfidence = Math.max(20, Math.min(98, baseConfidence));

    // Support and Resistance zones
    const support = Math.round((spotPrice - atr * 1.5) / step) * step;
    const resistance = Math.round((spotPrice + atr * 1.5) / step) * step;

    return {
      underlying: context.underlying,
      spotPrice,
      regime,
      bias,
      volatilityExpectation,
      expectedMagnitude,
      confidence: finalConfidence,
      trendStrength: trendScore,
      momentumScore: Math.round(momentum),
      volatilityScore: Math.round(ivRank),
      liquidityScore: 90,
      keyLevels: {
        support,
        resistance,
        maxPain,
        atmStrike,
      },
      metrics: {
        rsi: Math.round(rsi * 10) / 10,
        pcrOi: Math.round(pcrOi * 100) / 100,
        ivRank: Math.round(ivRank),
        atrPct: Math.round(atrPct * 100) / 100,
        emaTrend,
      },
      dataAvailability: {
        spot: dataQuality.spotAvailable,
        candles: dataQuality.indicatorsAvailable,
        indicators: dataQuality.indicatorsAvailable,
        chain: dataQuality.chainAvailable,
        volatility: !!volatility,
        confidenceDeduction,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
