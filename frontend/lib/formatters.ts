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
  formatDecimal,
  formatPercent,
  formatCurrency,
  formatPrice,
  formatMoney,
  formatInteger,
  formatQuantity,
  formatPnL,
  formatRatio,
  safeArray,
  safeMap,
} from "./formatters/financial";

export {
  formatNumber,
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

export function formatExactNumber(
  value: unknown,
  fallback: string = "—"
): string {
  const { toFiniteNumber } = require("./formatters/financial");
  const num = toFiniteNumber(value);
  if (num === null) return fallback;
  return num.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

export function formatVolume(
  value: unknown,
  currency: string = "",
  fallback: string = "—"
): string {
  const { toFiniteNumber, normalizeZero } = require("./formatters/financial");
  const num = toFiniteNumber(value);
  if (num === null) return fallback;
  const cleanNum = normalizeZero(num);
  if (cleanNum === 0) return `${currency}0`;
  const abs = Math.abs(cleanNum);
  const sign = cleanNum < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    const val = abs / 1_000_000_000;
    const formatted = val >= 100 ? val.toFixed(0) : val >= 10 ? val.toFixed(1) : val.toFixed(2);
    return `${sign}${currency}${formatted}B`;
  }
  if (abs >= 1_000_000) {
    const val = abs / 1_000_000;
    const formatted = val >= 100 ? val.toFixed(0) : val >= 10 ? val.toFixed(1) : val.toFixed(2);
    return `${sign}${currency}${formatted}M`;
  }
  if (abs >= 1_000) {
    const val = abs / 1_000;
    const formatted = val >= 100 ? val.toFixed(0) : val >= 10 ? val.toFixed(1) : val.toFixed(2);
    return `${sign}${currency}${formatted}K`;
  }
  return `${sign}${currency}${cleanNum.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatCompactMoney(
  value: unknown,
  currency: string = "$",
  fallback: string = "—"
): string {
  return formatVolume(value, currency, fallback);
}
