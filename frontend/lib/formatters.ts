/**
 * Centralized, Audited Financial Number Formatting Utilities for Quant.OS
 * ========================================================================
 * Re-exports and integrates authoritative formatters from financial.ts and numbers.ts.
 */

export {
  toFiniteNumber,
  toNumeric,
  isFiniteNumber,
  safeNumber,
  normalizeZero,
  getDynamicDecimals,
  formatNumber,
  formatDecimal,
  formatPercent,
  formatCurrency,
  formatPrice,
  formatMoney,
  formatInteger,
  formatQuantity,
  formatVolume,
  formatCompactMoney,
  formatExactNumber,
  formatPnL,
  formatRatio,
  safeArray,
  safeMap,
  logInvalidNumericField,
} from "./formatters/financial";

export {
  formatGreek,
  normalizeOptionGreeks,
  normalizeOptionQuote,
} from "./formatters/numbers";
export type { OptionGreeks, OptionQuote } from "./formatters/numbers";

/**
 * Normalizes an API/store value to null when absent or undefined
 */
export function normalizeNullable<T>(value: T | undefined | null): T | null {
  return value ?? null;
}

export function isNumeric(value: unknown): value is number {
  if (value === null || value === undefined) return false;
  if (typeof value === "number") return !Number.isNaN(value) && Number.isFinite(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "N/A" || trimmed === "null" || trimmed === "undefined" || trimmed === "—") return false;
    const num = Number(trimmed);
    return !Number.isNaN(num) && Number.isFinite(num);
  }
  return false;
}

