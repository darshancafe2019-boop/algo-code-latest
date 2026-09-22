import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_API_URL ||
  "http://127.0.0.1:5050";

/**
 * Dedicated Next.js Route Handler for Quant.OS Data Core v2 API (/api/v2/*)
 * Forwards requests directly to the authoritative Flask backend on port 5050.
 */
async function handleV2Proxy(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const pathSegments = params?.path || [];
  const subPath = pathSegments.join("/");
  const url = new URL(req.url);
  const targetUrl = `${BACKEND_URL}/api/v2/${subPath}${url.search}`;

  const requestId =
    req.headers.get("x-request-id") ||
    `v2_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const startTime = performance.now();

  // Forward incoming headers while filtering hop-by-hop headers
  const forwardHeaders = new Headers();
  req.headers.forEach((val, key) => {
    const lowerKey = key.toLowerCase();
    if (
      ![
        "host",
        "connection",
        "content-length",
        "transfer-encoding",
      ].includes(lowerKey)
    ) {
      forwardHeaders.set(key, val);
    }
  });

  forwardHeaders.set("X-Request-Id", requestId);
  const clientIp =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";
  forwardHeaders.set("X-Forwarded-For", clientIp);

  // Read body for state-modifying HTTP methods
  let bodyData: BodyInit | null = null;
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    try {
      const clonedReq = req.clone();
      bodyData = await clonedReq.arrayBuffer();
    } catch {
      bodyData = null;
    }
  }

  const timeoutMs = 15000;
  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

  if (req.signal) {
    req.signal.addEventListener("abort", () => {
      try {
        controller.abort();
      } catch {}
    });
  }

  try {
    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: bodyData,
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutTimer);

    const contentType = backendRes.headers.get("content-type") || "";
    const latencyMs = Math.round(performance.now() - startTime);

    const responseHeaders = new Headers();
    responseHeaders.set("X-Request-Id", requestId);
    responseHeaders.set("X-Response-Time-Ms", latencyMs.toString());
    if (contentType) {
      responseHeaders.set("Content-Type", contentType);
    }

    if (typeof (backendRes.headers as any).getSetCookie === "function") {
      const cookies: string[] = (backendRes.headers as any).getSetCookie();
      for (const cookie of cookies) {
        responseHeaders.append("set-cookie", cookie);
      }
    } else {
      const setCookie = backendRes.headers.get("set-cookie");
      if (setCookie) {
        responseHeaders.set("set-cookie", setCookie);
      }
    }

    const rawBody = await backendRes.arrayBuffer();
    return new NextResponse(rawBody, {
      status: backendRes.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    clearTimeout(timeoutTimer);
    const latencyMs = Math.round(performance.now() - startTime);
    const isTimeout = err?.name === "AbortError";
    const statusCode = isTimeout ? 504 : 503;
    const errorCode = isTimeout ? "GATEWAY_TIMEOUT" : "BACKEND_UNAVAILABLE";
    const errorMessage = isTimeout
      ? `Backend request to /api/v2/${subPath} timed out after ${timeoutMs}ms`
      : `Quant.OS Engine backend is unreachable at ${BACKEND_URL}`;

    return NextResponse.json(
      {
        ok: false,
        success: false,
        status: "error",
        data: null,
        error: {
          code: errorCode,
          message: errorMessage,
          retryable: true,
          details: err?.message || String(err),
        },
        requestId,
        timestamp: new Date().toISOString(),
        latencyMs,
      },
      {
        status: statusCode,
        headers: {
          "X-Request-Id": requestId,
          "X-Response-Time-Ms": latencyMs.toString(),
          "Content-Type": "application/json",
        },
      }
    );
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: { path: string[] } }
) {
  return handleV2Proxy(req, ctx);
}

export async function POST(
  req: NextRequest,
  ctx: { params: { path: string[] } }
) {
  return handleV2Proxy(req, ctx);
}

export async function PUT(
  req: NextRequest,
  ctx: { params: { path: string[] } }
) {
  return handleV2Proxy(req, ctx);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: { path: string[] } }
) {
  return handleV2Proxy(req, ctx);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: { path: string[] } }
) {
  return handleV2Proxy(req, ctx);
}

export async function HEAD(
  req: NextRequest,
  ctx: { params: { path: string[] } }
) {
  return handleV2Proxy(req, ctx);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Request-Id, X-Idempotency-Key, X-Step-Up-Token, X-CSRF-Token",
    },
  });
}
