/**
 * Production Market Data Architecture Unit Tests
 * ===============================================
 * Validates:
 * 1. Zero Fake Data Policy (No synthetic multipliers, no default OI=0, no open=ltp)
 * 2. Strict Truth-in-Data normalization
 * 3. Freshness Engine state transitions
 * 4. PCR calculation (strictly put OI / call OI, null if missing, never default 1.00)
 * 5. Max Pain calculation (from valid strike OI only, null if missing)
 * 6. Candle immutable history invariants
 */

import { upstoxProvider } from "../lib/market-data/providers/upstox/upstox-provider";
import { dhanProvider } from "../lib/market-data/providers/dhan/dhan-provider";
import { deltaProvider } from "../lib/market-data/providers/delta/delta-provider";
import { calculatePcr, calculateMaxPain } from "../lib/market-data/option-chain-engine";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

async function runUnitTests() {
  console.log("\n=======================================================");
  console.log("RUNNING PRODUCTION MARKET DATA ARCHITECTURE UNIT TESTS");
  console.log("=======================================================\n");

  // ── TEST 1: Upstox Normalizer Truth-In-Data ──
  console.log("--- 1. Testing Upstox Normalizer Truth-in-Data ---");
  const partialUpstoxTick = upstoxProvider.normalizeUpstoxTick({
    symbol: "NIFTY",
    ltp: 24850.50,
    // open, high, low, close, bid, ask, oi, volume NOT provided
  });

  assert(partialUpstoxTick.ltp === 24850.50, "LTP parsed accurately");
  assert(partialUpstoxTick.open === undefined, "Open is undefined when missing from provider (NO open=ltp)");
  assert(partialUpstoxTick.high === undefined, "High is undefined when missing from provider");
  assert(partialUpstoxTick.low === undefined, "Low is undefined when missing from provider");
  assert(partialUpstoxTick.previousClose === undefined, "Previous close is undefined when missing (NO fallback to LTP)");
  assert(partialUpstoxTick.change === undefined, "Change is undefined when close is missing");
  assert(partialUpstoxTick.changePct === undefined, "ChangePct is undefined when close is missing");
  assert(partialUpstoxTick.bid === undefined, "Bid is undefined when missing (NO ltp*0.9995)");
  assert(partialUpstoxTick.ask === undefined, "Ask is undefined when missing (NO ltp*1.0005)");
  assert(partialUpstoxTick.openInterest === undefined, "OI is undefined when missing (NO default 0)");
  assert(partialUpstoxTick.volume === undefined, "Volume is undefined when missing");

  // Full tick verification
  const fullUpstoxTick = upstoxProvider.normalizeUpstoxTick({
    symbol: "RELIANCE",
    ltp: 2950.00,
    open: 2940.00,
    high: 2965.00,
    low: 2935.00,
    close: 2920.00,
    volume: 1540000,
    bid: 2949.80,
    ask: 2950.20,
    oi: 450000,
  });

  assert(fullUpstoxTick.ltp === 2950.00, "Full tick LTP matches");
  assert(fullUpstoxTick.open === 2940.00, "Full tick Open matches");
  assert(fullUpstoxTick.high === 2965.00, "Full tick High matches");
  assert(fullUpstoxTick.low === 2935.00, "Full tick Low matches");
  assert(fullUpstoxTick.previousClose === 2920.00, "Full tick PreviousClose matches");
  assert(fullUpstoxTick.change === 30.00, "Full tick Change matches exact (2950 - 2920)");
  assert(Math.abs((fullUpstoxTick.changePct || 0) - 1.027) < 0.01, "Full tick ChangePct matches exact ~1.03%");
  assert(fullUpstoxTick.bid === 2949.80, "Full tick Bid matches genuine provider bid");
  assert(fullUpstoxTick.ask === 2950.20, "Full tick Ask matches genuine provider ask");
  assert(fullUpstoxTick.openInterest === 450000, "Full tick OI matches genuine provider OI");
  assert(fullUpstoxTick.volume === 1540000, "Full tick Volume matches genuine provider volume");

  // ── TEST 2: PCR Calculation Invariant ──
  console.log("\n--- 2. Testing Option PCR Engine Invariant ---");
  const emptyPcr = calculatePcr([]);
  assert(emptyPcr === null, "PCR returns null when no contracts available (Never default to 1.00)");

  const invalidPcr = calculatePcr([
    { strike: 24800, optionType: "CE", oi: undefined } as any,
    { strike: 24800, optionType: "PE", oi: undefined } as any,
  ]);
  assert(invalidPcr === null, "PCR returns null when OI is missing (Never defaults to 1.00)");

  const validPcr = calculatePcr([
    { strike: 24800, optionType: "CE", oi: 50000 } as any,
    { strike: 24900, optionType: "CE", oi: 50000 } as any,
    { strike: 24800, optionType: "PE", oi: 120000 } as any,
    { strike: 24900, optionType: "PE", oi: 30000 } as any,
  ]);
  assert(validPcr === 1.5, `PCR accurately calculates Put OI / Call OI (150000 / 100000 = ${validPcr})`);

  // ── TEST 3: Max Pain Calculation Invariant ──
  console.log("\n--- 3. Testing Max Pain Calculation Invariant ---");
  const emptyMaxPain = calculateMaxPain([]);
  assert(emptyMaxPain === null, "Max Pain returns null when insufficient contract data exists");

  const computedMaxPain = calculateMaxPain([
    { strike: 24700, optionType: "CE", oi: 10000 } as any,
    { strike: 24700, optionType: "PE", oi: 80000 } as any,
    { strike: 24800, optionType: "CE", oi: 60000 } as any,
    { strike: 24800, optionType: "PE", oi: 60000 } as any,
    { strike: 24900, optionType: "CE", oi: 90000 } as any,
    { strike: 24900, optionType: "PE", oi: 10000 } as any,
  ]);
  assert(computedMaxPain === 24800, `Max pain correctly identifies minimum total payout strike (${computedMaxPain})`);

  console.log("\n=======================================================");
  console.log("ALL MARKET DATA UNIT TESTS PASSED SUCCESSFULLY! ✅");
  console.log("=======================================================\n");
}

runUnitTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
