import { NextRequest, NextResponse } from "next/server";
import { marketState } from "@/lib/market-data/market-state";
import { instrumentMaster } from "@/lib/market-data/instrument-master";

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
  const inst = instrumentMaster.resolve(cleanSym);
  const quote = marketState.getQuote(cleanSym);

  if (!quote) {
    return NextResponse.json(
      {
        status: "NOT_FOUND",
        symbol: cleanSym,
        resolvedInstrument: inst || null,
        message: `No active market data quote available for symbol '${cleanSym}'.`,
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: "SUCCESS",
    symbol: cleanSym,
    quote,
    instrument: inst || null,
    timestamp: new Date().toISOString(),
  });
}
