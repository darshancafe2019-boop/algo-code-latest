import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl, isProduction } from "@/lib/config/gatewayConfig";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const BACKEND_URL = getBackendBaseUrl();
  const requestId = req.headers.get("x-request-id") || `readiness_${Date.now()}`;

  if (BACKEND_URL) {
    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/trading/live-readiness`, {
        method: "GET",
        headers: getForwardHeaders(req, requestId),
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });

      if (backendRes.ok) {
        const data = await backendRes.json();
        return NextResponse.json(data, { status: 200 });
      }
      if (backendRes.status === 401 || backendRes.status === 403) {
        const data = await backendRes.json().catch(() => ({ error: "Authentication required" }));
        return NextResponse.json(data, { status: backendRes.status });
      }
    } catch (err) {
      // Backend offline
    }
  }

  return NextResponse.json({
    status: isProduction() && !BACKEND_URL ? "UNAVAILABLE" : "DEGRADED",
    readiness: {
      auth_ready: false,
      broker_ready: false,
      market_data_ready: false,
      reconciled: false,
      risk_ready: false,
      kill_switch_ready: true,
      account_ready: false,
      instrument_ready: false,
      overall_ready: false,
      active_mode: "PAPER",
      live_providers_count: 0,
      gate_details: {
        kill_switch_active: false,
        daily_loss_limit_ok: false,
        margin_available_usd: 0,
        unresolved_unknown_orders: 0,
      },
      timestamp: new Date().toISOString(),
    },
  });
}
