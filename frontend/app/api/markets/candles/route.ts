import { NextRequest, NextResponse } from "next/server";
import { marketState } from "@/lib/market-data/market-state";
import { candleEngine } from "@/lib/market-data/candle-engine";
import { CandleTimeframe } from "@/lib/market-data/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol");
    const timeframe = (searchParams.get("timeframe") || "5m") as CandleTimeframe;
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: "Query parameter 'symbol' is required" },
        { status: 400 }
      );
    }

    const sym = symbol.toUpperCase().trim();
    const candles = marketState.getCandles(sym, timeframe);
    const forming = candleEngine.getFormingCandle(sym, timeframe);

    return NextResponse.json({
      success: true,
      symbol: sym,
      timeframe,
      count: candles.length,
      candles: candles.slice(-limit),
      formingCandle: forming || null,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to retrieve market candles",
      },
      { status: 500 }
    );
  }
}
