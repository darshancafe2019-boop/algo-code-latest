import { NextRequest, NextResponse } from "next/server";
import { optionChainEngine } from "@/lib/market-data/option-chain-engine";
import { marketState } from "@/lib/market-data/market-state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const underlying = searchParams.get("underlying") || searchParams.get("symbol");
  const expiry = searchParams.get("expiry") || undefined;

  if (!underlying) {
    return NextResponse.json(
      { error: "UNDERLYING_REQUIRED", message: "Query parameter 'underlying' is required (e.g., NIFTY, BANKNIFTY)." },
      { status: 400 }
    );
  }

  const cleanUnderlying = underlying.trim().toUpperCase();
  const chain = optionChainEngine.getOptionChain(cleanUnderlying, expiry);

  if (!chain) {
    return NextResponse.json(
      {
        status: "NOT_FOUND",
        underlying: cleanUnderlying,
        message: `No active option chain data found for '${cleanUnderlying}'.`,
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: "SUCCESS",
    underlying: cleanUnderlying,
    chain,
    timestamp: new Date().toISOString(),
  });
}
