import { NextRequest, NextResponse } from "next/server";
import { instrumentMaster } from "@/lib/market-data/instrument-master";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q") || searchParams.get("query") || "";
    const category = searchParams.get("category") || "ALL";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    const results = instrumentMaster.search(q, category, limit);

    return NextResponse.json({
      success: true,
      query: q,
      count: results.length,
      data: results,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Search failed",
      },
      { status: 500 }
    );
  }
}
