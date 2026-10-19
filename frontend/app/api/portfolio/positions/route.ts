import { NextRequest, NextResponse } from "next/server";
import { getForwardHeaders } from "@/lib/proxy-headers";
import { getBackendConfigStatus } from "@/lib/config/gatewayConfig";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const broker = searchParams.get("broker") || "";
  const config = getBackendConfigStatus();

  if (!config.valid) {
    return NextResponse.json(
      {
        status: "error",
        code: "BACKEND_NOT_CONFIGURED",
        message: config.reason || "Quant.OS Engine backend is not configured.",
        positions: [],
        count: 0,
        broker: broker || "ALL",
        timestamp: Date.now(),
      },
      { status: 503 }
    );
  }

  const BACKEND_URL = config.url;
  try {
    const res = await fetch(`${BACKEND_URL}/api/positions`, {
      headers: getForwardHeaders(req),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    if (res.status === 401 || res.status === 403) {
      const data = await res.json().catch(() => ({ error: "Authentication or authorization required" }));
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(
      {
        status: "error",
        code: "UPSTREAM_ERROR",
        message: `Backend returned status ${res.status}`,
        positions: [],
        count: 0,
      },
      { status: res.status }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        code: "BACKEND_UNAVAILABLE",
        message: `Quant.OS Engine backend is unreachable at ${BACKEND_URL}: ${err.message}`,
        positions: [],
        count: 0,
        broker: broker || "ALL",
        timestamp: Date.now(),
      },
      { status: 503 }
    );
  }
}
