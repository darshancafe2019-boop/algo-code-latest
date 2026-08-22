/**
 * Centralized, Audited Financial Number Formatting Utilities
 * 
 * Rules:
 * - Valid number -> formatted according to locale / precision
 * - Numeric string -> safely converted to float and formatted
 * - null / undefined / NaN / Infinity -> returns "N/A" (or custom fallback)
 * - Never fabricates $0.00 or 0% when data is missing or undefined
 */

export function isNumeric(value: unknown): value is number {
  if (value === null || value === undefined) return false;
  if (typeof value === "number") return !Number.isNaN(value) && Number.isFinite(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "N/A" || trimmed === "null" || trimmed === "undefined") return false;
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
    if (trimmed === "" || trimmed === "N/A" || trimmed === "null" || trimmed === "undefined") return null;
    const num = Number(trimmed);
    return Number.isNaN(num) || !Number.isFinite(num) ? null : num;
  }
  return null;
}

export function formatNumber(
  value: unknown,
  decimals: number = 2,
  fallback: string = "N/A"
): string {
  const num = toNumeric(value);
  if (num === null) return fallback;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPrice(
  value: unknown,
  currency: string = "$",
  decimals: number = 2,
  fallback: string = "N/A"
): string {
  const num = toNumeric(value);
  if (num === null) return fallback;
  return `${currency}${num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatCurrency(
  value: unknown,
  currency: string = "$",
  decimals: number = 2,
  fallback: string = "N/A"
): string {
  return formatPrice(value, currency, decimals, fallback);
}

export function formatPercent(
  value: unknown,
  decimals: number = 2,
  includeSign: boolean = false,
  fallback: string = "N/A"
): string {
  const num = toNumeric(value);
  if (num === null) return fallback;
  const sign = includeSign && num > 0 ? "+" : "";
  return `${sign}${num.toFixed(decimals)}%`;
}

export function formatPnL(
  value: unknown,
  currency: string = "$",
  decimals: number = 2,
  fallback: string = "N/A"
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

  const isPositive = num > 0;
  const isNegative = num < 0;
  const isZero = num === 0;
  const sign = isPositive ? "+" : isNegative ? "-" : "";
  const absNum = Math.abs(num);

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
  fallback: string = "N/A"
): string {
  const num = toNumeric(numerator);
  const den = toNumeric(denominator);
  if (num === null || den === null || den === 0) return fallback;
  return (num / den).toFixed(decimals);
}
