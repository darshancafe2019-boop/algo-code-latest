import { NextRequest, NextResponse } from "next/server";
import { globalAlphaVantageClient } from "@/lib/alphavantage/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/alphavantage/sentiment?tickers=AAPL,MSFT&topics=technology,financial_markets
 * Returns market news & sentiment analysis from Alpha Vantage.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const tickersParam = url.searchParams.get("tickers") || url.searchParams.get("ticker");
    const topicsParam = url.searchParams.get("topics") || url.searchParams.get("topic");

    const tickers = tickersParam ? tickersParam.split(",").map((s) => s.trim()) : undefined;
    const topics = topicsParam ? topicsParam.split(",").map((s) => s.trim()) : undefined;

    const res = await globalAlphaVantageClient.getNewsSentiment(tickers, topics);
    return NextResponse.json(res, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "PROVIDER_ERROR",
        success: false,
        data: [],
        message: err.message || "Failed to fetch news sentiment from Alpha Vantage.",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
