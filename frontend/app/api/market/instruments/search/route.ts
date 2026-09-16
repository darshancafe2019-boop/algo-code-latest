import { NextRequest, NextResponse } from "next/server";
import { instrumentMaster } from "@/lib/market-data/instrument-master";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || undefined;
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  const results = instrumentMaster.search(q, category, limit);

  return NextResponse.json({
    status: "success",
    query: q,
    count: results.length,
    instruments: results,
  });
}
