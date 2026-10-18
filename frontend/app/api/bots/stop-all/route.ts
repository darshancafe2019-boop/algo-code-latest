import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl, isProduction } from "@/lib/config/gatewayConfig";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const backendUrl = getBackendBaseUrl();
  if (isProduction() && !backendUrl) {
    return NextResponse.json(
      { error: "Backend service URL is not configured in production environment." },
      { status: 503 }
    );
  }

  const requestId =
    req.headers.get("x-request-id") ||
    `stop_all_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const forwardHeaders = getForwardHeaders(req, requestId);
    if (!forwardHeaders.has("content-type")) {
      forwardHeaders.set("Content-Type", "application/json");
    }
    if (!forwardHeaders.has("accept")) {
      forwardHeaders.set("Accept", "application/json");
    }

    const upstreamRes = await fetch(`${backendUrl}/api/bots/stop-all`, {
      method: "POST",
      headers: forwardHeaders,
      signal: AbortSignal.timeout(30000),
      cache: "no-store",
    });

    const data = await upstreamRes.json().catch(() => null);

    return NextResponse.json(
      data || { success: upstreamRes.ok, status: upstreamRes.ok ? "success" : "error" },
      {
        status: upstreamRes.status,
        headers: { "X-Request-Id": requestId },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        status: "error",
        error: {
          code: "STOP_ALL_FAILED",
          message: err?.message || "Failed to communicate with quantitative engine backend",
        },
      },
      { status: 500, headers: { "X-Request-Id": requestId } }
    );
  }
}
