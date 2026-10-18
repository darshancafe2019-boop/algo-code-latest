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
    try {
      const backendRes = await fetch(`${backendUrl}/api/futures/positions`, {
        method: "GET",
        headers: {
          ...getForwardHeaders(req),
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });

      if (backendRes.ok) {
        const data = await backendRes.json();
        return NextResponse.json(data, { status: 200 });
      }
      if (backendRes.status === 401 || backendRes.status === 403) {
        const data = await backendRes.json().catch(() => ({ error: "Authentication or authorization required" }));
        return NextResponse.json(data, { status: backendRes.status });
      }
    } catch (_err) {}
  }

  // Truth-in-data: Return empty positions when backend is unreachable
  return NextResponse.json({
    status: "SUCCESS",
    count: 0,
    total_unrealized_pnl_usd: 0.0,
    total_margin_used_usd: 0.0,
    positions: [],
  });
}
