import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_API_URL ||
  "http://127.0.0.1:5050";

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${BACKEND_URL}/feed/market-data-feed/authorize`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
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
