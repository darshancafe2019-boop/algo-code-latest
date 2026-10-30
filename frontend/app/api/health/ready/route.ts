import { NextResponse } from "next/server";
import { getBackendConfigStatus } from "@/lib/config/gatewayConfig";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const startTime = performance.now();
  const requestId = req.headers.get("x-request-id") || `health_${Date.now().toString(36)}`;
  const config = getBackendConfigStatus();

  if (!config.valid) {
    return NextResponse.json(
      {
        status: "unavailable",
        backend: false,
        database: false,
        market_data: false,
        binance: false,
        upstox: false,
        frontend: {
          status: "HEALTHY",
          uptime_seconds: process.uptime(),
          timestamp: new Date().toISOString(),
        },
        error: {
          code: "BACKEND_NOT_CONFIGURED",
          message:
            config.reason ||
            "Backend internal URL is not configured. In production (Vercel), configure BACKEND_INTERNAL_URL or BACKEND_API_URL in project environment settings.",
        },
        proxy_latency_ms: Math.round(performance.now() - startTime),
      },
      {
        status: 503,
        headers: { "X-Request-Id": requestId, "Cache-Control": "no-store, max-age=0" },
      }
    );
  }

  const effectiveBackendUrl = config.url;

  const probeHeaders = {
    Accept: "application/json",
    "X-Request-Id": requestId,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 QuantOS/1.0",
  };

  try {
    let bRes = await fetch(`${effectiveBackendUrl}/health/ready`, {
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
      headers: probeHeaders,
    }).catch(() => null);

    if (!bRes || !bRes.ok) {
      bRes = await fetch(`${effectiveBackendUrl}/api/health/ready`, {
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
        headers: probeHeaders,
      }).catch(() => null);
    }

    const bLatency = Math.round(performance.now() - startTime);
    if (bRes && bRes.ok) {
      const bData = await bRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          status: bData.status || "ok",
          backend: bData.backend ?? true,
          database: bData.database ?? true,
          market_data: bData.market_data ?? true,
          binance: bData.binance ?? true,
          upstox: bData.upstox ?? true,
          frontend: {
            status: "HEALTHY",
            uptime_seconds: process.uptime(),
            timestamp: new Date().toISOString(),
          },
          proxy_latency_ms: Math.round(performance.now() - startTime),
          backend_latency_ms: bLatency,
        },
        {
          status: 200,
          headers: { "X-Request-Id": requestId, "Cache-Control": "no-store, max-age=0" },
        }
      );
    }
  } catch {
    // Backend genuinely unreachable
  }

  return NextResponse.json(
    {
      status: "unavailable",
      backend: false,
      database: false,
      market_data: false,
      binance: false,
      upstox: false,
      frontend: {
        status: "HEALTHY",
        uptime_seconds: process.uptime(),
        timestamp: new Date().toISOString(),
      },
      error: {
        code: "BACKEND_UNREACHABLE",
        message: `Backend engine is offline at ${effectiveBackendUrl}`,
      },
      proxy_latency_ms: Math.round(performance.now() - startTime),
    },
    {
      status: 503,
      headers: { "X-Request-Id": requestId, "Cache-Control": "no-store, max-age=0" },
    }
  );
}
