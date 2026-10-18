import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl, isProduction } from "@/lib/config/gatewayConfig";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Dedicated Next.js Route Handler for Quant.OS Data Core v2 API (/api/v2/*)
 * Forwards requests directly to the authoritative Flask backend.
 */
// High-speed in-memory micro-cache for idempotent GET queries (TTL 1000ms)
interface CacheEntry {
  status: number;
  body: ArrayBuffer;
  contentType: string;
  timestamp: number;
}
const v2MicroCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1000;

async function handleV2Proxy(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const BACKEND_URL = getBackendBaseUrl();
  const requestId =
    req.headers.get("x-request-id") ||
    `v2_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const startTime = performance.now();

  if (!BACKEND_URL && isProduction()) {
    return NextResponse.json(
      {
        ok: false,
        success: false,
        status: "error",
        data: null,
        error: {
          code: "BACKEND_NOT_CONFIGURED",
          message: "Backend internal URL is not configured in production environment.",
          retryable: false,
        },
        requestId,
        timestamp: new Date().toISOString(),
        latencyMs: 0,
      },
      {
        status: 503,
        headers: { "X-Request-Id": requestId, "Content-Type": "application/json" },
      }
    );
  }

  const effectiveBackendUrl = BACKEND_URL || (isProduction() ? "" : "http://127.0.0.1:5050");
  const pathSegments = params?.path || [];
  const subPath = pathSegments.join("/");
  const url = new URL(req.url);
  const targetUrl = `${effectiveBackendUrl}/api/v2/${subPath}${url.search}`;
  const cacheKey = `${req.method}:${subPath}${url.search}`;

  // Invalidate cache on mutations
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    v2MicroCache.clear();
  }

  // Check micro-cache for idempotent GET
  if (req.method === "GET") {
    const cached = v2MicroCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      const responseHeaders = new Headers();
      responseHeaders.set("X-Cache-Hit", "true");
      responseHeaders.set("X-Response-Time-Ms", "0");
      if (cached.contentType) {
        responseHeaders.set("Content-Type", cached.contentType);
      }
      return new NextResponse(cached.body.slice(0), {
        status: cached.status,
        headers: responseHeaders,
      });
    }
  }

  const forwardHeaders = getForwardHeaders(req, requestId);

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
    responseHeaders.set("X-Cache-Hit", "false");
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

    // Cache successful GET responses
    if (req.method === "GET" && backendRes.ok) {
      if (v2MicroCache.size > 200) {
        v2MicroCache.clear();
      }
      v2MicroCache.set(cacheKey, {
        status: backendRes.status,
        body: rawBody,
        contentType,
        timestamp: Date.now(),
      });
    }

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
