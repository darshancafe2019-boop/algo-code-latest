import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_API_URL || "http://127.0.0.1:5050";

export async function GET(req: Request) {
  const startTime = performance.now();
  const requestId = req.headers.get("x-request-id") || `health_${Date.now().toString(36)}`;

  try {
    const bRes = await fetch(`${BACKEND_URL}/api/health/ready`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
      headers: { Accept: "application/json", "X-Request-Id": requestId },
    });
    const bLatency = Math.round(performance.now() - startTime);
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
      }, {
        status: 200,
        headers: { "X-Request-Id": requestId, "Cache-Control": "no-store, max-age=0" },
      });
    }
  } catch {
    // Backend genuinely unreachable
  }

  return NextResponse.json({
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
  }, {
    status: 503,
    headers: { "X-Request-Id": requestId, "Cache-Control": "no-store, max-age=0" },
  });
}
