import { NextRequest, NextResponse } from "next/server";
import { globalAlphaVantageClient } from "@/lib/alphavantage/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/alphavantage/indicators?symbol=AAPL&indicator=EMA|SMA|RSI|MACD|VWAP|ATR|BBANDS&interval=daily|15min&period=14
 * Returns normalized technical indicator values calculated by Alpha Vantage.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const symbol = url.searchParams.get("symbol") || "AAPL";
    const indicator = (url.searchParams.get("indicator") || "RSI").toUpperCase() as
      | "EMA"
      | "SMA"
      | "RSI"
      | "MACD"
      | "VWAP"
      | "ATR"
      | "BBANDS";
    const interval = url.searchParams.get("interval") || "daily";
    const period = parseInt(url.searchParams.get("period") || "", 10) || undefined;

    const res = await globalAlphaVantageClient.getTechnicalIndicator(symbol, indicator, interval, period);
    return NextResponse.json(res, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "PROVIDER_ERROR",
        success: false,
        data: null,
        message: err.message || "Failed to fetch indicator from Alpha Vantage.",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
