import { NextRequest, NextResponse } from "next/server";
import { globalAlphaVantageClient } from "@/lib/alphavantage/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/alphavantage/ping
 * Performs a lightweight server-side ping test against Alpha Vantage.
 */
export async function POST(req: NextRequest) {
  try {
    const result = await globalAlphaVantageClient.ping();
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        latencyMs: 0,
        message: err.message || "Failed to ping Alpha Vantage.",
      },
      { status: 200 }
    );
  }
}
