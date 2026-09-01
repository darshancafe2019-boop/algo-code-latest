import { NextRequest, NextResponse } from "next/server";
import { globalAlphaVantageClient } from "@/lib/alphavantage/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/alphavantage/candles?symbol=AAPL&timeframe=5m|15m|1d&outputsize=compact|full
 * Returns normalized OHLCV candles from Alpha Vantage.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const symbol = url.searchParams.get("symbol") || "AAPL";
    const timeframe = (url.searchParams.get("timeframe") || url.searchParams.get("tf") || "5m").toLowerCase();
    const outputSize = (url.searchParams.get("outputsize") || "compact") as "compact" | "full";

    let res;
    if (timeframe === "1d" || timeframe === "d" || timeframe === "daily") {
      res = await globalAlphaVantageClient.getDailyCandles(symbol, outputSize);
    } else {
      let interval: "1min" | "5min" | "15min" | "30min" | "60min" = "5min";
      if (timeframe === "1m" || timeframe === "1min") interval = "1min";
      else if (timeframe === "5m" || timeframe === "5min") interval = "5min";
      else if (timeframe === "15m" || timeframe === "15min") interval = "15min";
      else if (timeframe === "30m" || timeframe === "30min") interval = "30min";
      else if (timeframe === "60m" || timeframe === "1h" || timeframe === "60min") interval = "60min";

      res = await globalAlphaVantageClient.getIntradayCandles(symbol, interval, outputSize);
    }

    return NextResponse.json(res, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "PROVIDER_ERROR",
        success: false,
        data: [],
        message: err.message || "Failed to fetch candles from Alpha Vantage.",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
