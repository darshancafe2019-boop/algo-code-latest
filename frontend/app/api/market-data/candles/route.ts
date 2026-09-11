import { NextRequest, NextResponse } from "next/server";
import { candleEngine } from "@/lib/market-data/candle-engine";
import { CandleTimeframe } from "@/lib/market-data/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_TIMEFRAMES: CandleTimeframe[] = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1D"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const timeframe = (searchParams.get("timeframe") || "5m") as CandleTimeframe;
  const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 1000);

  if (!symbol) {
    return NextResponse.json(
      { error: "SYMBOL_REQUIRED", message: "Query parameter 'symbol' is required." },
      { status: 400 }
    );
  }

  if (!VALID_TIMEFRAMES.includes(timeframe)) {
    return NextResponse.json(
      {
        error: "INVALID_TIMEFRAME",
        message: `Timeframe '${timeframe}' is invalid. Supported: ${VALID_TIMEFRAMES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const cleanSym = symbol.trim().toUpperCase();
  const candles = candleEngine.getCandles(cleanSym, timeframe, limit);
  const forming = candleEngine.getFormingCandle(cleanSym, timeframe);

  return NextResponse.json({
    status: "SUCCESS",
    symbol: cleanSym,
    timeframe,
    count: candles.length,
    candles,
    formingCandle: forming || null,
    timestamp: new Date().toISOString(),
  });
}
