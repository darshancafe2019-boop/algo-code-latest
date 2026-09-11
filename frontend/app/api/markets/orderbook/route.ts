import { NextRequest, NextResponse } from "next/server";
import { marketState } from "@/lib/market-data/market-state";

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
    const depth = marketState.getDepth(sym);

    if (!depth) {
      return NextResponse.json({
        success: true,
        symbol: sym,
        depth: null,
        message: `Orderbook depth for ${sym} is awaiting live provider stream.`,
      });
    }

    return NextResponse.json({
      success: true,
      symbol: sym,
      depth,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to retrieve orderbook depth",
      },
      { status: 500 }
    );
  }
}
