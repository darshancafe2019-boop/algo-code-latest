import { NextRequest, NextResponse } from "next/server";
import { marketState } from "@/lib/market-data/market-state";
import { instrumentMaster } from "@/lib/market-data/instrument-master";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: "Query parameter 'symbol' is required" },
        { status: 400 }
      );
    }

    const sym = symbol.toUpperCase().trim();
    const quote = marketState.getQuote(sym);
    const tick = marketState.getTick(sym);
    const resolved = instrumentMaster.resolve(sym);

    if (!quote && !tick) {
      return NextResponse.json({
        success: true,
        symbol: sym,
        instrument: resolved || null,
        quote: null,
        tick: null,
        status: "UNAVAILABLE",
        message: "No live data packet has been received yet for this symbol.",
      });
    }

    return NextResponse.json({
      success: true,
      symbol: sym,
      instrument: resolved || null,
      quote: quote || null,
      tick: tick || null,
      status: quote?.freshness_status ?? tick?.freshness ?? "LIVE",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to retrieve market quote",
      },
      { status: 500 }
    );
  }
}
