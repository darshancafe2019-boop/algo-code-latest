import { NextRequest, NextResponse } from "next/server";
import { globalAlphaVantageClient } from "@/lib/alphavantage/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/alphavantage/quotes?symbol=AAPL
 * Fetches normalized real-time / delayed quotes from Alpha Vantage with caching.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const symbol = url.searchParams.get("symbol") || "AAPL";
    const res = await globalAlphaVantageClient.getQuote(symbol);

    return NextResponse.json(res, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "PROVIDER_ERROR",
        success: false,
        data: null,
        message: err.message || "Failed to fetch quote from Alpha Vantage.",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
