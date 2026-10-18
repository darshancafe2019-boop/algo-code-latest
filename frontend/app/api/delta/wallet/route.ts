import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl, isProduction } from "@/lib/config/gatewayConfig";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/delta/wallet
 * Proxies to Flask backend to fetch authenticated balances.
 */
export async function GET(req: NextRequest) {
  const backendUrl = getBackendBaseUrl();
  if (isProduction() && !backendUrl) {
    return NextResponse.json(
      {
        success: false,
        error: "Backend service URL is not configured in production environment.",
        balances: [],
      },
      { status: 503 }
    );
  }

  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}/api/delta/wallet`, {
        method: "GET",
        headers: {
          ...getForwardHeaders(req),
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
      if (res.status === 401 || res.status === 403) {
        const data = await res.json().catch(() => ({ error: "Authentication or authorization required" }));
        return NextResponse.json(data, { status: res.status });
      }
    } catch (_err) {}
  }

  return NextResponse.json(
    {
      success: false,
      message: "Backend wallet service is unreachable.",
      balances: [],
    },
    { status: 503 }
  );
}
