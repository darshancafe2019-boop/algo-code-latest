/**
 * Comprehensive Unit & Integration Tests for Indicator Engine
 */

import { CandleData } from "../lib/indicators/types";
import { indicatorRegistry } from "../lib/indicators/registry";
import { indicatorEngine } from "../lib/indicators/engine";
import { IndicatorConfluenceEngine } from "../lib/indicators/confluence";
import { indicatorSignalService } from "../lib/indicators/signalService";
import { STANDARD_INDICATOR_PRESETS } from "../lib/indicators/presets";

// Generate synthetic test candles
function generateTestCandles(count: number): CandleData[] {
  const candles: CandleData[] = [];
  let basePrice = 25000.0;
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const t = now - (count - i) * 5 * 60 * 1000;
    const wave = Math.sin(i / 5) * 20;
    const step = i < 30 ? 5 : -4;
    basePrice += step + wave;

    const o = basePrice - 3;
    const c = basePrice + 3;
    const h = Math.max(o, c) + 5;
    const l = Math.min(o, c) - 5;
    const v = 1000 + (i % 5) * 300;

    candles.push({
      timestamp: t,
      open: o,
      high: h,
      low: l,
      close: c,
      volume: v,
      buyerMakerRatio: 0.55,
      openInterest: 150000 + i * 200,
      iv: 14.5 + Math.sin(i / 4) * 2,
    });
  }
  return candles;
}

function runTests() {
  console.log("=== RUNNING INDICATOR ENGINE TESTS ===");

  const testCandles = generateTestCandles(250);
  const shortCandles = generateTestCandles(5);

  // 1. Registry verification
  const allIndicators = indicatorRegistry.getAll();
  console.log(`[TEST 1] Registry contains ${allIndicators.length} registered indicators.`);
  if (allIndicators.length < 20) throw new Error("Expected at least 20 registered indicators");

  // 2. Individual Indicator Tests
  const indicatorsToTest = [
    "ema", "sma", "wma", "vwap", "supertrend", "ichimoku", "parabolic_sar",
    "rsi", "macd", "stochastic", "cci", "williams_r", "roc",
    "adx",
    "atr", "bollinger", "keltner", "standard_deviation",
    "volume", "obv", "mfi", "cvd",
    "pivot_points", "support_resistance",
    "options_iv", "option_greeks", "open_interest", "pcr"
  ];

  for (const id of indicatorsToTest) {
    const def = indicatorRegistry.get(id);
    if (!def) throw new Error(`Missing registered indicator definition: ${id}`);

    // Test with normal data
    const res = indicatorEngine.compute(id, testCandles, {}, {
      iv: 15.2,
      historicalIv: [12, 13, 14, 15, 16, 17, 18, 19, 20],
      delta: 0.52,
      gamma: 0.003,
      theta: -12.5,
      vega: 24.1,
      oi: 250000,
      oiChange: 12000,
      callOi: 130000,
      putOi: 120000,
      callVolume: 50000,
      putVolume: 45000,
    });

    console.log(`  ✓ Indicator [${id.padEnd(20)}] -> Status: ${res.status.padEnd(6)} | Valid: ${res.isValid} | Signal: ${res.signal?.type || "NONE"}`);
    if (!res.isValid && def.requiredCandles <= testCandles.length) {
      throw new Error(`Indicator ${id} returned invalid result on valid candles`);
    }

    // Test with insufficient data (safe degradation)
    const shortRes = indicatorEngine.compute(id, shortCandles);
    if (def.requiredCandles > 5 && shortRes.status !== "INSUFFICIENT_DATA") {
      throw new Error(`Indicator ${id} should have returned INSUFFICIENT_DATA on short series`);
    }
  }

  // 3. Confluence Engine Test
  const suiteResults = [
    indicatorEngine.compute("ema", testCandles, { period: 20 }),
    indicatorEngine.compute("supertrend", testCandles),
    indicatorEngine.compute("rsi", testCandles),
    indicatorEngine.compute("macd", testCandles),
    indicatorEngine.compute("adx", testCandles),
  ];

  const confluence = IndicatorConfluenceEngine.calculateConfluence(suiteResults);
  console.log(`[TEST 3] Confluence Engine Output -> Score: ${confluence.overallScore} | Bias: ${confluence.bias} | Bullish: ${confluence.bullishCount} | Bearish: ${confluence.bearishCount}`);
  if (typeof confluence.overallScore !== "number") throw new Error("Invalid confluence score");

  // 4. Signal Service Strategy Requirements Test
  const dtaReqs = [
    { id: "ema", timeframe: "15m", parameters: { period: 200 } },
    { id: "supertrend", timeframe: "5m", parameters: { atrPeriod: 10, multiplier: 3.0 } },
    { id: "rsi", timeframe: "1m", parameters: { period: 14 } },
  ];

  const candleMap = {
    "15m": generateTestCandles(250),
    "5m": generateTestCandles(100),
    "1m": generateTestCandles(100),
  };

  const strategyEval = indicatorSignalService.evaluateStrategyRequirements(dtaReqs, candleMap, "NIFTY");
  console.log(`[TEST 4] Strategy Requirements -> Satisfied: ${strategyEval.isSatisfied} | Signals count: ${strategyEval.results.size}`);
  if (!strategyEval.isSatisfied) throw new Error("Strategy requirements should be satisfied");

  // 5. Presets Verification
  console.log(`[TEST 5] Standard Presets Count: ${STANDARD_INDICATOR_PRESETS.length}`);
  if (STANDARD_INDICATOR_PRESETS.length < 5) throw new Error("Expected at least 5 standard presets");

  console.log("=== ALL INDICATOR ENGINE TESTS PASSED SUCCESSFULLY ===");
}

runTests();
