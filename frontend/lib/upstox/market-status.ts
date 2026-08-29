/**
 * Upstox Market Status & Exchange Session Service
 * ===============================================
 * Calculates accurate Indian stock market operating hours and exchange states.
 * NSE / BSE regular trading session: Mon-Fri 09:15-15:30 IST (UTC+05:30).
 */

import { UpstoxExchangeStatus } from "./types";

/**
 * Checks if the Indian equity and derivatives market is currently in active trading session.
 */
export function isIndianMarketOpen(): boolean {
  const now = new Date();
  // Convert to IST (UTC + 5 hours 30 minutes)
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istTime = new Date(utcMs + 5.5 * 3600000);

  const day = istTime.getDay(); // 0 = Sunday, 6 = Saturday
  if (day === 0 || day === 6) {
    return false; // Closed on weekends
  }

  const hour = istTime.getHours();
  const minute = istTime.getMinutes();
  const timeInMinutes = hour * 60 + minute;

  // Session: 09:15 to 15:30 IST
  const sessionStart = 9 * 60 + 15; // 555
  const sessionEnd = 15 * 60 + 30; // 930

  return timeInMinutes >= sessionStart && timeInMinutes <= sessionEnd;
}

/**
 * Returns comprehensive status across all Indian exchanges and segments.
 */
export function getIndianMarketStatus(): Record<string, UpstoxExchangeStatus> {
  const isOpen = isIndianMarketOpen();
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
      marketHours: ex.hours,
      isOpen,
      lastChecked: nowIso,
    };
  });

  return result;
}
