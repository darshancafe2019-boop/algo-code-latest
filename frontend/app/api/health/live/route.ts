import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_API_URL || "http://127.0.0.1:5050";

export async function GET(req: Request) {
  const startTime = performance.now();
  const requestId = req.headers.get("x-request-id") || `health_${Date.now().toString(36)}`;

  // Probe Flask backend on port 5050 or 5000
  try {
    const liveRes = await fetch(`${BACKEND_URL}/api/health/live`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
      headers: { Accept: "application/json", "X-Request-Id": requestId },
    });
    if (liveRes.ok) {
      const liveData = await liveRes.json().catch(() => ({ status: "ok" }));
      return NextResponse.json({
        status: liveData.status || "ok",
        service: liveData.service || "alpha-algo-backend",
        frontend: { status: "ALIVE", uptime_seconds: process.uptime(), timestamp: new Date().toISOString() },
        proxy_latency_ms: Math.round(performance.now() - startTime),
      }, {
        status: 200,
        headers: { "X-Request-Id": requestId, "Cache-Control": "no-store, max-age=0" },
      });
    }
  } catch {
    // Fallback probe to alternate /api/health/live or port 5000 if 5050 had an issue
    try {
      const fallbackUrl = BACKEND_URL.includes("5050") ? "http://127.0.0.1:5000" : "http://127.0.0.1:5050";
      const liveRes = await fetch(`${fallbackUrl}/api/health/live`, {
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
        headers: { Accept: "application/json", "X-Request-Id": requestId },
      });
      if (liveRes.ok) {
        const liveData = await liveRes.json().catch(() => ({ status: "ok" }));
        return NextResponse.json({
          status: liveData.status || "ok",
          service: liveData.service || "alpha-algo-backend",
          frontend: { status: "ALIVE", uptime_seconds: process.uptime(), timestamp: new Date().toISOString() },
          proxy_latency_ms: Math.round(performance.now() - startTime),
        }, {
          status: 200,
          headers: { "X-Request-Id": requestId, "Cache-Control": "no-store, max-age=0" },
        });
      }
    } catch {
      // Backend genuinely unreachable
    }
  }

  return NextResponse.json({
    status: "unavailable",
    error: {
      code: "BACKEND_UNREACHABLE",
      message: `Quantitative backend unreachable at ${BACKEND_URL}`,
    },
    proxy_latency_ms: Math.round(performance.now() - startTime),
  }, {
    status: 503,
    headers: { "X-Request-Id": requestId, "Cache-Control": "no-store, max-age=0" },
  });
}
