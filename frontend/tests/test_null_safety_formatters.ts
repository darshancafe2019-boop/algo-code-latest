/**
 * Production Null-Safety & Greeks Formatter Unit Tests
 * ====================================================
 * Validates that all formatters and normalizers tolerate:
 * - null
 * - undefined
 * - NaN
 * - Infinity / -Infinity
 * - 0 / 0.0
 * - numeric strings
 * - invalid strings
 * 
 * Invariant: Never throws TypeError: Cannot read properties of null / undefined (reading 'toFixed')
 */

import {
  formatGreek,
  formatPrice,
  formatPercent,
  formatNumber,
  formatInteger,
  formatCurrency,
  toNumeric,
  normalizeOptionGreeks,
  normalizeOptionQuote,
} from "../lib/formatters/numbers";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

async function runNullSafetyTests() {
  console.log("\n=======================================================");
  console.log("RUNNING PRODUCTION NULL-SAFETY & FORMATTER UNIT TESTS");
  console.log("=======================================================\n");

  // ── TEST 1: toNumeric Helper ──
  console.log("--- 1. Testing toNumeric Null Safety ---");
  assert(toNumeric(null) === null, "toNumeric(null) === null");
  assert(toNumeric(undefined) === null, "toNumeric(undefined) === null");
  assert(toNumeric(NaN) === null, "toNumeric(NaN) === null");
  assert(toNumeric(Infinity) === null, "toNumeric(Infinity) === null");
  assert(toNumeric(-Infinity) === null, "toNumeric(-Infinity) === null");
  assert(toNumeric("—") === null, "toNumeric('—') === null");
  assert(toNumeric("N/A") === null, "toNumeric('N/A') === null");
  assert(toNumeric("") === null, "toNumeric('') === null");
  assert(toNumeric(0) === 0, "toNumeric(0) === 0 (preserves true zero)");
  assert(toNumeric(123.45) === 123.45, "toNumeric(123.45) === 123.45");
  assert(toNumeric("123.45") === 123.45, "toNumeric('123.45') === 123.45");

  // ── TEST 2: formatGreek Null Safety ──
  console.log("\n--- 2. Testing formatGreek Null Safety ---");
  assert(formatGreek(null, 3) === "—", "formatGreek(null, 3) -> '—' (No crash on null)");
  assert(formatGreek(undefined, 4) === "—", "formatGreek(undefined, 4) -> '—'");
  assert(formatGreek(NaN, 4) === "—", "formatGreek(NaN, 4) -> '—'");
  assert(formatGreek(Infinity, 4) === "—", "formatGreek(Infinity, 4) -> '—'");
  assert(formatGreek(0, 3) === "0.000", "formatGreek(0, 3) -> '0.000' (preserves zero)");
  assert(formatGreek(0.523456, 4) === "0.5235", "formatGreek(0.523456, 4) -> '0.5235'");
  assert(formatGreek(-0.4128, 3) === "-0.413", "formatGreek(-0.4128, 3) -> '-0.413'");

  // ── TEST 3: formatPrice & formatCurrency Null Safety ──
  console.log("\n--- 3. Testing formatPrice & formatCurrency Null Safety ---");
  assert(formatPrice(null, "₹", 2) === "—", "formatPrice(null, '₹', 2) -> '—'");
  assert(formatPrice(undefined, "$", 2) === "—", "formatPrice(undefined, '$', 2) -> '—'");
  assert(formatPrice(NaN, "$", 2) === "—", "formatPrice(NaN, '$', 2) -> '—'");
  assert(formatPrice(0, "$", 2) === "$0.00", "formatPrice(0, '$', 2) -> '$0.00'");
  assert(formatPrice(24850.5, "₹", 2) === "₹24,850.50", "formatPrice(24850.5, '₹', 2) -> '₹24,850.50'");
  assert(formatCurrency(78500.25, "$", 2) === "$78,500.25", "formatCurrency(78500.25, '$', 2) -> '$78,500.25'");

  // ── TEST 4: formatPercent Null Safety ──
  console.log("\n--- 4. Testing formatPercent Null Safety ---");
  assert(formatPercent(null, 2) === "—", "formatPercent(null, 2) -> '—'");
  assert(formatPercent(undefined, 2) === "—", "formatPercent(undefined, 2) -> '—'");
  assert(formatPercent(NaN, 2) === "—", "formatPercent(NaN, 2) -> '—'");
  assert(formatPercent(0, 2) === "0.00%", "formatPercent(0, 2) -> '0.00%'");
  assert(formatPercent(14.5, 2) === "14.50%", "formatPercent(14.5, 2) -> '14.50%'");
  assert(formatPercent(0.145, 2, "—", true) === "14.50%", "formatPercent(0.145, 2, '—', true) -> '14.50%'");

  // ── TEST 5: formatNumber & formatInteger Null Safety ──
  console.log("\n--- 5. Testing formatNumber & formatInteger Null Safety ---");
  assert(formatNumber(null, 2) === "—", "formatNumber(null, 2) -> '—'");
  assert(formatNumber(undefined, 2) === "—", "formatNumber(undefined, 2) -> '—'");
  assert(formatNumber(12.3456, 2) === "12.35", "formatNumber(12.3456, 2) -> '12.35'");
  assert(formatInteger(null) === "—", "formatInteger(null) -> '—'");
  assert(formatInteger(15420) === "15,420", "formatInteger(15420) -> '15,420'");

  // ── TEST 6: normalizeOptionGreeks & normalizeOptionQuote ──
  console.log("\n--- 6. Testing Option Normalizer Functions ---");
  const emptyGreeks = normalizeOptionGreeks(null);
  assert(emptyGreeks.delta === null, "emptyGreeks.delta === null");
  assert(emptyGreeks.gamma === null, "emptyGreeks.gamma === null");
  assert(emptyGreeks.iv === null, "emptyGreeks.iv === null");

  const partialGreeks = normalizeOptionGreeks({
    iv: 18.5,
    delta: "0.45",
    gamma: null,
    theta: undefined,
    vega: NaN,
  });
  assert(partialGreeks.iv === 18.5, "partialGreeks.iv === 18.5");
  assert(partialGreeks.delta === 0.45, "partialGreeks.delta === 0.45 (numeric string converted)");
  assert(partialGreeks.gamma === null, "partialGreeks.gamma === null (null preserved)");
  assert(partialGreeks.theta === null, "partialGreeks.theta === null (undefined normalized)");
  assert(partialGreeks.vega === null, "partialGreeks.vega === null (NaN normalized)");

  console.log("\n=======================================================");
  console.log("ALL NULL-SAFETY FORMATTER UNIT TESTS PASSED! ✅");
  console.log("=======================================================\n");
}

runNullSafetyTests().catch((err) => {
  console.error("Null safety tests failed:", err);
  process.exit(1);
});
