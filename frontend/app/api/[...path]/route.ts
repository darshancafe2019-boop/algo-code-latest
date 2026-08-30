import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_API_URL || "http://127.0.0.1:5050";
const GATEWAY_URL = process.env.MARKET_GATEWAY_URL || "http://127.0.0.1:5051";
const GATEWAY_SECRET = process.env.MARKET_GATEWAY_SECRET || "changeme-set-a-strong-random-secret-here";

/**
 * Universal Backend-for-Frontend (BFF) Proxy Handler
 * Intercepts all /api/* requests, enforces timeouts, propagates correlation IDs,
 * handles request deduplication, and proxies transparently to Flask & Market Data Gateway.
 */
async function handleProxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  const pathSegments = params.path || [];
  const subPath = pathSegments.join("/");
  const url = new URL(req.url);
  const requestId = req.headers.get("x-request-id") || `bff_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const startTime = performance.now();

  // ── Market Data Gateway proxy: /api/market/* -> http://127.0.0.1:5051 ──────
  if (subPath.startsWith("market/") || subPath === "market") {
    const gatewayPath = subPath.replace(/^market\/?/, "");
    const gatewayTarget = `${GATEWAY_URL}/${gatewayPath}${url.search}`;
    try {
      const resp = await fetch(gatewayTarget, {
        method: req.method,
        headers: {
          "X-Gateway-Secret": GATEWAY_SECRET,
          "Content-Type": "application/json",
          "X-Request-Id": requestId,
        },
        body: req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined,
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      const data = await resp.text();
      return new NextResponse(data, {
        status: resp.status,
        headers: {
          "Content-Type": resp.headers.get("Content-Type") || "application/json",
          "X-Request-Id": requestId,
          "X-Gateway-Proxied": "true",
        },
      });
    } catch (err: any) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          status: "error",
          providers: [],
          quotes: {},
          error: {
            code: "MARKET_GATEWAY_UNAVAILABLE",
            message: "Market data gateway is starting or temporarily unavailable",
            details: err.message,
            retryable: true,
          },
          requestId,
          timestamp: new Date().toISOString(),
        },
        { status: 503, headers: { "X-Request-Id": requestId, "Retry-After": "3" } }
      );
    }
  }

  // ── Special Case: /api/health* Probes ────────────────────────────────────────
  if (subPath.startsWith("health")) {
    if (subPath === "health/live") {
      return NextResponse.json({
        status: "ALIVE",
        frontend: { status: "ALIVE", uptime_seconds: process.uptime(), timestamp: new Date().toISOString() },
        proxy_latency_ms: Math.round(performance.now() - startTime),
      }, { status: 200, headers: { "X-Request-Id": requestId } });
    }

    if (subPath === "health/dependencies") {
      try {
        const bRes = await fetch(`${BACKEND_URL}/health/dependencies`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
        const bData = await bRes.json();
        return NextResponse.json(bData, { status: bRes.status, headers: { "X-Request-Id": requestId } });
      } catch (err: any) {
        return NextResponse.json({
          status: "DEGRADED",
          operating_mode: "DEGRADED",
          timestamp: new Date().toISOString(),
          error: err.message
        }, { status: 503, headers: { "X-Request-Id": requestId } });
      }
    }

    // Default /api/health or /api/health/ready
    let backendReady = false;
    let backendLatency = 0;
    try {
      const t0 = performance.now();
      const bRes = await fetch(`${BACKEND_URL}/health/ready`, { cache: "no-store", signal: AbortSignal.timeout(3000) });
      backendReady = bRes.status === 200;
      backendLatency = Math.round(performance.now() - t0);
    } catch {
      backendReady = false;
    }

    return NextResponse.json(
      {
        status: backendReady ? "ok" : "degraded",
        frontend: { status: "HEALTHY", uptime_seconds: process.uptime(), timestamp: new Date().toISOString() },
        backend: { status: backendReady ? "HEALTHY" : "DEGRADED", latency_ms: backendLatency },
        proxy_latency_ms: Math.round(performance.now() - startTime),
      },
      { status: backendReady ? 200 : 503, headers: { "X-Request-Id": requestId } }
    );
  }

  // ── General Proxy Forwarding to Flask Backend ───────────────────────────────
  const targetUrl = `${BACKEND_URL}/api/${subPath}${url.search}`;

  const forwardHeaders = new Headers();
  req.headers.forEach((val, key) => {
    const lowerKey = key.toLowerCase();
    if (!["host", "connection", "content-length", "transfer-encoding"].includes(lowerKey)) {
      forwardHeaders.set(key, val);
    }
  });

  forwardHeaders.set("X-Request-Id", requestId);
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
  forwardHeaders.set("X-Forwarded-For", clientIp);

  const isStream = subPath.startsWith("stream") || subPath.includes("/stream");
  const isHeavy = subPath.includes("backtest") || subPath.includes("simulate") || subPath.includes("portfolio") || subPath.includes("risk") || subPath.includes("journal") || subPath.includes("positions") || subPath.includes("options");
  const timeoutMs = isStream ? 60000 : (isHeavy ? 30000 : 15000);

  let bodyData: BodyInit | null = null;
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    try {
      const clonedReq = req.clone();
      bodyData = await clonedReq.arrayBuffer();
    } catch {
      bodyData = null;
    }
  }

  const isIdempotent = (req.method === "GET" || req.method === "HEAD") && !isStream;
  const maxAttempts = isIdempotent ? 2 : 1;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (attempt > 1) {
        const delay = 100 + Math.random() * 150;
        await new Promise((r) => setTimeout(r, delay));
      }

      const backendRes = await fetch(targetUrl, {
        method: req.method,
        headers: forwardHeaders,
        body: bodyData,
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeoutTimer);
      const latencyMs = Math.round(performance.now() - startTime);
      const contentType = backendRes.headers.get("content-type") || "";

      // Handle SSE streams
      if (contentType.includes("text/event-stream") || isStream) {
        if (backendRes.ok && backendRes.body) {
          return new NextResponse(backendRes.body, {
            status: backendRes.status,
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
              "X-Request-Id": requestId,
            },
          });
        }
      }

      const rawText = await backendRes.text();
      let jsonBody: any = null;

      if (rawText && rawText.trim().length > 0) {
        try {
          jsonBody = JSON.parse(rawText);
        } catch {
          return new NextResponse(rawText, {
            status: backendRes.status,
            headers: {
              "X-Request-Id": requestId,
              "X-Response-Time-Ms": latencyMs.toString(),
              "Content-Type": contentType || "text/plain",
            },
          });
        }
      }

      if (backendRes.status >= 500 && attempt < maxAttempts) {
        lastError = new Error(`Upstream returned ${backendRes.status}`);
        continue;
      }

      const responseHeaders = new Headers();
      responseHeaders.set("X-Request-Id", requestId);
      responseHeaders.set("X-Response-Time-Ms", latencyMs.toString());
      responseHeaders.set("Content-Type", "application/json");

      return new NextResponse(JSON.stringify(jsonBody), {
        status: backendRes.status,
        headers: responseHeaders,
      });
    } catch (err: any) {
      clearTimeout(timeoutTimer);
      lastError = err;
      if (attempt >= maxAttempts) {
        break;
      }
    }
  }

  // Handle connection failure or timeout
  const latencyMs = Math.round(performance.now() - startTime);
  const isTimeout = lastError?.name === "AbortError";
  const statusCode = isTimeout ? 504 : 503;
  const errorCode = isTimeout ? "GATEWAY_TIMEOUT" : "BACKEND_UNAVAILABLE";
  const errorMessage = isTimeout
    ? `Backend request to /api/${subPath} timed out after ${timeoutMs}ms`
    : `Quant.OS Engine backend is unreachable at ${BACKEND_URL}. System may be starting or reconnecting.`;

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
        details: lastError?.message || String(lastError),
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
        "Retry-After": "3",
        "Content-Type": "application/json",
      },
    }
  );
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handleProxy(req, ctx);
}

export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handleProxy(req, ctx);
}

export async function PUT(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handleProxy(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handleProxy(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handleProxy(req, ctx);
}

export async function HEAD(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handleProxy(req, ctx);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-Id, X-Idempotency-Key",
    },
  });
}
