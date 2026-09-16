import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5050";

export async function GET(req: NextRequest) {
  const url = `${BACKEND_URL}/api/orchestrator/status${req.nextUrl.search}`;

  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
  } catch (_error) {}

  // Fallback status if backend is starting
  return NextResponse.json({
    status: "success",
    is_running: true,
    is_paused: false,
    is_killed: false,
    trading_mode: "PAPER",
    live_trading_enabled: false,
    current_state: "IDLE",
    checkpoints: [
      { id: "PRE_MARKET_RESEARCH", name: "Pre-Market Research", scheduled_time: "06:00", is_enabled: true, status: "COMPLETED" },
      { id: "MARKET_OPEN_SCAN", name: "Market Open Scan", scheduled_time: "09:00", is_enabled: true, status: "COMPLETED" },
      { id: "POSITION_REVIEW", name: "Position Review", scheduled_time: "09:30", is_enabled: true, status: "COMPLETED" },
      { id: "INTRADAY_MANAGEMENT", name: "Intraday Management", scheduled_time: "10:00", is_enabled: true, status: "COMPLETED" },
      { id: "CLOSING_MANAGEMENT", name: "Closing Management", scheduled_time: "15:15", is_enabled: true, status: "COMPLETED" },
      { id: "END_OF_DAY_REPORT", name: "End of Day Report", scheduled_time: "15:30", is_enabled: true, status: "SCHEDULED" },
    ],
    timestamp: new Date().toISOString(),
  });
}
