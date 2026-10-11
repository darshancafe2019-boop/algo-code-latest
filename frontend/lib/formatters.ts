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

export function formatSignedMoney(
  value: number | string | null | undefined,
  currency: string = "$"
): string {
  if (value === null || value === undefined || value === "") return `${currency}0.00`;
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return `${currency}0.00`;

  const sign = num > 0 ? "+" : num < 0 ? "-" : "";
  const absVal = Math.abs(num);
  return `${sign}${currency}${absVal.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "N/A";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return "N/A";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "N/A";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return "Just now";

    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 45) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "N/A";
  }
}

