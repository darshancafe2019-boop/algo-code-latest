import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl, isProduction } from "@/lib/config/gatewayConfig";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const backendUrl = getBackendBaseUrl();
  if (isProduction() && !backendUrl) {
    return NextResponse.json(
      { error: "Backend service URL is not configured in production environment." },
      { status: 503 }
    );
  }

  if (backendUrl) {
    const url = `${backendUrl}/api/orchestrator/status${req.nextUrl.search}`;
    try {
      const res = await fetch(url, {
        headers: getForwardHeaders(req),
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
      }
      if (res.status === 401 || res.status === 403) {
        const data = await res.json().catch(() => ({ error: "Authentication or authorization required" }));
        return NextResponse.json(data, { status: res.status });
      }
    } catch (_error) {}
  }

  // Truthful fallback status if backend is unreachable
  return NextResponse.json({
    status: "offline",
    is_running: false,
    is_paused: false,
    is_killed: false,
    trading_mode: "PAPER",
    live_trading_enabled: false,
    current_state: "DISCONNECTED",
    checkpoints: [
      { id: "PRE_MARKET_RESEARCH", name: "Pre-Market Research", scheduled_time: "06:00", is_enabled: false, status: "OFFLINE" },
      { id: "MARKET_OPEN_SCAN", name: "Market Open Scan", scheduled_time: "09:00", is_enabled: false, status: "OFFLINE" },
      { id: "POSITION_REVIEW", name: "Position Review", scheduled_time: "09:30", is_enabled: false, status: "OFFLINE" },
      { id: "INTRADAY_MANAGEMENT", name: "Intraday Management", scheduled_time: "10:00", is_enabled: false, status: "OFFLINE" },
      { id: "CLOSING_MANAGEMENT", name: "Closing Management", scheduled_time: "15:15", is_enabled: false, status: "OFFLINE" },
      { id: "END_OF_DAY_REPORT", name: "End of Day Report", scheduled_time: "15:30", is_enabled: false, status: "OFFLINE" },
    ],
    timestamp: new Date().toISOString(),
  });
}
