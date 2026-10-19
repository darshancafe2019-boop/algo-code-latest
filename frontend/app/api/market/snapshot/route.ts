import { NextRequest, NextResponse } from "next/server";
import { getLiveSnapshotQuotes } from "@/lib/market-data/live-snapshot-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const symbolsParam = searchParams.get("symbols") || searchParams.get("symbol") || "";
  const providerParam = (searchParams.get("provider") || "UPSTOX").toUpperCase();

  const symbols = symbolsParam
    ? symbolsParam.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
    : [];

  const quotes = await getLiveSnapshotQuotes(symbols, providerParam);

  return NextResponse.json({
    status: "success",
    timestamp: Date.now(),
    quotes,
    totalCount: Object.keys(quotes).length,
    source: "REAL_MARKET_GATEWAY",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const symbols = Array.isArray(body.symbols) ? body.symbols.map((s: string) => s.toUpperCase()) : [];
    const providerParam = (body.provider || "UPSTOX").toUpperCase();

    const quotes = await getLiveSnapshotQuotes(symbols, providerParam);

    return NextResponse.json({
      status: "success",
      timestamp: Date.now(),
      quotes,
      totalCount: Object.keys(quotes).length,
      source: "REAL_MARKET_GATEWAY",
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to parse request body",
      },
      { status: 400 }
    );
  }
}
