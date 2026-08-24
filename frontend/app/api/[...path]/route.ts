import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_API_URL || "http://127.0.0.1:5050";
const GATEWAY_URL = process.env.MARKET_GATEWAY_URL || "http://127.0.0.1:5051";
const GATEWAY_SECRET = process.env.MARKET_GATEWAY_SECRET || "changeme-set-a-strong-random-secret-here";

/**
 * In-Memory Next.js BFF Last-Known-Good Ticker & Market Snapshot Cache
 */
interface CachedTicker {
  data: any;
  timestamp: number;
  provider: string;
}

const globalTickerCache = new Map<string, CachedTicker>();
const inFlightTickerPromises = new Map<string, Promise<any>>();

// Seed baseline anchor prices for instant resilience
const ANCHOR_TICKERS: Record<string, { last: number; high: number; low: number; volume: number; change_pct: number }> = {
  "BTC/USDT": { last: 65420.0, high: 66800.0, low: 64200.0, volume: 24500.0, change_pct: 1.45 },
  "ETH/USDT": { last: 3480.0, high: 3560.0, low: 3410.0, volume: 185000.0, change_pct: 2.10 },
  "SOL/USDT": { last: 152.40, high: 158.20, low: 147.50, volume: 2400000.0, change_pct: 3.85 },
  "BNB/USDT": { last: 585.20, high: 594.0, low: 578.0, volume: 450000.0, change_pct: 0.90 },
  "XRP/USDT": { last: 0.6250, high: 0.6420, low: 0.6110, volume: 48000000.0, change_pct: 1.80 },
  "DOGE/USDT": { last: 0.1240, high: 0.1310, low: 0.1190, volume: 85000000.0, change_pct: 4.10 },
};

function normalizeSymbol(rawSymbol: string | null): string {
  if (!rawSymbol || !rawSymbol.trim()) return "BTC/USDT";
  try {
    const decoded = decodeURIComponent(rawSymbol.trim()).toUpperCase().replace("-", "/").replace("_", "/");
    if (decoded.includes("/")) return decoded;
    for (const quote of ["USDT", "USDC", "USD", "EUR"]) {
      if (decoded.endsWith(quote) && decoded.length > quote.length) {
        return `${decoded.slice(0, -quote.length)}/${quote}`;
      }
    }
    return `${decoded}/USDT`;
  } catch {
    return rawSymbol.toUpperCase();
  }
}

function getFallbackTicker(symbol: string, reason: string): any {
  const normSym = normalizeSymbol(symbol);
  const cached = globalTickerCache.get(normSym);
  const nowIso = new Date().toISOString();

  if (cached) {
    return {
      status: "warning",
      ok: true,
      success: true,
      message: `Live exchange feed reconnecting (${reason}). Displaying cached price snapshot.`,
      is_stale: true,
      data_status: "CACHED_FALLBACK",
      symbol: normSym,
      ...cached.data,
      timestamp: nowIso,
    };
  }

  const anchor = ANCHOR_TICKERS[normSym] || ANCHOR_TICKERS["BTC/USDT"];
  return {
    status: "warning",
    ok: true,
    success: true,
    message: `Cold start fallback: Live exchange reconnecting for ${normSym}.`,
    is_stale: true,
    data_status: "ANCHOR_FALLBACK",
    symbol: normSym,
    last: anchor.last,
    price: anchor.last,
    high: anchor.high,
    low: anchor.low,
    volume: anchor.volume,
    change_pct: anchor.change_pct,
    change_val: +(anchor.last * (anchor.change_pct / 100)).toFixed(2),
    bid: +(anchor.last * 0.9995).toFixed(2),
    ask: +(anchor.last * 1.0005).toFixed(2),
    latency_ms: 1,
    provider: "bff_anchor_fallback",
    timestamp: nowIso,
  };
}

/**
 * Universal Backend-for-Frontend (BFF) Proxy Handler
 * Intercepts all /api/* requests, enforces timeouts, propagates correlation IDs,
 * handles request deduplication, exponential backoff retries, and fallback caching.
 */
async function handleProxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  const pathSegments = params.path || [];
  const subPath = pathSegments.join("/");
  const url = new URL(req.url);
  const targetUrl = `${BACKEND_URL}/api/${subPath}${url.search}`;

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
          status: "degraded",
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
        { status: 503, headers: { "X-Request-Id": requestId, "Retry-After": "5" } }
      );
    }
  }

  // Special case: /api/health* probes
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
        status: "ok",
        frontend: { status: "HEALTHY", uptime_seconds: process.uptime(), timestamp: new Date().toISOString() },
        backend: { status: backendReady ? "HEALTHY" : "DEGRADED", latency_ms: backendLatency },
        proxy_latency_ms: Math.round(performance.now() - startTime),
      },
      { status: 200, headers: { "X-Request-Id": requestId } }
    );
  }

  // --- SPECIAL CASE: /api/ticker (Ultra-Resilient Market Ticker Ingestion) ---
  if (subPath === "ticker" && req.method === "GET") {
    const rawSymbol = url.searchParams.get("symbol") || "BTC/USDT";
    const normSymbol = normalizeSymbol(rawSymbol);

    // 1. Check in-flight deduplication
    const flightKey = `ticker_${normSymbol}`;
    if (inFlightTickerPromises.has(flightKey)) {
      try {
        const deduplicatedResult = await inFlightTickerPromises.get(flightKey);
        if (deduplicatedResult) {
          const latencyMs = Math.round(performance.now() - startTime);
          return NextResponse.json(deduplicatedResult, {
            status: 200,
            headers: {
              "X-Request-Id": requestId,
              "X-Response-Time-Ms": latencyMs.toString(),
              "X-Cache-Status": "DEDUPLICATED",
              "Content-Type": "application/json",
            },
          });
        }
      } catch {
        // Continue to fresh fetch on deduplication error
      }
    }

    // 2. Execute upstream fetch with single-flight registration & tight 3.5s timeout
    const fetchPromise = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);

      try {
        const backendRes = await fetch(targetUrl, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "X-Request-Id": requestId,
          },
          signal: controller.signal,
          cache: "no-store",
        });

        clearTimeout(timer);
        if (backendRes.ok) {
          const json = await backendRes.json();
          // Store in LKG cache
          globalTickerCache.set(normSymbol, {
            data: json.data || json,
            timestamp: Date.now(),
            provider: json.provider || "backend",
          });
          return json;
        }
        throw new Error(`Upstream returned HTTP ${backendRes.status}`);
      } catch (err: any) {
        clearTimeout(timer);
        // Fallback gracefully from LKG cache or catalog anchor
        return getFallbackTicker(normSymbol, err.name === "AbortError" ? "timeout" : err.message);
      }
    })();

    inFlightTickerPromises.set(flightKey, fetchPromise);

    try {
      const result = await fetchPromise;
      const latencyMs = Math.round(performance.now() - startTime);
      const isStale = result.is_stale || result.status === "warning";

      return NextResponse.json(result, {
        status: 200,
        headers: {
          "X-Request-Id": requestId,
          "X-Response-Time-Ms": latencyMs.toString(),
          "X-Cache-Status": isStale ? "STALE-FALLBACK" : "LIVE",
          "Content-Type": "application/json",
        },
      });
    } finally {
      inFlightTickerPromises.delete(flightKey);
    }
  }

  // --- GENERAL PROXY LOGIC FOR ALL OTHER ENDPOINTS ---
  const forwardHeaders = new Headers();
  req.headers.forEach((val, key) => {
    const lowerKey = key.toLowerCase();
    if (!["host", "connection", "content-length", "transfer-encoding"].includes(lowerKey)) {
      forwardHeaders.set(key, val);
    }
  });

  forwardHeaders.set("X-Request-Id", requestId);
  forwardHeaders.set("X-Forwarded-For", req.ip || "127.0.0.1");

  // Determine timeout: allow 30s for backtest, 8s for standard endpoints
  const isHeavy = subPath.includes("backtest") || subPath.includes("simulate");
  const timeoutMs = isHeavy ? 30000 : 8000;

  let bodyData: BodyInit | null = null;
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    try {
      const clonedReq = req.clone();
      bodyData = await clonedReq.arrayBuffer();
    } catch {
      bodyData = null;
    }
  }

  // Bounded retry loop (1 retry for idempotent GET requests)
  const isIdempotent = req.method === "GET" || req.method === "HEAD";
  const maxAttempts = isIdempotent ? 2 : 1;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (attempt > 1) {
        // Exponential backoff with jitter before retry
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
      if (contentType.includes("text/event-stream")) {
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

      const rawText = await backendRes.text();
      let jsonBody: any = null;

      if (rawText && rawText.trim().length > 0) {
        try {
          jsonBody = JSON.parse(rawText);
        } catch {
          return NextResponse.json(
            {
              ok: backendRes.ok,
              success: backendRes.ok,
              status: backendRes.ok ? "success" : "error",
              data: null,
              error: {
                code: `UPSTREAM_HTTP_${backendRes.status}`,
                message: rawText.substring(0, 300) || `Backend returned HTTP status ${backendRes.status}`,
                retryable: backendRes.status >= 500,
              },
              requestId,
              timestamp: new Date().toISOString(),
              latencyMs,
            },
            { status: backendRes.status }
          );
        }
      }

      // If upstream returned 502/503/504 on first attempt, allow retry loop to run
      if (backendRes.status >= 502 && attempt < maxAttempts) {
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

  // Handle final timeout or connection failure
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
