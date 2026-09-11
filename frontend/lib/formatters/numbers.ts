/**
 * Production Safe Financial & Greeks Number Formatters
 * ====================================================
 * Guarantees zero runtime crashes from null / undefined / NaN / Infinity values.
 * 
 * Rules:
 * - null -> "—"
 * - undefined -> "—"
 * - NaN -> "—"
 * - Infinity / -Infinity -> "—"
 * - True numeric 0 -> correctly formatted as "0.00", "0.000", "$0.00", "0.00%" (Never replaced with "—")
 * - Valid number -> formatted cleanly according to specified precision
 */

export interface OptionGreeks {
  iv: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  rho: number | null;
}

export interface OptionQuote {
  ltp: number | null;
  bid: number | null;
  ask: number | null;
  volume: number | null;
  oi: number | null;
  iv?: number | null;
  delta?: number | null;
  gamma?: number | null;
  theta?: number | null;
  vega?: number | null;
  rho?: number | null;
}

/**
 * Safely parses any input into a finite number or returns null.
 */
export function toNumeric(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return !Number.isNaN(value) && Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "N/A" || trimmed === "null" || trimmed === "undefined" || trimmed === "—") {
      return null;
    }
    const parsed = Number(trimmed);
    return !Number.isNaN(parsed) && Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Formats a generic decimal number.
 * e.g. formatNumber(12.3456, 2) -> "12.35"
 *      formatNumber(null, 2) -> "—"
 */
export function formatNumber(
  value: unknown,
  decimals: number = 2,
  fallback: string = "—"
): string {
  const num = toNumeric(value);
  if (num === null) return fallback;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formats an integer / whole count.
 * e.g. formatInteger(15000) -> "15,000"
 *      formatInteger(null) -> "—"
 */
export function formatInteger(
  value: unknown,
  fallback: string = "—"
): string {
  const num = toNumeric(value);
  if (num === null) return fallback;
  return Math.round(num).toLocaleString("en-US");
}

/**
 * Formats a price with optional currency prefix.
 * e.g. formatPrice(24850.5, "₹", 2) -> "₹24,850.50"
 *      formatPrice(65420.12, "$", 2) -> "$65,420.12"
 *      formatPrice(null) -> "—"
 */
export function formatPrice(
  value: unknown,
  currency: string = "",
  decimals: number = 2,
  fallback: string = "—"
): string {
  const num = toNumeric(value);
  if (num === null) return fallback;
  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return currency ? `${currency}${formatted}` : formatted;
}

/**
 * Formats a currency value. Alias for formatPrice.
 */
export function formatCurrency(
  value: unknown,
  currency: string = "₹",
  decimals: number = 2,
  fallback: string = "—"
): string {
  return formatPrice(value, currency, decimals, fallback);
}

/**
 * Formats an option Greek (Delta, Gamma, Theta, Vega, Rho).
 * Default decimals: Delta (3), Gamma (5), Theta (2), Vega (2), Rho (4).
 * e.g. formatGreek(0.52345, 4) -> "0.5235"
 *      formatGreek(null) -> "—"
 */
export function formatGreek(
  value: unknown,
  decimals: number = 4,
  fallback: string = "—"
): string {
  const num = toNumeric(value);
  if (num === null) return fallback;
  return num.toFixed(decimals);
}

/**
 * Formats a percentage value.
 * e.g. formatPercent(14.5, 2) -> "14.50%"
 *      formatPercent(0.145, 2, "—", true) -> "14.50%" (multiplies by 100 if isDecimal=true)
 *      formatPercent(null) -> "—"
 */
export function formatPercent(
  value: unknown,
  decimals: number = 2,
  fallback: string = "—",
  isDecimal: boolean = false
): string {
  const num = toNumeric(value);
  if (num === null) return fallback;
  const finalVal = isDecimal ? num * 100 : num;
  return `${finalVal.toFixed(decimals)}%`;
}

/**
 * Canonical option Greeks normalizer. Validates every raw Greek value.
 * Valid numbers are preserved, invalid/missing/NaN/Infinity become null.
 */
export function normalizeOptionGreeks(raw: any): OptionGreeks {
  if (!raw || typeof raw !== "object") {
    return {
      iv: null,
      delta: null,
      gamma: null,
      theta: null,
      vega: null,
      rho: null,
    };
  }

  return {
    iv: toNumeric(raw.iv ?? raw.implied_volatility ?? raw.impliedVolatility),
    delta: toNumeric(raw.delta),
    gamma: toNumeric(raw.gamma),
    theta: toNumeric(raw.theta),
    vega: toNumeric(raw.vega),
    rho: toNumeric(raw.rho),
  };
}

/**
 * Canonical option quote normalizer.
 */
export function normalizeOptionQuote(raw: any): OptionQuote {
  if (!raw || typeof raw !== "object") {
    return {
      ltp: null,
      bid: null,
      ask: null,
      volume: null,
      oi: null,
    };
  }

  const greeks = normalizeOptionGreeks(raw.greeks ?? raw);

  return {
    ltp: toNumeric(raw.ltp ?? raw.last_price ?? raw.lastPrice ?? raw.price),
    bid: toNumeric(raw.bid ?? raw.bid_price ?? raw.bidPrice),
    ask: toNumeric(raw.ask ?? raw.ask_price ?? raw.askPrice),
    volume: toNumeric(raw.volume ?? raw.vol),
    oi: toNumeric(raw.oi ?? raw.open_interest ?? raw.openInterest),
    ...greeks,
  };
}
