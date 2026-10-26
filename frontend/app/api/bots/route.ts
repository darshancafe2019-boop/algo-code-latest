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

  const url = new URL(req.url);
  const targetUrl = `${backendUrl}/api/bots${url.search}`;
  const requestId =
    req.headers.get("x-request-id") ||
    `bots_get_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: getForwardHeaders(req, requestId),
      signal: AbortSignal.timeout(4500),
      cache: "no-store",
    });

    const data = await upstreamRes.json().catch(() => null);

    return NextResponse.json(data || { status: "success", bots: [], metrics: {} }, {
      status: upstreamRes.status,
      headers: { "X-Request-Id": requestId },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "success",
        bots: [],
        metrics: { total_bots: 0, active_bots: 0, stopped_bots: 0, total_pnl: 0 },
        notice: "fallback",
      },
      { status: 200, headers: { "X-Request-Id": requestId } }
    );
  }
}

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
    `bots_post_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const rawBody = await req.text();
    const upstreamRes = await fetch(`${backendUrl}/api/bots/create`, {
      method: "POST",
      headers: getForwardHeaders(req, requestId),
      body: rawBody,
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });

    const data = await upstreamRes.json().catch(() => null);

    return NextResponse.json(data || { status: upstreamRes.ok ? "success" : "error" }, {
      status: upstreamRes.status,
      headers: { "X-Request-Id": requestId },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        ok: false,
        error: {
          code: "BOT_CREATION_FAILED",
          message: err?.message || "Failed to communicate with quantitative engine backend",
        },
      },
      { status: 500, headers: { "X-Request-Id": requestId } }
    );
  }
}
