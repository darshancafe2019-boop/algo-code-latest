import { NextRequest, NextResponse } from "next/server";
import { marketState } from "@/lib/market-data/market-state";
import { NormalizedQuote } from "@/lib/market-data/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get("symbols") || "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const quotesMap: Record<string, NormalizedQuote> = {};

  // 1. Check in-memory market state
  for (const sym of symbols) {
    const q = marketState.getQuote(sym);
    if (q) {
      quotesMap[sym] = q;
    }
  }

  // 2. Fetch live snapshot from Market Data Gateway (port 5051) for requested/missing symbols
  const toFetch = symbols.length > 0 ? symbols : ["RELIANCE", "NIFTY", "BANKNIFTY", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN"];
  try {
    const gwRes = await fetch(`http://127.0.0.1:5051/snapshot?symbols=${toFetch.join(",")}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (gwRes.ok) {
      const gwData = await gwRes.json();
      const gwQuotes = gwData.quotes || {};
      for (const [sym, rawQ] of Object.entries(gwQuotes)) {
        if (rawQ && typeof rawQ === "object") {
          const normQ = rawQ as NormalizedQuote;
          quotesMap[sym] = normQ;
        }
      }
    }
  } catch (err) {
    console.debug("[DHAN API] Gateway snapshot fetch note:", err);
  }

  return NextResponse.json({
    status: "success",
    provider: "dhan",
    count: Object.keys(quotesMap).length,
    quotes: quotesMap,
    timestamp: new Date().toISOString(),
  });
}

