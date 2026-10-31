import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/config/gatewayConfig";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const BACKEND_URL = getBackendBaseUrl();
  const url = new URL(req.url);
  const requestId = req.headers.get("x-request-id") || `inc_l_${Date.now()}`;

  if (BACKEND_URL) {
    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/incidents${url.search}`, {
        method: "GET",
        headers: getForwardHeaders(req, requestId),
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });

      if (backendRes.ok) {
        const data = await backendRes.json();
        return NextResponse.json(data, {
          status: 200,
          headers: { "X-Request-Id": requestId, "Cache-Control": "no-cache" },
        });
      }
    } catch {
      // Backend offline or slow
    }
  }

  return NextResponse.json({
    status: "success",
    incidents: [],
    total_count: 0,
    limit: 50,
    offset: 0,
  }, {
    status: 200,
    headers: { "X-Request-Id": requestId },
  });
}

