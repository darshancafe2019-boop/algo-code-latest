import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl, isProduction } from "@/lib/config/gatewayConfig";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const backendUrl = getBackendBaseUrl();
  if (isProduction() && !backendUrl) {
    return NextResponse.json(
      {
        status: "error",
        success: false,
        error: "Backend service URL is not configured in production environment.",
      },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(`${backendUrl}/feed/market-data-feed/authorize`, {
      cache: "no-store",
      headers: {
        ...getForwardHeaders(req),
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json(
      {
        status: "error",
        success: false,
        message: "Failed to authorize Upstox V3 Market Data Feed from upstream backend.",
      },
      { status: res.status }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        success: false,
        error: error?.message || "Internal server error connecting to Upstox feed authorizer",
      },
      { status: 500 }
    );
  }
}
