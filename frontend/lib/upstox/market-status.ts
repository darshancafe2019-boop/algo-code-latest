import { UpstoxExchangeStatus, UpstoxMarketPhase } from "./types";

/**
 * Calculates exact market phase for Indian equity and derivatives exchanges.
 * - PRE_OPEN: Mon-Fri 09:00 - 09:15 IST
 * - NORMAL_OPEN: Mon-Fri 09:15 - 15:30 IST
 * - CLOSING_AUCTION: Mon-Fri 15:30 - 15:40 IST
 * - CLOSING_SESSION: Mon-Fri 15:40 - 16:00 IST
 * - CLOSED: All other times & weekends
 */
export function getIndianMarketPhase(providerPhaseOverride?: UpstoxMarketPhase | null): UpstoxMarketPhase {
  if (providerPhaseOverride) {
    return providerPhaseOverride;
  }

  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istTime = new Date(utcMs + 5.5 * 3600000);

  const day = istTime.getDay(); // 0 = Sunday, 6 = Saturday
  if (day === 0 || day === 6) {
    return "CLOSED";
  }

  const hour = istTime.getHours();
  const minute = istTime.getMinutes();
  const timeInMinutes = hour * 60 + minute;

  const preOpenStart = 9 * 60; // 09:00 (540)
  const normalOpenStart = 9 * 60 + 15; // 09:15 (555)
  const normalOpenEnd = 15 * 60 + 30; // 15:30 (930)
  const closingAuctionEnd = 15 * 60 + 40; // 15:40 (940)
  const closingSessionEnd = 16 * 60; // 16:00 (960)

  if (timeInMinutes >= preOpenStart && timeInMinutes < normalOpenStart) {
    return "PRE_OPEN";
  } else if (timeInMinutes >= normalOpenStart && timeInMinutes <= normalOpenEnd) {
    return "NORMAL_OPEN";
  } else if (timeInMinutes > normalOpenEnd && timeInMinutes <= closingAuctionEnd) {
    return "CLOSING_AUCTION";
  } else if (timeInMinutes > closingAuctionEnd && timeInMinutes <= closingSessionEnd) {
    return "CLOSING_SESSION";
  } else {
    return "CLOSED";
  }
}

/**
 * Checks if the Indian equity and derivatives market is currently in active trading session.
 */
export function isIndianMarketOpen(providerPhaseOverride?: UpstoxMarketPhase | null): boolean {
  const phase = getIndianMarketPhase(providerPhaseOverride);
  return phase === "NORMAL_OPEN";
}

/**
 * Returns comprehensive status across all Indian exchanges and segments.
 */
export function getIndianMarketStatus(): Record<string, UpstoxExchangeStatus> {
  const phase = getIndianMarketPhase();
  const isOpen = phase === "NORMAL_OPEN";
  const nowIso = new Date().toISOString();

  const exchanges = [
    { key: "NSE_EQ", name: "NSE Equities (Cash)", hours: "Mon-Fri 09:15-15:30 IST" },
    { key: "NSE_FO", name: "NSE Equity Derivatives (F&O)", hours: "Mon-Fri 09:15-15:30 IST" },
    { key: "NSE_INDEX", name: "NSE Benchmark Indices", hours: "Mon-Fri 09:15-15:30 IST" },
    { key: "BSE_EQ", name: "BSE Equities (Cash)", hours: "Mon-Fri 09:15-15:30 IST" },
    { key: "BSE_FO", name: "BSE Derivatives (SENSEX/BANKEX)", hours: "Mon-Fri 09:15-15:30 IST" },
    { key: "MCX_FO", name: "MCX Commodities", hours: "Mon-Fri 09:00-23:30 IST" },
  ];

  const result: Record<string, UpstoxExchangeStatus> = {};

  exchanges.forEach((ex) => {
    result[ex.key] = {
      exchange: ex.key,
      status: isOpen ? "OPEN" : "CLOSED",
      phase,
      marketHours: ex.hours,
      isOpen,
      lastChecked: nowIso,
    };
  });

  return result;
}
