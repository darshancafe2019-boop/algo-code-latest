import { NextRequest, NextResponse } from "next/server";
import { searchOnlineUpstoxInstruments, InstrumentCategory } from "@/lib/upstox/instruments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/upstox/instruments/search
 * Searches official Upstox instruments and indices with taxonomy filtering.
 * Example: /api/upstox/instruments/search?q=NIFTY&category=OPTIONS
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const searchParams = req.nextUrl?.searchParams || url.searchParams;
    const query = searchParams.get("q") || searchParams.get("query") || "";
    const limit = Number(searchParams.get("limit")) || 20;
    const category = (searchParams.get("category")?.toUpperCase() || "ALL") as InstrumentCategory;

    const results = await searchOnlineUpstoxInstruments(query, limit, category);

    return NextResponse.json({
      status: "success",
      count: results.length,
      query,
      category,
      instruments: results,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        error: "INSTRUMENT_SEARCH_ERROR",
        message: err?.message || "Failed to search instruments.",
      },
      { status: 500 }
    );
  }
}
