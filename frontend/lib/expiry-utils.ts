import { BackendExpiryRecord, RawExpiryItem, NormalizedExpiryOption } from "@/types/option-chain";

/**
 * Parses raw dates across multiple standard formats (YYYY-MM-DD, DD-MMM-YYYY, ISO strings).
 */
export function formatExpiryDate(rawDateStr: string): string {
  if (!rawDateStr || typeof rawDateStr !== "string") return "—";
  const clean = rawDateStr.trim().split("T")[0];

  // Already standard format like "29 Aug 2026" or "29-AUG-2026"
  if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(clean)) {
    return clean.toUpperCase();
  }

  // Standard ISO / YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const parts = clean.split("-");
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parts[2];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${monthNames[monthIndex]} ${year}`;
    }
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  return clean;
}

/**
 * Returns human-readable Days-To-Expiry label.
 * E.g., "Expires today (0D)", "1D", "7D", "Expires today"
 */
export function formatDaysToExpiryLabel(days?: number): string {
  if (typeof days !== "number" || isNaN(days)) return "";
  if (days <= 0.05) return "Expires today (0D)";
  if (days < 1.0) return "Expires today";
  return `${Math.round(days)}D`;
}

/**
 * Normalizes any raw expiry item (string or Delta BackendExpiryRecord)
 * into a structured presentation option with primitive fields.
 */
export function normalizeExpiryOption(
  item: RawExpiryItem | null | undefined,
  index: number = 0,
  underlying?: string
): NormalizedExpiryOption | null {
  if (!item) return null;

  // Handle String Item (e.g. "2026-08-29", "29-Aug-2026")
  if (typeof item === "string") {
    const strVal = item.trim();
    if (!strVal) return null;
    const formatted = formatExpiryDate(strVal);
    const label = `${formatted} ${index === 0 ? "· (Nearest / Weekly)" : ""}`.trim();
    const und = underlying || "UND";

    return {
      key: `${und}_${strVal}_${index}`,
      value: strVal,
      dateString: strVal,
      label,
      daysToExpiry: undefined,
      isActive: true,
      raw: item,
    };
  }

  // Handle Object Item (BackendExpiryRecord)
  if (typeof item === "object") {
    const rec = item as BackendExpiryRecord;
    const rawDate = rec.expiry_date || rec.settlement_time?.split("T")[0] || String(rec.id || "");
    if (!rawDate) return null;

    const formattedDate = formatExpiryDate(rawDate);
    const days = typeof rec.days_to_expiry === "number" ? rec.days_to_expiry : undefined;
    const dteLabel = formatDaysToExpiryLabel(days);
    
    let label = formattedDate;
    if (dteLabel) {
      label = `${formattedDate} · ${dteLabel}`;
    } else if (index === 0) {
      label = `${formattedDate} · (Nearest / Weekly)`;
    }

    const und = rec.underlying_symbol || underlying || "UND";
    const stableId = rec.id ? String(rec.id) : rawDate;
    const key = `${und}_${stableId}_${index}`;
    const value = rec.expiry_date || rawDate;

    return {
      key,
      value,
      dateString: rawDate,
      label,
      daysToExpiry: days,
      isActive: rec.is_active !== false,
      raw: item,
    };
  }

  return null;
}

/**
 * Normalizes an entire array of raw expiry items into presentation options.
 */
export function normalizeExpiriesList(
  expiries: (RawExpiryItem | null | undefined)[] | null | undefined,
  underlying?: string,
  activeOnly: boolean = false
): NormalizedExpiryOption[] {
  if (!Array.isArray(expiries) || expiries.length === 0) {
    return [];
  }

  const results: NormalizedExpiryOption[] = [];
  const seenValues = new Set<string>();

  for (let i = 0; i < expiries.length; i++) {
    const opt = normalizeExpiryOption(expiries[i], i, underlying);
    if (opt) {
      if (activeOnly && !opt.isActive) {
        continue;
      }
      if (!seenValues.has(opt.value)) {
        seenValues.add(opt.value);
        results.push(opt);
      }
    }
  }

  return results;
}

/**
 * Extracts a safe primitive display string.
 * Never renders `[object Object]` or throws when an object is passed.
 */
export function getExpiryDisplay(value: unknown, fallback: string = "—"): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? formatExpiryDate(trimmed) : fallback;
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    const obj = value as any;
    const candidate = obj.expiry_date || obj.settlement_time || (obj.id ? String(obj.id) : "");
    return candidate ? formatExpiryDate(candidate) : fallback;
  }
  return fallback;
}
