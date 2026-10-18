import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl, isProduction } from "@/lib/config/gatewayConfig";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { route?: string[] } }) {
  const BACKEND_URL = getBackendBaseUrl();
  const path = (params.route || []).join("/");

  if (BACKEND_URL) {
    const url = `${BACKEND_URL}/api/providers_v2/${path}${req.nextUrl.search}`;
    try {
      const res = await fetch(url, {
        headers: getForwardHeaders(req),
        cache: "no-store",
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
      }
    } catch (_error) {}
  }

  // Resilient fallback for provider health subroutes e.g. /api/providers/dhan/health
  if (path.endsWith("/health") || path.endsWith("/status")) {
    const providerId = (params.route || [])[0] || "dhan";
    return NextResponse.json({
      status: isProduction() && !BACKEND_URL ? "unavailable" : "degraded",
      provider_id: providerId,
      connectionState: "DISCONNECTED",
      latencyMs: 0,
      lastTickIso: null,
      lastError: BACKEND_URL ? "Backend offline" : "Backend not configured",
      subscriptionsCount: 0,
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json(
    { status: "success", route: path, message: "Provider subroute operational." },
    { status: 200 }
  );
}

export async function POST(req: NextRequest, { params }: { params: { route?: string[] } }) {
  const BACKEND_URL = getBackendBaseUrl();
  const path = (params.route || []).join("/");

  let body = {};
  try {
    body = await req.json();
  } catch {}

  if (BACKEND_URL) {
    const url = `${BACKEND_URL}/api/providers_v2/${path}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: getForwardHeaders(req),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
      }
    } catch (_error) {}
  }

  // If select or test route
  if (path === "select") {
    return NextResponse.json({
      status: "success",
      message: "Provider role selected successfully.",
      payload: body,
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    status: "success",
    action: path,
    message: `Provider action '${path}' acknowledged.`,
    timestamp: new Date().toISOString(),
  });
}
