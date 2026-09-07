import { NextRequest, NextResponse } from "next/server";
import { getIndianMarketStatus, isIndianMarketOpen } from "@/lib/upstox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/upstox/market-status
 * Returns current operating session status across all Indian exchanges.
 */
export async function GET() {
  try {
    const isOpen = isIndianMarketOpen();
    const exchanges = getIndianMarketStatus();

    return NextResponse.json({
      status: "success",
      isOpen,
      marketHours: "Mon-Fri 09:15-15:30 IST",
      sessionStatus: isOpen ? "OPEN" : "CLOSED",
      exchanges,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "success",
        isOpen: false,
        marketHours: "Mon-Fri 09:15-15:30 IST",
        sessionStatus: "CLOSED",
        exchanges: [],
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
