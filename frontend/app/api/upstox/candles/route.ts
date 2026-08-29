import { NextRequest, NextResponse } from "next/server";
import { getHistoricalCandles, UpstoxCandleInterval, UpstoxError } from "@/lib/upstox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/upstox/candles
 * Fetches normalized historical or intraday candles.
 * Parameters: instrument_key, interval (1m, 5m, 15m, 30m, 1h, 1d), from, to
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const searchParams = req.nextUrl?.searchParams || url.searchParams;

    const instrumentKey = searchParams.get("instrument_key") || searchParams.get("symbol") || "NSE_INDEX|Nifty 50";
    const interval = (searchParams.get("interval") || "15m") as UpstoxCandleInterval;
    const fromDate = searchParams.get("from") || undefined;
    const toDate = searchParams.get("to") || undefined;
    const oauthToken = req.cookies?.get?.("upstox_access_token")?.value;

    const candles = await getHistoricalCandles(
      instrumentKey,
      interval,
      fromDate,
      toDate,
      oauthToken
    );

    return NextResponse.json({
      status: "success",
      provider: "UPSTOX",
      instrumentKey,
      interval,
      count: candles.length,
      candles,
    });
  } catch (err: any) {
    const statusCode = err instanceof UpstoxError && err.statusCode ? err.statusCode : 500;
    return NextResponse.json(
      {
        status: "error",
        error: err?.errorCode || "UPSTOX_CANDLES_ERROR",
        message: err?.message || "Failed to fetch historical candles.",
      },
      { status: statusCode }
    );
  }
}
