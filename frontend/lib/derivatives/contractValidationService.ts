/**
 * Quant.OS Central Contract & Expiry Validation Service (Frontend)
 * =================================================================
 * Enforces contract validity, detects expired/stale contracts,
 * calculates exact timestamps (Delta 17:30 IST, NSE 15:30 IST),
 * blocks deployment workflows on expired contracts, and provides
 * safe replacement suggestions requiring explicit user confirmation.
 */

export interface ExpiryValidationResult {
  isValid: boolean;
  status: "NORMAL" | "EXPIRY_APPROACHING" | "EXPIRY_DAY" | "EXPIRY_CRITICAL" | "EXPIRED" | "INACTIVE_IN_CATALOG" | "INVALID_FORMAT";
  expiry: string;
  currentDate: string;
  daysToExpiry: number;
  isBlocked: boolean;
  expiryDate?: string;
  expiryTime?: string;
  expiryTimezone?: string;
  expiryTimestamp?: string;
  secondsToExpiry?: number;
  dte?: number;
  settlementMethod?: string;
  settlementTimestamp?: string;
  blockingReason?: string;
  recommendedAction?: "RESELECT_CONTRACT" | "SELECT_ACTIVE_EXPIRY" | "CONFIRM_EXPIRY";
  suggestedExpiries: string[];
}

export class ContractValidationService {
  /**
   * Resolves exact expiry timestamp in UTC with timezone & settlement info.
   */
  static resolveExpiryTimestamp(
    expiryStr: string,
    provider: string = "UPSTOX",
    underlying: string = "NIFTY"
  ): { expiryDateUtc: Date; timeDisplay: string; tzDisplay: string; settlementMethod: string } {
    const provUpper = provider.toUpperCase();
    const undUpper = underlying.toUpperCase();

    let hourUtc = 10; // Default NSE 15:30 IST == 10:00 UTC
    let minuteUtc = 0;
    let timeDisplay = "15:30 IST (10:00 UTC)";
    let tzDisplay = "Asia/Kolkata (IST)";
    let settlementMethod = "CASH_SETTLED_INR";

    if (provUpper.includes("DELTA") || ["BTC", "ETH", "SOL"].includes(undUpper)) {
      // Delta Options 17:30 IST == 12:00 UTC
      hourUtc = 12;
      minuteUtc = 0;
      timeDisplay = "17:30 IST (12:00 UTC)";
      settlementMethod = "CASH_SETTLED_USDT";
    }

    const parts = expiryStr.trim().split("-").map((p) => parseInt(p, 10));
    const expiryDateUtc = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], hourUtc, minuteUtc, 0));

    return { expiryDateUtc, timeDisplay, tzDisplay, settlementMethod };
  }

  /**
   * Validates contract expiry date & timestamp against current market time.
   * If secondsToExpiry <= 0 -> Strict BLOCK with EXPIRED status.
   */
  static validateExpiry(
    expiryStr?: string | null,
    underlying: string = "NIFTY",
    provider: string = "UPSTOX",
    activeCatalogExpiries?: string[],
    sameDayAllowed: boolean = false
  ): ExpiryValidationResult {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

    if (!expiryStr || expiryStr.toUpperCase() === "PERPETUAL" || expiryStr.toUpperCase() === "PERP") {
      return {
        isValid: true,
        status: "NORMAL",
        expiry: expiryStr || "PERPETUAL",
        currentDate: todayStr,
        daysToExpiry: 999,
        isBlocked: false,
        expiryDate: "PERPETUAL",
        expiryTime: "N/A",
        expiryTimezone: "UTC",
        secondsToExpiry: 99999999,
        dte: 999,
        settlementMethod: "CONTINUOUS_FUNDING",
        suggestedExpiries: [],
      };
    }

    const cleanExpiry = expiryStr.trim();
    const expiryParts = cleanExpiry.split("-").map((p) => parseInt(p, 10));

    if (expiryParts.length !== 3 || isNaN(expiryParts[0]) || isNaN(expiryParts[1]) || isNaN(expiryParts[2])) {
      return {
        isValid: false,
        status: "INVALID_FORMAT",
        expiry: cleanExpiry,
        currentDate: todayStr,
        daysToExpiry: -999,
        isBlocked: true,
        blockingReason: `Invalid expiry format '${cleanExpiry}'. Expected YYYY-MM-DD.`,
        recommendedAction: "RESELECT_CONTRACT",
        suggestedExpiries: activeCatalogExpiries?.filter((e) => e > todayStr).slice(0, 5) || [],
      };
    }

    const { expiryDateUtc, timeDisplay, tzDisplay, settlementMethod } = this.resolveExpiryTimestamp(
      cleanExpiry,
      provider,
      underlying
    );

    const secondsDiff = (expiryDateUtc.getTime() - now.getTime()) / 1000;
    const dte = Math.max(secondsDiff / 86400, 0);
    const expDateOnly = new Date(Date.UTC(expiryParts[0], expiryParts[1] - 1, expiryParts[2]));
    const todayUtcOnly = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const daysDiff = Math.ceil((expDateOnly.getTime() - todayUtcOnly.getTime()) / (1000 * 60 * 60 * 24));

    // 1. Strict Expiry Check
    if (secondsDiff <= 0) {
      const suggestions = activeCatalogExpiries?.filter((e) => e > todayStr).slice(0, 5) || [];
      return {
        isValid: false,
        status: "EXPIRED",
        expiry: cleanExpiry,
        currentDate: todayStr,
        daysToExpiry: daysDiff,
        isBlocked: true,
        expiryDate: cleanExpiry,
        expiryTime: timeDisplay,
        expiryTimezone: tzDisplay,
        expiryTimestamp: expiryDateUtc.toISOString(),
        secondsToExpiry: secondsDiff,
        dte: 0,
        settlementMethod,
        settlementTimestamp: expiryDateUtc.toISOString(),
        blockingReason: `CRITICAL — CONTRACT EXPIRED: Contract expiry timestamp '${expiryDateUtc.toISOString()}' has elapsed. Execution strictly blocked.`,
        recommendedAction: "RESELECT_CONTRACT",
        suggestedExpiries: suggestions,
      };
    }

    // 2. Classify into 5 Expiry States
    let status: ExpiryValidationResult["status"] = "NORMAL";
    if (secondsDiff < 7200) {
      status = "EXPIRY_CRITICAL"; // < 2 hours
    } else if (secondsDiff < 21600 || daysDiff === 0) {
      status = "EXPIRY_DAY"; // 2h - 6h or same day
    } else if (secondsDiff <= 86400) {
      status = "EXPIRY_APPROACHING"; // 6h - 24h
    }

    // 3. Check against active catalog if available
    if (activeCatalogExpiries && activeCatalogExpiries.length > 0 && !activeCatalogExpiries.includes(cleanExpiry)) {
      return {
        isValid: false,
        status: "INACTIVE_IN_CATALOG",
        expiry: cleanExpiry,
        currentDate: todayStr,
        daysToExpiry: daysDiff,
        isBlocked: true,
        expiryDate: cleanExpiry,
        expiryTime: timeDisplay,
        expiryTimezone: tzDisplay,
        expiryTimestamp: expiryDateUtc.toISOString(),
        secondsToExpiry: secondsDiff,
        dte: Number(dte.toFixed(2)),
        settlementMethod,
        blockingReason: `Expiry '${cleanExpiry}' is no longer tradable in the active ${provider} catalog for ${underlying}.`,
        recommendedAction: "SELECT_ACTIVE_EXPIRY",
        suggestedExpiries: activeCatalogExpiries.filter((e) => e > todayStr).slice(0, 5),
      };
    }

    let blockingReason: string | undefined = undefined;
    if (["EXPIRY_DAY", "EXPIRY_CRITICAL"].includes(status) && !sameDayAllowed) {
      blockingReason = `WARNING: Same-day expiry detected (${timeDisplay}, ${Math.floor(secondsDiff / 3600)}h ${Math.floor((secondsDiff % 3600) / 60)}m remaining).`;
    }

    return {
      isValid: true,
      status,
      expiry: cleanExpiry,
      currentDate: todayStr,
      daysToExpiry: daysDiff,
      isBlocked: false,
      expiryDate: cleanExpiry,
      expiryTime: timeDisplay,
      expiryTimezone: tzDisplay,
      expiryTimestamp: expiryDateUtc.toISOString(),
      secondsToExpiry: secondsDiff,
      dte: Number(dte.toFixed(2)),
      settlementMethod,
      settlementTimestamp: expiryDateUtc.toISOString(),
      blockingReason,
      suggestedExpiries: activeCatalogExpiries?.filter((e) => e > cleanExpiry).slice(0, 5) || [],
    };
  }
}

