import { NextRequest, NextResponse } from "next/server";
import { getBackendConfigStatus, isProduction } from "@/lib/config/gatewayConfig";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { route?: string[] } }) {
  const config = getBackendConfigStatus();
  const path = (params.route || []).join("/");

  if (config.valid) {
    const BACKEND_URL = config.url;
    const url = `${BACKEND_URL}/api/providers_v2/${path}${req.nextUrl.search}`;
    try {
      const res = await fetch(url, {
        headers: getForwardHeaders(req),
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
      }
      if (res.status === 401 || res.status === 403) {
        const data = await res.json().catch(() => ({ error: "Authentication required" }));
        return NextResponse.json(data, { status: res.status });
      }
    } catch (_error) {}
  }

  // Resilient fallback for provider health subroutes e.g. /api/providers/dhan/health
  if (path.endsWith("/health") || path.endsWith("/status")) {
    const providerId = (params.route || [])[0] || "dhan";
    return NextResponse.json({
      status: config.valid ? "degraded" : "unavailable",
      provider_id: providerId,
      connectionState: "DISCONNECTED",
      latencyMs: 0,
      lastTickIso: null,
      lastError: config.valid ? "Backend offline" : "Backend not configured",
      subscriptionsCount: 0,
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json(
    {
      status: "error",
      code: config.valid ? "BACKEND_UNAVAILABLE" : "BACKEND_NOT_CONFIGURED",
      route: path,
      message: config.valid
        ? `Quant.OS Engine backend is offline at ${config.url}`
        : (config.reason || "Quant.OS Engine backend is not configured."),
    },
    { status: 503 }
  );
}

export async function POST(req: NextRequest, { params }: { params: { route?: string[] } }) {
  const config = getBackendConfigStatus();
  const path = (params.route || []).join("/");

  let body = {};
  try {
    body = await req.json();
  } catch {}

  if (config.valid) {
    const BACKEND_URL = config.url;
    const url = `${BACKEND_URL}/api/providers_v2/${path}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: getForwardHeaders(req),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
      }
      if (res.status === 401 || res.status === 403) {
        const data = await res.json().catch(() => ({ error: "Authentication required" }));
        return NextResponse.json(data, { status: res.status });
      }
    } catch (_error) {}
  }

  return NextResponse.json(
    {
      status: "error",
      code: config.valid ? "BACKEND_UNAVAILABLE" : "BACKEND_NOT_CONFIGURED",
      action: path,
      message: config.valid
        ? `Quant.OS Engine backend is offline at ${config.url}`
        : (config.reason || "Quant.OS Engine backend is not configured."),
    },
    { status: 503 }
  );
}
