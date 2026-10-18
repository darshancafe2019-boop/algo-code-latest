import { NextRequest, NextResponse } from "next/server";
import { getForwardHeaders } from "@/lib/proxy-headers";
import { getBackendBaseUrl } from "@/lib/config/gatewayConfig";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const broker = searchParams.get("broker") || "";

  // Query Python backend if configured
  const BACKEND_URL = getBackendBaseUrl();
  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/positions`, {
        headers: getForwardHeaders(req),
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
      if (res.status === 401 || res.status === 403) {
        const data = await res.json().catch(() => ({ error: "Authentication or authorization required" }));
        return NextResponse.json(data, { status: res.status });
      }
    } catch {}
  }

  // Fallback segregated empty positions list
  return NextResponse.json({
    status: "success",
    timestamp: Date.now(),
    mode: "PAPER",
    positions: [],
    count: 0,
    broker: broker || "ALL",
  });
}
