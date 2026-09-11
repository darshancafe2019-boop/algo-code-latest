import { NextRequest, NextResponse } from "next/server";
import { instrumentMaster } from "@/lib/market-data/instrument-master";
import { marketState } from "@/lib/market-data/market-state";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category") || searchParams.get("asset") || "ALL";
    const query = searchParams.get("q") || searchParams.get("search") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);

    const instruments = instrumentMaster.search(query, category, limit);

    // Enrich instruments with cached real quotes (or null if not yet received)
    const items = instruments.map((inst) => {
      const quote = marketState.getQuote(inst.symbol);
      const tick = marketState.getTick(inst.symbol);

      return {
        ...inst,
        quote: quote || null,
        tick: tick || null,
        lastPrice: quote?.last_price ?? tick?.ltp ?? null,
        changePct: quote?.change_pct ?? tick?.changePct ?? null,
        volume: quote?.volume ?? tick?.volume ?? null,
        openInterest: quote?.open_interest ?? tick?.openInterest ?? null,
        bid: quote?.bid ?? tick?.bid ?? null,
        ask: quote?.ask ?? tick?.ask ?? null,
        freshness: quote?.freshness_status ?? tick?.freshness ?? "MISSING",
      };
    });

    return NextResponse.json({
      success: true,
      category,
      query,
      count: items.length,
      data: items,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch markets universe",
      },
      { status: 500 }
    );
  }
}
