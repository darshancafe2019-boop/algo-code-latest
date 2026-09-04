import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_API_URL || "http://127.0.0.1:5050";
const GATEWAY_URL = process.env.MARKET_GATEWAY_URL || "http://127.0.0.1:5051";
const GATEWAY_SECRET = process.env.MARKET_GATEWAY_SECRET || "changeme-set-a-strong-random-secret-here";

/**
 * Universal Permanent 404-Proof Backend-for-Frontend (BFF) Proxy Handler
 * ======================================================================
 * Features:
 * 1. Automatic path normalization (strips redundant /api/ prefixes).
 * 2. Multi-tier upstream routing (probes /api/{path}, fallback to /{path}, and slash normalization).
 * 3. Market gateway routing with automated fallback to Flask backend if standalone gateway is offline.
 * 4. Structured JSON responses preventing HTML 404 syntax errors in client JSON parsers.
 * 5. Correlation request ID propagation & latency telemetry.
 */
async function handleProxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  const pathSegments = params.path || [];
  const rawSubPath = pathSegments.join("/");
  // Normalize by stripping any redundant leading 'api/'
  const subPath = rawSubPath.replace(/^api\//, "");
  const url = new URL(req.url);
  const requestId = req.headers.get("x-request-id") || `bff_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const startTime = performance.now();

  // ── 1. Market Data Gateway Proxy with Auto-Fallback ─────────────────────────
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
        signal: AbortSignal.timeout(4000),
        cache: "no-store",
      });

      if (resp.ok || (resp.status !== 404 && resp.status !== 502 && resp.status !== 503)) {
        const data = await resp.text();
        return new NextResponse(data, {
          status: resp.status,
          headers: {
            "Content-Type": resp.headers.get("Content-Type") || "application/json",
            "X-Request-Id": requestId,
            "X-Gateway-Proxied": "true",
          },
        });
      }
      // If gateway returned 404/503, fallback to main backend below
    } catch {
      // Gateway offline - seamlessly route to backend below
    }
  }

  // ── 2. Special Case: /api/health* Probes ────────────────────────────────────
  if (subPath.startsWith("health")) {
    if (subPath === "health/live") {
      try {
        const liveRes = await fetch(`${BACKEND_URL}/api/health/live`, {
          cache: "no-store",
          signal: AbortSignal.timeout(3000),
          headers: { "Accept": "application/json", "X-Request-Id": requestId }
        });
        if (liveRes.ok) {
          const liveData = await liveRes.json().catch(() => ({ status: "ok" }));
          return NextResponse.json({
            status: liveData.status || "ok",
            service: liveData.service || "alpha-algo-backend",
            frontend: { status: "ALIVE", uptime_seconds: process.uptime(), timestamp: new Date().toISOString() },
            proxy_latency_ms: Math.round(performance.now() - startTime),
          }, { status: 200, headers: { "X-Request-Id": requestId } });
        }
      } catch {
        // Fallback probe to alternate /health/live
        try {
          const liveRes = await fetch(`${BACKEND_URL}/health/live`, {
            cache: "no-store",
            signal: AbortSignal.timeout(3000),
            headers: { "Accept": "application/json", "X-Request-Id": requestId }
          });
          if (liveRes.ok) {
            return NextResponse.json({
              status: "ok",
              service: "alpha-algo-backend",
              frontend: { status: "ALIVE", uptime_seconds: process.uptime(), timestamp: new Date().toISOString() },
              proxy_latency_ms: Math.round(performance.now() - startTime),
            }, { status: 200, headers: { "X-Request-Id": requestId } });
          }
        } catch {
          // Backend is genuinely unreachable
          return NextResponse.json({
            status: "unavailable",
            error: {
              code: "BACKEND_UNREACHABLE",
              message: `Quantitative backend unreachable at ${BACKEND_URL}`,
            },
            proxy_latency_ms: Math.round(performance.now() - startTime),
          }, { status: 503, headers: { "X-Request-Id": requestId } });
        }
      }
    }

    if (subPath === "health/dependencies") {
      try {
        const bRes = await fetch(`${BACKEND_URL}/health/dependencies`, { cache: "no-store", signal: AbortSignal.timeout(3000) });
        if (bRes.ok) {
          const bData = await bRes.json();
          return NextResponse.json(bData, { status: bRes.status, headers: { "X-Request-Id": requestId } });
        }
      } catch {
        // Fallthrough
      }
    }

    // Default /api/health or /api/health/ready: probe real backend ready status
    try {
      const t0 = performance.now();
      const bRes = await fetch(`${BACKEND_URL}/api/health/ready`, {
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
        headers: { "Accept": "application/json", "X-Request-Id": requestId }
      });
      const bLatency = Math.round(performance.now() - t0);
      if (bRes.ok) {
        const bData = await bRes.json().catch(() => ({}));
        return NextResponse.json({
          status: bData.status || "ok",
          backend: bData.backend ?? true,
          database: bData.database ?? true,
          market_data: bData.market_data ?? true,
          binance: bData.binance ?? true,
          upstox: bData.upstox ?? true,
          frontend: { status: "HEALTHY", uptime_seconds: process.uptime(), timestamp: new Date().toISOString() },
          proxy_latency_ms: Math.round(performance.now() - startTime),
          backend_latency_ms: bLatency,
        }, { status: 200, headers: { "X-Request-Id": requestId } });
      }
    } catch {
      // If /api/health/ready failed, try legacy /health/ready
      try {
        const bRes = await fetch(`${BACKEND_URL}/health/ready`, {
          cache: "no-store",
          signal: AbortSignal.timeout(3000)
        });
        if (bRes.ok) {
          const bData = await bRes.json().catch(() => ({}));
          return NextResponse.json({
            status: "ok",
            backend: true,
            database: bData.database === "OK" || bData.database === true,
            market_data: true,
            binance: true,
            upstox: true,
            frontend: { status: "HEALTHY", uptime_seconds: process.uptime() },
            proxy_latency_ms: Math.round(performance.now() - startTime),
          }, { status: 200, headers: { "X-Request-Id": requestId } });
        }
      } catch {
        // Backend genuinely offline
      }
    }

    return NextResponse.json(
      {
        status: "unavailable",
        backend: false,
        database: false,
        market_data: false,
        binance: false,
        upstox: false,
        frontend: { status: "HEALTHY", uptime_seconds: process.uptime(), timestamp: new Date().toISOString() },
        error: {
          code: "BACKEND_UNREACHABLE",
          message: `Backend engine is offline at ${BACKEND_URL}`,
        },
        proxy_latency_ms: Math.round(performance.now() - startTime),
      },
      { status: 503, headers: { "X-Request-Id": requestId } }
    );
  }

  // ── 3. General Proxy Forwarding with Intelligent Path Fallback ──────────────
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

  // Generate candidate target URLs to permanently eliminate 404 prefix mismatches
  const candidateUrls: string[] = [
    `${BACKEND_URL}/api/${subPath}${url.search}`,
    `${BACKEND_URL}/${subPath}${url.search}`,
  ];

  // If subPath ends with a slash or does not, test alternate variant
  if (subPath.endsWith("/")) {
    candidateUrls.push(`${BACKEND_URL}/api/${subPath.slice(0, -1)}${url.search}`);
  } else {
    candidateUrls.push(`${BACKEND_URL}/api/${subPath}/${url.search}`);
  }

  let finalResponse: Response | null = null;
  let lastError: any = null;

  for (const targetUrl of candidateUrls) {
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const backendRes = await fetch(targetUrl, {
        method: req.method,
        headers: forwardHeaders,
        body: bodyData,
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeoutTimer);

      // If response is NOT 404, we found the right route
      if (backendRes.status !== 404) {
        finalResponse = backendRes;
        break;
      }

      // If it returned 404, keep candidate response as fallback if other candidates fail
      finalResponse = backendRes;
    } catch (err: any) {
      clearTimeout(timeoutTimer);
      lastError = err;
      if (err.name === "AbortError") {
        break;
      }
    }
  }

  const latencyMs = Math.round(performance.now() - startTime);

  // If we got a valid response from any candidate URL
  if (finalResponse) {
    const contentType = finalResponse.headers.get("content-type") || "";

    // Handle SSE streams
    if (contentType.includes("text/event-stream") || isStream) {
      if (finalResponse.ok && finalResponse.body) {
        return new NextResponse(finalResponse.body, {
          status: finalResponse.status,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Request-Id": requestId,
          },
        });
      }
    }

    const rawText = await finalResponse.text();
    let jsonBody: any = null;

    if (rawText && rawText.trim().length > 0) {
      try {
        jsonBody = JSON.parse(rawText);
      } catch {
        return new NextResponse(rawText, {
          status: finalResponse.status,
          headers: {
            "X-Request-Id": requestId,
            "X-Response-Time-Ms": latencyMs.toString(),
            "Content-Type": contentType || "text/plain",
          },
        });
      }
    }

    const responseHeaders = new Headers();
    responseHeaders.set("X-Request-Id", requestId);
    responseHeaders.set("X-Response-Time-Ms", latencyMs.toString());
    responseHeaders.set("Content-Type", "application/json");

    if (typeof (finalResponse.headers as any).getSetCookie === "function") {
      const cookies: string[] = (finalResponse.headers as any).getSetCookie();
      for (const cookie of cookies) {
        responseHeaders.append("set-cookie", cookie);
      }
    } else {
      const setCookie = finalResponse.headers.get("set-cookie");
      if (setCookie) {
        responseHeaders.set("set-cookie", setCookie);
      }
    }

    return new NextResponse(JSON.stringify(jsonBody ?? {}), {
      status: finalResponse.status,
      headers: responseHeaders,
    });
  }

  // Handle connection failure or timeout with structured JSON preventing client crash
  const isTimeout = lastError?.name === "AbortError";
  const statusCode = isTimeout ? 504 : 503;
  const errorCode = isTimeout ? "GATEWAY_TIMEOUT" : "BACKEND_UNAVAILABLE";
  const errorMessage = isTimeout
    ? `Backend request to /api/${subPath} timed out after ${timeoutMs}ms`
    : `Quant.OS Engine backend is unreachable at ${BACKEND_URL}. System is initializing or reconnecting.`;

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
        "Retry-After": "2",
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
