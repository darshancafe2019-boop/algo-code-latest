/**
 * Production-Grade Centralized Financial Number Formatters & Protective Utilities for Quant.OS
 * ==============================================================================================
 * Guarantees zero runtime crashes from null / undefined / NaN / Infinity / string values.
 * 
 * Rules:
 * - Valid finite number -> formatted cleanly according to precision & locale (e.g. "₹24,850.50", "+1.42%")
 * - Numeric string -> safely parsed into finite number and formatted
 * - null / undefined / NaN / Infinity / whitespace / "N/A" -> returns "—" (or specified fallback)
 * - True numeric 0 -> formatted as "₹0.00", "0.00%", "0" (NEVER substituted with "—")
 * - Missing/uninitialized live market data must render "—" and NEVER fabricate $0.00 / ₹0.00
 */

/**
 * Safely parses any input into a finite number or returns null.
 * Handles numbers, numeric strings, empty strings, whitespace, NaN, Infinity, -Infinity.
 */
export function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return !Number.isNaN(value) && Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      trimmed === "" ||
      trimmed === "N/A" ||
      trimmed === "null" ||
      trimmed === "undefined" ||
      trimmed === "—" ||
      trimmed === "-" ||
      trimmed === "NaN" ||
      trimmed === "Infinity" ||
      trimmed === "-Infinity"
    ) {
      return null;
    }
    // Strip common currency symbols or commas if present (e.g. "$1,234.50" or "₹24,000")
    const cleanStr = trimmed.replace(/^[₹$€£]/, "").replace(/,/g, "").trim();
    const parsed = Number(cleanStr);
    return !Number.isNaN(parsed) && Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Backward-compatible alias for toFiniteNumber.
 */
export const toNumeric = toFiniteNumber;

/**
 * Checks if a value is a valid, non-null, finite number.
 */
export function isFiniteNumber(value: unknown): value is number {
  return toFiniteNumber(value) !== null;
}

/**
 * Ensures a value is a finite number, returning a safe default if not.
 * Use ONLY when a calculation requires a numeric fallback and cannot accept null.
 */
export function safeNumber(value: unknown, fallback: number = 0): number {
  const num = toFiniteNumber(value);
  return num !== null ? num : fallback;
}

/**
 * Protects floating-point noise around zero (e.g. 1e-15 -> 0).
 */
export function normalizeZero(value: number, epsilon: number = 1e-12): number {
  return Math.abs(value) < epsilon ? 0 : value;
}

/**
 * Dynamically resolves decimal precision based on magnitude (e.g. crypto micro-prices).
 */
export function getDynamicDecimals(num: number, explicitDecimals?: number): number {
  if (explicitDecimals !== undefined && explicitDecimals !== null) return explicitDecimals;
  const abs = Math.abs(num);
  if (abs === 0) return 2;
  if (abs < 0.000001) return 8; // e.g. 0.00000085
  if (abs < 0.0001) return 8;   // e.g. 0.00001234 (PEPE, SHIB)
  if (abs < 0.01) return 6;     // e.g. 0.001234
  if (abs < 1.0) return 4;      // e.g. 0.1234
  if (abs < 10.0) return 3;     // e.g. 3.456
  return 2;                     // e.g. 64,250.50
}

/**
 * Formats a generic decimal number.
 * e.g. formatDecimal(12.3456, 2) -> "12.35"
 *      formatDecimal(null) -> "—"
 */
export function formatDecimal(
  value: unknown,
  decimals: number = 2,
  fallback: string = "—"
): string {
  const num = toFiniteNumber(value);
  if (num === null) return fallback;
  const cleanNum = normalizeZero(num);
  return cleanNum.toFixed(decimals);
}

/**
 * Formats a percentage value with flexible parameter ordering.
 * Supports both signatures:
 *   formatPercent(value, decimals, includeSign, fallback)
 *   formatPercent(value, decimals, fallback, isDecimal, includeSign)
 */
export function formatPercent(
  value: unknown,
  decimals: number = 2,
  includeSignOrFallback: boolean | string = false,
  fallbackOrIsDecimal: string | boolean = "—",
  includeSignParam: boolean = false
): string {
  const num = toFiniteNumber(value);
  let includeSign = false;
  let fallback = "—";
  let isDecimal = false;

  if (typeof includeSignOrFallback === "boolean") {
    includeSign = includeSignOrFallback;
    fallback = typeof fallbackOrIsDecimal === "string" ? fallbackOrIsDecimal : "—";
    isDecimal = typeof fallbackOrIsDecimal === "boolean" ? fallbackOrIsDecimal : false;
  } else if (typeof includeSignOrFallback === "string") {
    fallback = includeSignOrFallback;
    isDecimal = typeof fallbackOrIsDecimal === "boolean" ? fallbackOrIsDecimal : false;
    includeSign = includeSignParam;
  }

  if (num === null) return fallback;
  const cleanNum = normalizeZero(isDecimal ? num * 100 : num);
  const sign = includeSign && cleanNum > 0 ? "+" : "";
  return `${sign}${cleanNum.toFixed(decimals)}%`;
}

/**
 * Formats a currency value with locale formatting (default INR "₹" or USD "$").
 * e.g. formatCurrency(24850.5, "₹", 2) -> "₹24,850.50"
 *      formatCurrency(null) -> "—"
 */
export function formatCurrency(
  value: unknown,
  currency: string = "₹",
  decimals: number = 2,
  fallback: string = "—"
): string {
  const num = toFiniteNumber(value);
  if (num === null) return fallback;
  const cleanNum = normalizeZero(num);
  const locale = currency === "₹" ? "en-IN" : "en-US";
  const formatted = Math.abs(cleanNum).toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const prefix = cleanNum < 0 ? `-${currency}` : currency;
  return `${prefix}${formatted}`;
}

/**
 * Formats price with dynamic precision for small fractions.
 */
export function formatPrice(
  value: unknown,
  currency: string = "₹",
  decimals?: number,
  fallback: string = "—"
): string {
  const num = toFiniteNumber(value);
  if (num === null) return fallback;
  const cleanNum = normalizeZero(num);
  const resolvedDecimals = getDynamicDecimals(cleanNum, decimals);
  const locale = currency === "₹" ? "en-IN" : "en-US";
  const formatted = Math.abs(cleanNum).toLocaleString(locale, {
    minimumFractionDigits: resolvedDecimals,
    maximumFractionDigits: resolvedDecimals,
  });
  const prefix = cleanNum < 0 ? `-${currency}` : currency;
  return `${prefix}${formatted}`;
}

/**
 * Formats monetary amounts. Alias for formatPrice.
 */
export function formatMoney(
  value: unknown,
  currency: string = "₹",
  decimals?: number,
  fallback: string = "—"
): string {
  return formatPrice(value, currency, decimals, fallback);
}

/**
 * Formats an integer / rounded whole count.
 * e.g. formatInteger(15000) -> "15,000"
 *      formatInteger(null) -> "—"
 */
export function formatInteger(
  value: unknown,
  fallback: string = "—",
  locale: string = "en-IN"
): string {
  const num = toFiniteNumber(value);
  if (num === null) return fallback;
  return Math.round(num).toLocaleString(locale);
}

/**
 * Formats asset volume or quantity with compact suffixes (K, M, B).
 */
export function formatQuantity(
  value: unknown,
  fallback: string = "—"
): string {
  const num = toFiniteNumber(value);
  if (num === null) return fallback;
  const cleanNum = normalizeZero(num);
  if (cleanNum === 0) return "0";
  const abs = Math.abs(cleanNum);
  const sign = cleanNum < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    const val = abs / 1_000_000_000;
    const formatted = val >= 100 ? val.toFixed(0) : val >= 10 ? val.toFixed(1) : val.toFixed(2);
    return `${sign}${formatted}B`;
  }
  if (abs >= 1_000_000) {
    const val = abs / 1_000_000;
    const formatted = val >= 100 ? val.toFixed(0) : val >= 10 ? val.toFixed(1) : val.toFixed(2);
    return `${sign}${formatted}M`;
  }
  if (abs >= 1_000) {
    const val = abs / 1_000;
    const formatted = val >= 100 ? val.toFixed(0) : val >= 10 ? val.toFixed(1) : val.toFixed(2);
    return `${sign}${formatted}K`;
  }
  return `${sign}${cleanNum.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })}`;
}

/**
 * Formats P&L with explicit signs (+ / -) and detailed status metadata.
 */
export function formatPnL(
  value: unknown,
  currency: string = "₹",
  decimals: number = 2,
  fallback: string = "—"
): {
  formatted: string;
  isPositive: boolean;
  isNegative: boolean;
  isZero: boolean;
  isNA: boolean;
} {
  const num = toFiniteNumber(value);
  if (num === null) {
    return {
      formatted: fallback,
      isPositive: false,
      isNegative: false,
      isZero: false,
      isNA: true,
    };
  }

  const cleanNum = normalizeZero(num);
  const isPositive = cleanNum > 0;
  const isNegative = cleanNum < 0;
  const isZero = cleanNum === 0;
  const sign = isPositive ? "+" : isNegative ? "-" : "";
  const locale = currency === "₹" ? "en-IN" : "en-US";
  const absNum = Math.abs(cleanNum);

  return {
    formatted: `${sign}${currency}${absNum.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`,
    isPositive,
    isNegative,
    isZero,
    isNA: false,
  };
}

/**
 * Safely computes and formats a ratio (protecting against divide-by-zero, null, NaN).
 */
export function formatRatio(
  numerator: unknown,
  denominator: unknown,
  decimals: number = 2,
  fallback: string = "—"
): string {
  const num = toFiniteNumber(numerator);
  const den = toFiniteNumber(denominator);
  if (num === null || den === null || den === 0) return fallback;
  return (num / den).toFixed(decimals);
}

/**
 * Guarantees that any input is converted to a safe array.
 * Never throws on null, undefined, objects, numbers, or strings.
 */
export function safeArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  return [];
}

/**
 * Safely maps over an array, ignoring non-arrays and null/undefined elements.
 */
export function safeMap<T, R>(
  items: unknown,
  mapper: (item: T, index: number) => R | null
): R[] {
  const arr = safeArray<T>(items);
  const result: R[] = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (item !== null && item !== undefined) {
      const mapped = mapper(item, i);
      if (mapped !== null && mapped !== undefined) {
        result.push(mapped);
      }
    }
  }
  return result;
}
