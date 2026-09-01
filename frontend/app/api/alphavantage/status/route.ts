import { NextRequest, NextResponse } from "next/server";
import { globalAlphaVantageClient } from "@/lib/alphavantage/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/alphavantage/status
 * Returns authoritative Alpha Vantage provider health, rate limits, masked keys,
 * and enabled data capabilities.
 */
export async function GET(req: NextRequest) {
  try {
    const status = await globalAlphaVantageClient.getStatus();
    return NextResponse.json(status, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "ERROR",
        connected: false,
        hasApiKey: false,
        apiKeyMasked: "Not Configured",
        latencyMs: 0,
        rateLimit: { maxCallsPerMin: 5, callsMadeThisMin: 0, isRateLimited: false, rateLimitedUntil: null },
        supportedCapabilities: [],
        providerRole: "MARKET_DATA_ONLY",
        orderExecutionBroker: "BINANCE_UPSTOX_PAPER_UNMODIFIED",
        errorMessage: err.message,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
