import { NextRequest, NextResponse } from "next/server";
import { marketState } from "@/lib/market-data/market-state";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const underlying = searchParams.get("underlying") || searchParams.get("symbol");

    if (!underlying) {
      return NextResponse.json(
        { success: false, error: "Query parameter 'underlying' (e.g. NIFTY, BANKNIFTY) is required" },
        { status: 400 }
      );
    }

    const und = underlying.toUpperCase().trim();
    const chain = marketState.getOptionChain(und);

    if (!chain) {
      return NextResponse.json({
        success: true,
        underlying: und,
        chain: null,
        message: `Option chain for ${und} is awaiting initial live ticks.`,
      });
    }

    return NextResponse.json({
      success: true,
      underlying: und,
      chain,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to retrieve option chain",
      },
      { status: 500 }
    );
  }
}
