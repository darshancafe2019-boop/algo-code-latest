import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_API_URL ||
  "http://127.0.0.1:5050";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const targetUrl = `${BACKEND_URL}/api/bots${url.search}`;
  const requestId =
    req.headers.get("x-request-id") ||
    `bots_get_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        Accept: "application/json",
        "X-Request-Id": requestId,
      },
      signal: AbortSignal.timeout(10000),
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
  const requestId =
    req.headers.get("x-request-id") ||
    `bots_post_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const rawBody = await req.text();
    const upstreamRes = await fetch(`${BACKEND_URL}/api/bots/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Request-Id": requestId,
      },
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
