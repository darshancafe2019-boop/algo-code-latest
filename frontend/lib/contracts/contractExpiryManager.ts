/**
 * QUANT.OS — Contract Expiry Manager & Lifecycle Guard
 * ====================================================
 * Authoritative module for validating, filtering, and enforcing expiry rules
 * across the entire Bot Creation Control Plane and execution runtime.
 */

export interface ExpiryValidationResult {
  isValid: boolean;
  isExpired: boolean;
  status: "ACTIVE" | "NEAR_EXPIRY" | "EXPIRED" | "INVALID" | "RESELECTION_REQUIRED";
  expiry: string;
  normalizedDate: string;
  daysToExpiry: number;
  hoursToExpiry: number;
  message: string;
  recommendedAction?: "PROCEED" | "RESELECT_CONTRACT" | "ROLL_REQUIRED";
}

/**
 * Parses raw dates across multiple formats (ISO, YYYY-MM-DD, DD-MMM-YYYY, UNIX timestamp, Date).
 */
export function parseExpiryToTimestamp(rawExpiry: string | number | Date | null | undefined): number | null {
  if (!rawExpiry) return null;

  if (rawExpiry instanceof Date) {
    return rawExpiry.getTime();
  }

  if (typeof rawExpiry === "number") {
    // Check if seconds vs milliseconds
    return rawExpiry < 1e11 ? rawExpiry * 1000 : rawExpiry;
  }

  if (typeof rawExpiry === "string") {
    const trimmed = rawExpiry.trim();
    if (!trimmed) return null;

    // ISO format / YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const parsed = Date.parse(trimmed);
      if (!isNaN(parsed)) return parsed;
    }

    // Format like "02 OCT 2026" or "02-OCT-2026" or "2 OCT 2026"
    const match = trimmed.match(/^(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{4})/);
    if (match) {
      const day = parseInt(match[1], 10);
      const monthStr = match[2].toUpperCase();
      const year = parseInt(match[3], 10);
      const months: Record<string, number> = {
        JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
        JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
      };
      const month = months[monthStr];
      if (month !== undefined) {
        // Expiry at 15:30:00 (market close standard) or 23:59:59
        return new Date(year, month, day, 23, 59, 59).getTime();
      }
    }

    const generic = Date.parse(trimmed);
    if (!isNaN(generic)) return generic;
  }

  return null;
}

/**
 * Checks if a contract/expiry is strictly expired relative to reference market time.
 * Default reference time is current clock or October 2026 baseline.
 */
export function isContractExpired(
  rawExpiry: string | number | Date | null | undefined,
  referenceTimeMs: number = Date.now()
): boolean {
  if (!rawExpiry) return true;
  const expiryTimestamp = parseExpiryToTimestamp(rawExpiry);
  if (!expiryTimestamp) return true;

  // If expiry is before current market time -> strictly EXPIRED
  return expiryTimestamp <= referenceTimeMs;
}

/**
 * Validates a contract's expiry status with full diagnostic details.
 */
export function validateContractExpiry(
  rawExpiry: string | number | Date | null | undefined,
  referenceTimeMs: number = Date.now()
): ExpiryValidationResult {
  if (!rawExpiry) {
    return {
      isValid: false,
      isExpired: true,
      status: "RESELECTION_REQUIRED",
      expiry: "NONE",
      normalizedDate: "NONE",
      daysToExpiry: 0,
      hoursToExpiry: 0,
      message: "No contract expiry provided. Contract selection required.",
      recommendedAction: "RESELECT_CONTRACT",
    };
  }

  const expiryTimestamp = parseExpiryToTimestamp(rawExpiry);
  if (!expiryTimestamp) {
    return {
      isValid: false,
      isExpired: true,
      status: "INVALID",
      expiry: String(rawExpiry),
      normalizedDate: String(rawExpiry),
      daysToExpiry: 0,
      hoursToExpiry: 0,
      message: `Invalid expiry date format: ${rawExpiry}`,
      recommendedAction: "RESELECT_CONTRACT",
    };
  }

  const diffMs = expiryTimestamp - referenceTimeMs;
  const hoursToExpiry = diffMs / (1000 * 60 * 60);
  const daysToExpiry = hoursToExpiry / 24;

  if (diffMs <= 0) {
    return {
      isValid: false,
      isExpired: true,
      status: "EXPIRED",
      expiry: String(rawExpiry),
      normalizedDate: new Date(expiryTimestamp).toISOString().split("T")[0],
      daysToExpiry: Math.round(daysToExpiry * 10) / 10,
      hoursToExpiry: Math.round(hoursToExpiry * 10) / 10,
      message: `Contract expired on ${String(rawExpiry)}. Cannot be used for live trading.`,
      recommendedAction: "RESELECT_CONTRACT",
    };
  }

  if (daysToExpiry < 1.0) {
    return {
      isValid: true,
      isExpired: false,
      status: "NEAR_EXPIRY",
      expiry: String(rawExpiry),
      normalizedDate: new Date(expiryTimestamp).toISOString().split("T")[0],
      daysToExpiry: Math.round(daysToExpiry * 10) / 10,
      hoursToExpiry: Math.round(hoursToExpiry * 10) / 10,
      message: `Contract expires in ${Math.round(hoursToExpiry)} hours (0D). Caution for high theta decay.`,
      recommendedAction: "PROCEED",
    };
  }

  return {
    isValid: true,
    isExpired: false,
    status: "ACTIVE",
    expiry: String(rawExpiry),
    normalizedDate: new Date(expiryTimestamp).toISOString().split("T")[0],
    daysToExpiry: Math.round(daysToExpiry * 10) / 10,
    hoursToExpiry: Math.round(hoursToExpiry * 10) / 10,
    message: `Contract is active (${Math.round(daysToExpiry)} days to expiry).`,
    recommendedAction: "PROCEED",
  };
}

/**
 * Filters out all expired expiries from an array of candidate expiries.
 */
export function filterActiveExpiries(
  expiries: string[],
  referenceTimeMs: number = Date.now()
): string[] {
  if (!Array.isArray(expiries)) return [];

  return expiries.filter((exp) => {
    const validation = validateContractExpiry(exp, referenceTimeMs);
    return validation.isValid && !validation.isExpired;
  });
}

/**
 * Standard unexpired default expiries per asset class for fallback resolution.
 */
export function getAuthoritativeActiveExpiries(
  underlying: string = "BTC",
  referenceTimeMs: number = Date.now()
): string[] {
  const upper = underlying.toUpperCase();
  let candidates: string[] = [];

  if (upper === "NIFTY" || upper === "BANKNIFTY" || upper === "FINNIFTY") {
    candidates = ["08 OCT 2026", "15 OCT 2026", "22 OCT 2026", "29 OCT 2026", "26 NOV 2026", "31 DEC 2026"];
  } else {
    // Crypto (BTC, ETH, SOL)
    candidates = ["02 OCT 2026", "09 OCT 2026", "16 OCT 2026", "23 OCT 2026", "30 OCT 2026", "27 NOV 2026", "25 DEC 2026"];
  }

  const active = filterActiveExpiries(candidates, referenceTimeMs);
  return active.length > 0 ? active : candidates;
}
