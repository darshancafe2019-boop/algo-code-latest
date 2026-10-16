import { NextRequest, NextResponse } from "next/server";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_API_URL ||
  "http://127.0.0.1:5050";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const resolved = params instanceof Promise ? await params : params;
  const botId = resolved?.id;
  const requestId =
    req.headers.get("x-request-id") ||
    `bot_ctrl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const rawBody = await req.text();
    const forwardHeaders = getForwardHeaders(req, requestId);
    if (!forwardHeaders.has("content-type")) {
      forwardHeaders.set("Content-Type", "application/json");
    }
    if (!forwardHeaders.has("accept")) {
      forwardHeaders.set("Accept", "application/json");
    }

    const upstreamRes = await fetch(`${BACKEND_URL}/api/bots/${botId}/control`, {
      method: "POST",
      headers: forwardHeaders,
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
          code: "BOT_CONTROL_FAILED",
          message: err?.message || "Failed to dispatch bot control action",
        },
      },
      { status: 500, headers: { "X-Request-Id": requestId } }
    );
  }
}
