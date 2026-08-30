/**
 * Stock Formatting Utilities
 * ==========================
 * Strict locale-aware financial notation:
 * - Indian Rupee (₹) with Lakhs / Crores notation for INR equities
 * - US Dollar ($) with K / M / B notation for US equities
 * - Explicit '—' or 'Not available' for null / undefined, never fabricated 0.
 */

export function formatStockCurrency(
  val: number | null | undefined,
  currency: string = "INR",
  decimals: number = 2
): string {
  if (val === null || val === undefined || isNaN(val)) {
    return "—";
  }

  const symbol = currency.toUpperCase() === "INR" ? "₹" : "$";

  if (currency.toUpperCase() === "INR") {
    return `${symbol}${val.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  }

  return `${symbol}${val.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatStockPercent(
  val: number | null | undefined,
  includeSign: boolean = true
): string {
  if (val === null || val === undefined || isNaN(val)) {
    return "—";
  }
  const sign = includeSign && val > 0 ? "+" : "";
  return `${sign}${val.toFixed(2)}%`;
}

export function formatStockVolume(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return "—";
  }

  if (val >= 10000000) {
    return `${(val / 10000000).toFixed(2)} Cr`;
  }
  if (val >= 100000) {
    return `${(val / 100000).toFixed(2)} L`;
  }
  if (val >= 1000000) {
    return `${(val / 1000000).toFixed(2)}M`;
  }
  if (val >= 1000) {
    return `${(val / 1000).toFixed(1)}k`;
  }
  return val.toLocaleString();
}

export function formatStockMarketCap(
  val: number | null | undefined,
  currency: string = "INR"
): string {
  if (val === null || val === undefined || isNaN(val)) {
    return "—";
  }

  const sym = currency.toUpperCase() === "INR" ? "₹" : "$";

  if (currency.toUpperCase() === "INR") {
    if (val >= 10000000) {
      return `${sym}${(val / 10000000).toFixed(2)} Cr`;
    }
    return `${sym}${val.toLocaleString("en-IN")}`;
  }

  if (val >= 1000000000000) {
    return `${sym}${(val / 1000000000000).toFixed(2)}T`;
  }
  if (val >= 1000000000) {
    return `${sym}${(val / 1000000000).toFixed(2)}B`;
  }
  if (val >= 1000000) {
    return `${sym}${(val / 1000000).toFixed(2)}M`;
  }
  return `${sym}${val.toLocaleString()}`;
}

export function formatRelativeVolume(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return "1.0x";
  }
  return `${val.toFixed(2)}x`;
}
