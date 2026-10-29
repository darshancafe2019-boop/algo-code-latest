import { NextResponse } from "next/server";
import { getBackendConfigStatus, isProduction } from "@/lib/config/gatewayConfig";

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
        error: {
          code: "BACKEND_NOT_CONFIGURED",
          message:
            config.reason ||
            "Backend internal URL is not configured. In production (Vercel), configure BACKEND_INTERNAL_URL or BACKEND_API_URL in project environment settings.",
        },
        frontend: {
          status: "ALIVE",
          uptime_seconds: process.uptime(),
          timestamp: new Date().toISOString(),
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

  // Probe Flask backend (probe /health/live first, fallback to /api/health/live)
  try {
    let liveRes = await fetch(`${effectiveBackendUrl}/health/live`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
      headers: { Accept: "application/json", "X-Request-Id": requestId },
    }).catch(() => null);

    if (!liveRes || !liveRes.ok) {
      liveRes = await fetch(`${effectiveBackendUrl}/api/health/live`, {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
        headers: { Accept: "application/json", "X-Request-Id": requestId },
      }).catch(() => null);
    }

    if (liveRes && liveRes.ok) {
      const liveData = await liveRes.json().catch(() => ({ status: "ok" }));
      return NextResponse.json(
        {
          status: liveData.status || "ok",
          service: liveData.service || "alpha-algo-backend",
          frontend: {
            status: "ALIVE",
            uptime_seconds: process.uptime(),
            timestamp: new Date().toISOString(),
          },
          proxy_latency_ms: Math.round(performance.now() - startTime),
        },
        {
          status: 200,
          headers: { "X-Request-Id": requestId, "Cache-Control": "no-store, max-age=0" },
        }
      );
    }
  } catch {
    // In local development only, try alternative port 5000
    if (!isProduction()) {
      try {
        const fallbackUrl = effectiveBackendUrl.includes("5050")
          ? "http://127.0.0.1:5000"
          : "http://127.0.0.1:5050";
        const liveRes = await fetch(`${fallbackUrl}/api/health/live`, {
          cache: "no-store",
          signal: AbortSignal.timeout(3000),
          headers: { Accept: "application/json", "X-Request-Id": requestId },
        });
        if (liveRes.ok) {
          const liveData = await liveRes.json().catch(() => ({ status: "ok" }));
          return NextResponse.json(
            {
              status: liveData.status || "ok",
              service: liveData.service || "alpha-algo-backend",
              frontend: {
                status: "ALIVE",
                uptime_seconds: process.uptime(),
                timestamp: new Date().toISOString(),
              },
              proxy_latency_ms: Math.round(performance.now() - startTime),
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
    }
  }

  return NextResponse.json(
    {
      status: "unavailable",
      error: {
        code: "BACKEND_UNREACHABLE",
        message: `Quantitative backend unreachable at ${effectiveBackendUrl}`,
      },
      frontend: {
        status: "ALIVE",
        uptime_seconds: process.uptime(),
        timestamp: new Date().toISOString(),
      },
      proxy_latency_ms: Math.round(performance.now() - startTime),
    },
    {
      status: 503,
      headers: { "X-Request-Id": requestId, "Cache-Control": "no-store, max-age=0" },
    }
  );
}
