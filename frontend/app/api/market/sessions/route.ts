import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface MarketSessionInfo {
  market: string;
  name: string;
  session: "OPEN" | "PRE_OPEN" | "CLOSING" | "CLOSED" | "24X7";
  openTime: string;
  closeTime: string;
  timezone: string;
  isHoliday: boolean;
  nextSessionOpen: string;
}

export async function GET() {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const istMinutes = (utcHours * 60 + utcMinutes + 330) % (24 * 60); // IST in minutes from midnight
  const istDay = new Date(now.getTime() + 5.5 * 3600 * 1000).getUTCDay(); // 0 = Sun, 6 = Sat

  const isWeekend = istDay === 0 || istDay === 6;

  // NSE / BSE session: 09:15 (555) to 15:30 (930) IST
  let nseSession: "OPEN" | "PRE_OPEN" | "CLOSING" | "CLOSED" = "CLOSED";
  if (!isWeekend) {
    if (istMinutes >= 540 && istMinutes < 555) {
      nseSession = "PRE_OPEN";
    } else if (istMinutes >= 555 && istMinutes <= 915) {
      nseSession = "OPEN";
    } else if (istMinutes > 915 && istMinutes <= 930) {
      nseSession = "CLOSING";
    }
  }

  // MCX session: 09:00 (540) to 23:30 (1410) IST
  let mcxSession: "OPEN" | "CLOSED" = "CLOSED";
  if (!isWeekend) {
    if (istMinutes >= 540 && istMinutes <= 1410) {
      mcxSession = "OPEN";
    }
  }

  const sessions: MarketSessionInfo[] = [
    {
      market: "NSE_EQ",
      name: "NSE Equities",
      session: nseSession,
      openTime: "09:15 IST",
      closeTime: "15:30 IST",
      timezone: "Asia/Kolkata",
      isHoliday: isWeekend,
      nextSessionOpen: isWeekend ? "Monday 09:15 IST" : "09:15 IST",
    },
    {
      market: "NSE_FNO",
      name: "NSE Futures & Options",
      session: nseSession,
      openTime: "09:15 IST",
      closeTime: "15:30 IST",
      timezone: "Asia/Kolkata",
      isHoliday: isWeekend,
      nextSessionOpen: isWeekend ? "Monday 09:15 IST" : "09:15 IST",
    },
    {
      market: "MCX",
      name: "MCX Commodities",
      session: mcxSession,
      openTime: "09:00 IST",
      closeTime: "23:30 IST",
      timezone: "Asia/Kolkata",
      isHoliday: isWeekend,
      nextSessionOpen: isWeekend ? "Monday 09:00 IST" : "09:00 IST",
    },
    {
      market: "CRYPTO",
      name: "Delta Exchange / Crypto Markets",
      session: "24X7",
      openTime: "00:00 UTC",
      closeTime: "23:59 UTC",
      timezone: "UTC",
      isHoliday: false,
      nextSessionOpen: "Always Active",
    },
    {
      market: "US_EQUITIES",
      name: "US Equities (NASDAQ / NYSE)",
      session: (utcHours >= 13 && (utcHours > 13 || utcMinutes >= 30)) && utcHours < 20 && !isWeekend ? "OPEN" : "CLOSED",
      openTime: "09:30 EST",
      closeTime: "16:00 EST",
      timezone: "America/New_York",
      isHoliday: isWeekend,
      nextSessionOpen: isWeekend ? "Monday 09:30 EST" : "09:30 EST",
    },
    {
      market: "FOREX",
      name: "Global Forex (24/5)",
      session: !isWeekend ? "OPEN" : "CLOSED",
      openTime: "Sunday 17:00 EST",
      closeTime: "Friday 17:00 EST",
      timezone: "UTC",
      isHoliday: isWeekend,
      nextSessionOpen: isWeekend ? "Sunday 22:00 UTC" : "Live",
    },
  ];

  return NextResponse.json({
    status: "success",
    timestamp: Date.now(),
    sessions,
  });
}
