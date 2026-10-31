import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/config/gatewayConfig";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const BACKEND_URL = getBackendBaseUrl();
  const requestId = req.headers.get("x-request-id") || `inc_s_${Date.now()}`;

  if (BACKEND_URL) {
    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/incidents/summary`, {
        method: "GET",
        headers: getForwardHeaders(req, requestId),
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });

      if (backendRes.ok) {
        const data = await backendRes.json();
        return NextResponse.json(data, {
          status: 200,
          headers: { "X-Request-Id": requestId, "Cache-Control": "no-cache" },
        });
      }
    } catch {
      // Backend probe timeout or offline; fallback to baseline metrics
    }
  }

  return NextResponse.json({
    status: "success",
    metrics: {
      total_incidents: 0,
      active_incidents: 0,
      critical: 0,
      error: 0,
      warning: 0,
      unacknowledged: 0,
      affected_bots_count: 0,
      affected_bots: [],
      resolved_today: 0,
      last_updated: new Date().toISOString(),
    },
  }, {
    status: 200,
    headers: { "X-Request-Id": requestId },
  });
}

