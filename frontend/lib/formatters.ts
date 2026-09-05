/**
 * Centralized, Audited Financial Number Formatting Utilities for Quant.OS
 * 
 * Rules:
 * - Valid number -> formatted according to locale / precision
 * - Numeric string -> safely converted to float and formatted
 * - null / undefined / NaN / Infinity -> returns "—" (or custom fallback)
 * - True numeric 0 -> correctly formatted as "$0.00", "0%", "0" (never confused with null/missing data)
 * - Micro-Price Precision: Assets with tiny fractional values (e.g. PEPE $0.00001234) format with up to 8 decimals, NEVER $0.00
 * - Non-Zero Prices: Never rounds non-zero prices to zero
 * - Volume Distinctions: Distinct quantity volume (12.4K) vs monetary notional volume ($12.4K)
 * - Never fabricates $0.00 or 0% when data is missing, uninitialized, or null
 */

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

export function toNumeric(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isNaN(value) || !Number.isFinite(value) ? null : value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "N/A" || trimmed === "null" || trimmed === "undefined" || trimmed === "—") return null;
    const num = Number(trimmed);
    return Number.isNaN(num) || !Number.isFinite(num) ? null : num;
  }
  return null;
}

export function normalizeZero(value: number, epsilon: number = 1e-12): number {
  return Math.abs(value) < epsilon ? 0 : value;
}

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

export function formatPrice(
  value: unknown,
  currency: string = "$",
  decimals?: number,
  fallback: string = "—"
): string {
  const num = toNumeric(value);
  if (num === null) return fallback;
  const cleanNum = normalizeZero(num);
  const resolvedDecimals = getDynamicDecimals(cleanNum, decimals);
  return `${currency}${cleanNum.toLocaleString(undefined, {
    minimumFractionDigits: resolvedDecimals,
    maximumFractionDigits: resolvedDecimals,
  })}`;
}

export function formatMoney(
  value: unknown,
  currency: string = "$",
  decimals?: number,
  fallback: string = "—"
): string {
  return formatPrice(value, currency, decimals, fallback);
}

export function formatCurrency(
  value: unknown,
  currency: string = "$",
  decimals?: number,
  fallback: string = "—"
): string {
  return formatPrice(value, currency, decimals, fallback);
}

export function formatQuantity(
  value: unknown,
  fallback: string = "—"
): string {
  const num = toNumeric(value);
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
  return `${sign}${cleanNum.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatVolume(
  value: unknown,
  currency: string = "",
  fallback: string = "—"
): string {
  const num = toNumeric(value);
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

export function formatPercent(
  value: unknown,
  decimals: number = 2,
  includeSign: boolean = false,
  fallback: string = "—"
): string {
  const num = toNumeric(value);
  if (num === null) return fallback;
  const cleanNum = normalizeZero(num);
  const sign = includeSign && cleanNum > 0 ? "+" : "";
  return `${sign}${cleanNum.toFixed(decimals)}%`;
}

export function formatNumber(
  value: unknown,
  decimals: number = 2,
  fallback: string = "—"
): string {
  const num = toNumeric(value);
  if (num === null) return fallback;
  const cleanNum = normalizeZero(num);
  return cleanNum.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatExactNumber(
  value: unknown,
  fallback: string = "—"
): string {
  const num = toNumeric(value);
  if (num === null) return fallback;
  return num.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

export function formatPnL(
  value: unknown,
  currency: string = "$",
  decimals: number = 2,
  fallback: string = "—"
): {
  formatted: string;
  isPositive: boolean;
  isNegative: boolean;
  isZero: boolean;
  isNA: boolean;
} {
  const num = toNumeric(value);
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
  const absNum = Math.abs(cleanNum);

  return {
    formatted: `${sign}${currency}${absNum.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`,
    isPositive,
    isNegative,
    isZero,
    isNA: false,
  };
}

export function formatRatio(
  numerator: unknown,
  denominator: unknown,
  decimals: number = 2,
  fallback: string = "—"
): string {
  const num = toNumeric(numerator);
  const den = toNumeric(denominator);
  if (num === null || den === null || den === 0) return fallback;
  return (num / den).toFixed(decimals);
}
