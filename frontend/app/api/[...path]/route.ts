import { NextRequest, NextResponse } from "next/server";
import { getForwardHeaders, isSameOriginBrowserRequest } from "@/lib/proxy-headers";
import {
  getBackendBaseUrl,
  getBackendConfigStatus,
  getGatewayHttpUrl,
  getGatewaySecret,
  isProduction,
} from "@/lib/config/gatewayConfig";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

interface CacheEntry {
  body: string;
  contentType: string;
  status: number;
  timestamp: number;
}
const PROXY_MEMORY_CACHE = new Map<string, CacheEntry>();

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
async function handleProxy(req: NextRequest, ctx: { params?: { path: string[] } | Promise<{ path: string[] }> }) {
  let pathSegments: string[] = [];
  try {
    if (ctx?.params) {
      const resolved = ctx.params instanceof Promise ? await ctx.params : ctx.params;
      if (Array.isArray(resolved?.path)) {
        pathSegments = resolved.path;
      }
    }
  } catch {}

  if (pathSegments.length === 0) {
    const urlObj = new URL(req.url);
    const cleanPath = urlObj.pathname.replace(/^\/api\/?/, "");
    pathSegments = cleanPath.split("/").filter(Boolean);
  }

  const rawSubPath = pathSegments.join("/");
  const subPath = rawSubPath.replace(/^api\//, "");
  const url = new URL(req.url);
  const requestId = req.headers.get("x-request-id") || `bff_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const startTime = performance.now();

  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  const hasBrowserOrigin = Boolean(req.headers.get("origin") || req.headers.get("referer"));
  const sameOriginBrowserRequest = isSameOriginBrowserRequest(req);

  if (isMutation && hasBrowserOrigin && !sameOriginBrowserRequest) {
    return NextResponse.json(
      {
        ok: false,
        success: false,
        status: "error",
        error: {
          code: "CSRF_VALIDATION_FAILED",
          message: "Cross-origin state-changing requests are not allowed.",
        },
        requestId,
      },
      { status: 403, headers: { "X-Request-Id": requestId } }
    );
  }

  const configStatus = getBackendConfigStatus();
  const BACKEND_URL = configStatus.url;
  const GATEWAY_URL = getGatewayHttpUrl();
  const GATEWAY_SECRET = getGatewaySecret();

  // Fail-closed in production if backend URL is not configured or points to an invalid loopback address
  if (!configStatus.valid) {
    return NextResponse.json(
      {
        ok: false,
        success: false,
        status: "error",
        data: null,
        error: {
          code: "BACKEND_NOT_CONFIGURED",
          message:
            configStatus.reason ||
            "Quant.OS Engine backend URL is not configured. Set BACKEND_INTERNAL_URL or BACKEND_API_URL in production environment.",
          retryable: false,
        },
        requestId,
        timestamp: new Date().toISOString(),
        latencyMs: 0,
      },
      {
        status: 503,
        headers: {
          "X-Request-Id": requestId,
          "Content-Type": "application/json",
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }

  // ── 1. Market Data Gateway Proxy with Auto-Fallback ─────────────────────────
  const isGatewayOnlyPath = (subPath.startsWith("market/") || subPath === "market") &&
    !subPath.startsWith("market/funds") &&
    !subPath.startsWith("market/expiries") &&
    !subPath.startsWith("market/instruments") &&
    !subPath.startsWith("market/markets") &&
    !subPath.startsWith("market/quote") &&
    !subPath.startsWith("market/option-chain");

  if (isGatewayOnlyPath && GATEWAY_URL) {
    const gatewayPath = subPath.replace(/^market\/?/, "");
    const gatewayTarget = `${GATEWAY_URL}/${gatewayPath}${url.search}`;
    try {
      const resp = await fetch(gatewayTarget, {
        method: req.method,
        headers: {
          ...(GATEWAY_SECRET ? { "X-Gateway-Secret": GATEWAY_SECRET } : {}),
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
    if (!BACKEND_URL) {
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
            code: "BACKEND_NOT_CONFIGURED",
            message: "Backend engine URL is not configured. Set BACKEND_INTERNAL_URL or BACKEND_API_URL.",
          },
          proxy_latency_ms: Math.round(performance.now() - startTime),
        },
        { status: 503, headers: { "X-Request-Id": requestId } }
      );
    }

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
        signal: AbortSignal.timeout(6000),
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
          signal: AbortSignal.timeout(6000)
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
  const forwardHeaders = getForwardHeaders(req, requestId);
  if (isMutation && sameOriginBrowserRequest) {
    forwardHeaders.set("X-Requested-With", "XMLHttpRequest");
  }

  const isStream = subPath.startsWith("stream") || subPath.includes("/stream") || subPath.includes("market-data/stream") || req.headers.get("accept")?.includes("text/event-stream");
  const isStatus = subPath === "status" || subPath.startsWith("status/") || subPath.includes("health");
  const isIndicator = subPath.includes("indicator");
  const isAuth = subPath.startsWith("auth") || subPath.includes("/auth") || subPath.includes("auth/");
  const isHeavy = subPath.includes("backtest") || subPath.includes("simulate") || subPath.includes("risk/simulate");
  const timeoutMs = isStream ? 5000 : (isStatus || isIndicator ? 4000 : (isAuth ? 25000 : (isHeavy ? 12000 : 8000)));

  let bodyData: BodyInit | null = null;
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    try {
      bodyData = await req.text();
    } catch {
      bodyData = null;
    }
  }

  // Canonical upstream target URL (no waterfall probing)
  const canonicalPath = subPath.startsWith("api/") ? subPath : `api/${subPath}`;
  const targetUrl = `${BACKEND_URL}/${canonicalPath}${url.search}`;

  let finalResponse: Response | null = null;
  let lastError: any = null;

  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

  if (req.signal) {
    req.signal.addEventListener("abort", () => {
      clearTimeout(timeoutTimer);
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
    finalResponse = backendRes;
  } catch (err: any) {
    clearTimeout(timeoutTimer);
    lastError = err;
  }

  const latencyMs = Math.round(performance.now() - startTime);

  // Bounded duration logging for proxy requests (never logging secrets, cookies, or tokens)
  if (finalResponse) {
    if (latencyMs > 1500 || !finalResponse.ok) {
      console.log(`[BFF_PROXY] [req_id=${requestId}] [latency=${latencyMs}ms] ${req.method} /api/${subPath} -> ${finalResponse.status}`);
    }
  } else {
    console.warn(`[BFF_PROXY_FAIL] [req_id=${requestId}] [latency=${latencyMs}ms] ${req.method} /api/${subPath} -> ${lastError?.name || "Error"}: ${lastError?.message || String(lastError)}`);
  }

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
        // Upstream returned non-JSON text/html (e.g. Render / Cloudflare / Vercel error page)
        const cleanSnippet = rawText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
        const fallbackMsg = cleanSnippet || `Upstream service returned HTTP ${finalResponse.status}`;
        return NextResponse.json(
          {
            ok: false,
            success: false,
            status: "error",
            error: {
              code: `UPSTREAM_HTTP_${finalResponse.status}`,
              message: fallbackMsg,
              status: finalResponse.status,
            },
            message: fallbackMsg,
            requestId,
            timestamp: new Date().toISOString(),
            latencyMs,
          },
          {
            status: finalResponse.status >= 400 ? finalResponse.status : 502,
            headers: {
              "X-Request-Id": requestId,
              "X-Response-Time-Ms": latencyMs.toString(),
              "Content-Type": "application/json",
            },
          }
        );
      }
    } else if (!finalResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          status: "error",
          error: {
            code: `UPSTREAM_HTTP_${finalResponse.status}`,
            message: `Upstream service returned HTTP ${finalResponse.status}`,
            status: finalResponse.status,
          },
          message: `Upstream service returned HTTP ${finalResponse.status}`,
          requestId,
          timestamp: new Date().toISOString(),
          latencyMs,
        },
        {
          status: finalResponse.status,
          headers: {
            "X-Request-Id": requestId,
            "X-Response-Time-Ms": latencyMs.toString(),
            "Content-Type": "application/json",
          },
        }
      );
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

    const responseString = JSON.stringify(jsonBody ?? {});
    if (finalResponse.ok && req.method === "GET" && (subPath.includes("instruments") || subPath.includes("universe/instruments") || subPath.includes("expiries"))) {
      const entry: CacheEntry = {
        body: responseString,
        contentType: "application/json",
        status: finalResponse.status,
        timestamp: Date.now(),
      };
      PROXY_MEMORY_CACHE.set(targetUrl, entry);
      PROXY_MEMORY_CACHE.set(subPath, entry);
    }

    return new NextResponse(responseString, {
      status: finalResponse.status,
      headers: responseHeaders,
    });
  }

  // Resilient Cache Fallback: Only serve static catalog data from memory cache
  if (req.method === "GET" && (subPath.includes("instruments") || subPath.includes("expiries"))) {
    const cached = PROXY_MEMORY_CACHE.get(targetUrl) || PROXY_MEMORY_CACHE.get(subPath);
    if (cached && (Date.now() - cached.timestamp < 15 * 60 * 1000)) {
      return new NextResponse(cached.body, {
        status: cached.status,
        headers: {
          "X-Request-Id": requestId,
          "X-Response-Time-Ms": latencyMs.toString(),
          "X-Proxy-Cache": "STALE-FALLBACK",
          "Content-Type": cached.contentType,
        },
      });
    }
  }

  // Handle connection failure or timeout with structured JSON preventing client crash
  const isTimeout = lastError?.name === "AbortError" || lastError?.name === "TimeoutError";
  const statusCode = isTimeout ? 504 : 503;
  const errorCode = isTimeout ? "GATEWAY_TIMEOUT" : "BACKEND_UNAVAILABLE";
  const errorMessage = isTimeout
    ? `Backend request to /api/${subPath} timed out after ${timeoutMs}ms`
    : `Quant.OS Engine backend is unreachable at ${BACKEND_URL}. System is initializing or reconnecting.`;

  if (isStream) {
    return new NextResponse(
      `event: error\ndata: ${JSON.stringify({
        code: isTimeout ? "STREAM_TIMEOUT" : "STREAM_UNAVAILABLE",
        message: errorMessage,
        timestamp: new Date().toISOString(),
      })}\n\n`,
      {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Request-Id": requestId,
        },
      }
    );
  }

  return NextResponse.json(
    {
      ok: false,
      success: false,
      status: "error",
      message: errorMessage,
      error_code: errorCode,
      data: null,
      error: {
        code: errorCode,
        message: errorMessage,
        retryable: isTimeout,
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

export async function GET(req: NextRequest, ctx: any) {
  try {
    return await handleProxy(req, ctx);
  } catch (err: any) {
    console.error("[BFF_PROXY] GET error:", err);
    return NextResponse.json({ status: "error", error: err?.message || "Internal Proxy Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: any) {
  try {
    return await handleProxy(req, ctx);
  } catch (err: any) {
    console.error("[BFF_PROXY] POST error:", err);
    return NextResponse.json({ status: "error", error: err?.message || "Internal Proxy Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: any) {
  try {
    return await handleProxy(req, ctx);
  } catch (err: any) {
    console.error("[BFF_PROXY] PUT error:", err);
    return NextResponse.json({ status: "error", error: err?.message || "Internal Proxy Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: any) {
  try {
    return await handleProxy(req, ctx);
  } catch (err: any) {
    console.error("[BFF_PROXY] DELETE error:", err);
    return NextResponse.json({ status: "error", error: err?.message || "Internal Proxy Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: any) {
  try {
    return await handleProxy(req, ctx);
  } catch (err: any) {
    console.error("[BFF_PROXY] PATCH error:", err);
    return NextResponse.json({ status: "error", error: err?.message || "Internal Proxy Error" }, { status: 500 });
  }
}

export async function HEAD(req: NextRequest, ctx: any) {
  try {
    return await handleProxy(req, ctx);
  } catch (err: any) {
    return new NextResponse(null, { status: 500 });
  }
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
