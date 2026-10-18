import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl, isProduction } from "@/lib/config/gatewayConfig";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function proxyAction(
  req: NextRequest,
  params: { id: string; action: string[] } | Promise<{ id: string; action: string[] }>
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
  const actionPath = Array.isArray(resolved?.action) ? resolved.action.join("/") : resolved?.action || "";
  const url = new URL(req.url);
  const targetUrl = `${backendUrl}/api/bots/${botId}/${actionPath}${url.search}`;
  const requestId =
    req.headers.get("x-request-id") ||
    `bot_act_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const isBodyMethod = ["POST", "PUT", "PATCH"].includes(req.method.toUpperCase());
    const body = isBodyMethod ? await req.text() : undefined;

    const forwardHeaders = getForwardHeaders(req, requestId);
    if (isBodyMethod && !forwardHeaders.has("content-type")) {
      forwardHeaders.set("Content-Type", "application/json");
    }
    if (!forwardHeaders.has("accept")) {
      forwardHeaders.set("Accept", "application/json");
    }

    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      ...(isBodyMethod && body ? { body } : {}),
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
          code: "BOT_ACTION_FAILED",
          message: err?.message || `Failed to execute action ${actionPath}`,
        },
      },
      { status: 500, headers: { "X-Request-Id": requestId } }
    );
  }
}

export async function GET(
  req: NextRequest,
  context: { params: { id: string; action: string[] } | Promise<{ id: string; action: string[] }> }
) {
  return proxyAction(req, context.params);
}

export async function POST(
  req: NextRequest,
  context: { params: { id: string; action: string[] } | Promise<{ id: string; action: string[] }> }
) {
  return proxyAction(req, context.params);
}

export async function PUT(
  req: NextRequest,
  context: { params: { id: string; action: string[] } | Promise<{ id: string; action: string[] }> }
) {
  return proxyAction(req, context.params);
}

export async function DELETE(
  req: NextRequest,
  context: { params: { id: string; action: string[] } | Promise<{ id: string; action: string[] }> }
) {
  return proxyAction(req, context.params);
}
