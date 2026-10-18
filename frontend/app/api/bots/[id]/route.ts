import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl, isProduction } from "@/lib/config/gatewayConfig";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const backendUrl = getBackendBaseUrl();
  if (isProduction() && !backendUrl) {
    return NextResponse.json(
      { error: "Backend service URL is not configured in production environment." },
      { status: 503 }
    );
  }

  const resolved = params instanceof Promise ? await params : params;
  const botId = resolved?.id;
  const requestId =
    req.headers.get("x-request-id") ||
    `bot_get_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    let upstreamRes: Response | null = null;
    let lastErr: any = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        upstreamRes = await fetch(`${backendUrl}/api/bots/${botId}`, {
          headers: getForwardHeaders(req, requestId),
          signal: AbortSignal.timeout(20000),
          cache: "no-store",
        });
        if (upstreamRes.ok || upstreamRes.status === 401 || upstreamRes.status === 403 || upstreamRes.status === 404) break;
      } catch (err: any) {
        lastErr = err;
        if (attempt < 2) await new Promise((r) => setTimeout(r, 600));
      }
    }

    if (!upstreamRes) {
      throw lastErr || new Error("Failed to reach quantitative backend engine");
    }

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
          code: "BOT_FETCH_FAILED",
          message: err?.message || "Failed to fetch bot snapshot",
        },
      },
      { status: 504, headers: { "X-Request-Id": requestId } }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const backendUrl = getBackendBaseUrl();
  if (isProduction() && !backendUrl) {
    return NextResponse.json(
      { error: "Backend service URL is not configured in production environment." },
      { status: 503 }
    );
  }

  const resolved = params instanceof Promise ? await params : params;
  const botId = resolved?.id;
  const requestId =
    req.headers.get("x-request-id") ||
    `bot_del_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const upstreamRes = await fetch(`${backendUrl}/api/bots/${botId}`, {
      method: "DELETE",
      headers: getForwardHeaders(req, requestId),
      signal: AbortSignal.timeout(8000),
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
          code: "BOT_DELETE_FAILED",
          message: err?.message || "Failed to delete bot",
        },
      },
      { status: 500, headers: { "X-Request-Id": requestId } }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const backendUrl = getBackendBaseUrl();
  if (isProduction() && !backendUrl) {
    return NextResponse.json(
      { error: "Backend service URL is not configured in production environment." },
      { status: 503 }
    );
  }

  const resolved = params instanceof Promise ? await params : params;
  const botId = resolved?.id;
  const requestId =
    req.headers.get("x-request-id") ||
    `bot_post_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const rawBody = await req.text();
    const upstreamRes = await fetch(`${backendUrl}/api/bots/${botId}`, {
      method: "POST",
      headers: getForwardHeaders(req, requestId),
      body: rawBody,
      signal: AbortSignal.timeout(8000),
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
          code: "BOT_POST_FAILED",
          message: err?.message || "Failed to post to bot",
        },
      },
      { status: 500, headers: { "X-Request-Id": requestId } }
    );
  }
}
