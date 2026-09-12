/**
 * Authoritative Date Conversion Utilities for Delta Exchange
 * 
 * Context-specific Delta date formats:
 * 1. Product Discovery / ISO: YYYY-MM-DD (e.g. 2026-09-18)
 * 2. Option Chain Ticker Filter: DD-MM-YYYY (e.g. 18-09-2026)
 * 3. WebSocket Option Chain Subscription: ASSET-DDMMYY (e.g. BTC-180926)
 * 4. UI Display: 18 Sep 2026
 */

export interface ParsedDeltaDate {
  day: number;
  month: number; // 1-12
  year: number;  // Full 4-digit year
  isoDate: string;        // YYYY-MM-DD
  apiDateFormat: string;  // DD-MM-YYYY
  wsDateFormat: string;   // DDMMYY
  displayDate: string;    // e.g. 18 Sep 2026
  timestampMs: number;
  daysToExpiry: number;
  category: "TODAY" | "TOMORROW" | "THIS_WEEK" | "WEEKLY" | "MONTHLY" | "QUARTERLY";
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

/**
 * Parses any Delta date representation (ISO string, settlement timestamp, DD-MM-YYYY, YYYY-MM-DD, DDMMYY, or Date).
 */
export function parseDeltaDate(raw: unknown): ParsedDeltaDate | null {
  if (!raw) return null;

  let year = 0;
  let month = 0; // 1-12
  let day = 0;
  let timestampMs = 0;

  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return null;
    year = raw.getUTCFullYear();
    month = raw.getUTCMonth() + 1;
    day = raw.getUTCDate();
    timestampMs = raw.getTime();
  } else if (typeof raw === "number") {
    const d = new Date(raw > 1e11 ? raw : raw * 1000);
    if (isNaN(d.getTime())) return null;
    year = d.getUTCFullYear();
    month = d.getUTCMonth() + 1;
    day = d.getUTCDate();
    timestampMs = d.getTime();
  } else if (typeof raw === "string") {
    const clean = raw.trim().replace(/"/g, "");
    if (!clean) return null;

    // ISO timestamp like 2026-09-18T12:00:00Z or 2026-09-18
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
      const parts = clean.split("T")[0].split("-");
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
      const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      timestampMs = d.getTime();
    }
    // DD-MM-YYYY (e.g. 18-09-2026 or 18/09/2026)
    else if (/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(clean)) {
      const parts = clean.split(/[-\/]/);
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
      const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      timestampMs = d.getTime();
    }
    // DD-MMM-YYYY or DD MMM YYYY (e.g. 18 Sep 2026, 18-SEP-2026)
    else if (/^\d{1,2}[-\s][A-Za-z]{3}[-\s]\d{4}$/.test(clean)) {
      const parts = clean.split(/[-\s]+/);
      day = parseInt(parts[0], 10);
      const mStr = parts[1].toLowerCase();
      month = MONTH_MAP[mStr] || 1;
      year = parseInt(parts[2], 10);
      const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      timestampMs = d.getTime();
    }
    // DDMMYY (e.g. 180926)
    else if (/^\d{6}$/.test(clean)) {
      day = parseInt(clean.substring(0, 2), 10);
      month = parseInt(clean.substring(2, 4), 10);
      const yr2 = parseInt(clean.substring(4, 6), 10);
      year = 2000 + yr2;
      const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      timestampMs = d.getTime();
    } else {
      const parsed = Date.parse(clean);
      if (!isNaN(parsed)) {
        const d = new Date(parsed);
        year = d.getUTCFullYear();
        month = d.getUTCMonth() + 1;
        day = d.getUTCDate();
        timestampMs = d.getTime();
      } else {
        return null;
      }
    }
  } else {
    return null;
  }

  if (year < 2020 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  const yyyy = String(year);
  const yy = yyyy.slice(-2);

  const isoDate = `${yyyy}-${mm}-${dd}`;
  const apiDateFormat = `${dd}-${mm}-${yyyy}`;
  const wsDateFormat = `${dd}${mm}${yy}`;
  const monthName = MONTH_NAMES[month - 1] || "Jan";
  const displayDate = `${dd} ${monthName} ${yyyy}`;

  // Calculate Days To Expiry relative to current UTC
  const now = new Date();
  const nowUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const expiryUtcMidnight = Date.UTC(year, month - 1, day);
  const daysDiff = Math.max(0, Math.round((expiryUtcMidnight - nowUtcMidnight) / 86400000));

  // Determine category
  let category: ParsedDeltaDate["category"] = "WEEKLY";
  if (daysDiff === 0) {
    category = "TODAY";
  } else if (daysDiff === 1) {
    category = "TOMORROW";
  } else if (daysDiff <= 7) {
    category = "THIS_WEEK";
  } else if (daysDiff > 60) {
    category = "QUARTERLY";
  } else if (daysDiff > 21) {
    category = "MONTHLY";
  } else {
    category = "WEEKLY";
  }

  return {
    day,
    month,
    year,
    isoDate,
    apiDateFormat,
    wsDateFormat,
    displayDate,
    timestampMs,
    daysToExpiry: daysDiff,
    category,
  };
}

/**
 * Returns the DD-MM-YYYY format required by Delta `/v2/tickers?expiry_date=...`
 */
export function toDeltaApiExpiry(raw: unknown): string {
  const parsed = parseDeltaDate(raw);
  return parsed ? parsed.apiDateFormat : "";
}

/**
 * Returns the ASSET-DDMMYY category symbol required by Delta WebSocket option-chain subscriptions.
 * e.g. ("BTC", "18-09-2026") => "BTC-180926"
 */
export function toDeltaWsChainSymbol(underlying: string, rawDate: unknown): string {
  const und = underlying.trim().toUpperCase().replace("/USDT", "").replace("-OPTIONS", "");
  const parsed = parseDeltaDate(rawDate);
  if (!parsed) return "";
  return `${und}-${parsed.wsDateFormat}`;
}

/**
 * Formats Delta expiry for UI display with optional DTE label (e.g. "18 Sep 2026 · 6D").
 */
export function formatDeltaExpiryLabel(raw: unknown, includeDte: boolean = true): string {
  const parsed = parseDeltaDate(raw);
  if (!parsed) return "—";
  if (!includeDte) return parsed.displayDate;

  if (parsed.daysToExpiry === 0) {
    return `${parsed.displayDate} · Expires Today (0D)`;
  }
  if (parsed.daysToExpiry === 1) {
    return `${parsed.displayDate} · Tomorrow (1D)`;
  }
  return `${parsed.displayDate} · ${parsed.daysToExpiry}D`;
}

/**
 * Returns clean display string (e.g. "18 Sep 2026").
 */
export function formatDeltaExpiryDisplay(raw: unknown): string {
  const parsed = parseDeltaDate(raw);
  return parsed ? parsed.displayDate : "—";
}

/**
 * Returns ISO date format YYYY-MM-DD.
 */
export function toDeltaExpiryIso(raw: unknown): string {
  const parsed = parseDeltaDate(raw);
  return parsed ? parsed.isoDate : "";
}

/**
 * Validates if a string is a valid DD-MM-YYYY Delta API date.
 */
export function isValidDeltaApiExpiry(str: string): boolean {
  return /^\d{2}-\d{2}-\d{4}$/.test(str);
}

/**
 * Validates if a string is a valid ASSET-DDMMYY Delta WS symbol.
 */
export function isValidDeltaWsExpiry(str: string): boolean {
  return /^[A-Z0-9]+-\d{6}$/.test(str);
}

/**
 * Calculates days to expiry.
 */
export function calculateDaysToExpiry(raw: unknown): number {
  const parsed = parseDeltaDate(raw);
  return parsed ? parsed.daysToExpiry : 0;
}

