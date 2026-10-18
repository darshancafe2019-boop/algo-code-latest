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

  const { searchParams } = new URL(req.url);

  if (backendUrl) {
    const targetUrl = `${backendUrl}/api/futures/contracts?${searchParams.toString()}`;
    try {
      const res = await fetch(targetUrl, {
        cache: "no-store",
        headers: getForwardHeaders(req),
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch (err) {
      console.warn("Backend futures query error:", err);
    }

    // Try universe endpoint
    try {
      const res2 = await fetch(`${backendUrl}/api/futures/universe?${searchParams.toString()}`, {
        cache: "no-store",
        headers: getForwardHeaders(req),
        signal: AbortSignal.timeout(6000),
      });
      if (res2.ok) {
        const data2 = await res2.json();
        return NextResponse.json(data2);
      }
    } catch {}
  }

  // Truthful fallback when backend is unreachable
  return NextResponse.json({
    status: "degraded",
    count: 0,
    contracts: [],
    underlying: (searchParams.get("underlying") || "").toUpperCase(),
    timestamp: new Date().toISOString(),
  });
}
