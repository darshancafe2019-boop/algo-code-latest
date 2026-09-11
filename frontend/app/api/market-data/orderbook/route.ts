import { NextRequest, NextResponse } from "next/server";
import { orderBookEngine } from "@/lib/market-data/orderbook-engine";
import { marketState } from "@/lib/market-data/market-state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json(
      { error: "SYMBOL_REQUIRED", message: "Query parameter 'symbol' is required." },
      { status: 400 }
    );
  }

  const cleanSym = symbol.trim().toUpperCase();
  const book = orderBookEngine.getOrderBook(cleanSym) || marketState.getDepth(cleanSym);

  if (!book) {
    return NextResponse.json(
      {
        status: "NOT_FOUND",
        symbol: cleanSym,
        message: `No active orderbook/market depth available for '${cleanSym}'.`,
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: "SUCCESS",
    symbol: cleanSym,
    orderbook: book,
    timestamp: new Date().toISOString(),
  });
}
