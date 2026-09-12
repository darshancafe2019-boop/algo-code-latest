import { NextRequest, NextResponse } from "next/server";
import { deltaProductService } from "@/lib/brokers/delta/delta-product-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams;
    const underlying = (search.get("underlying") ?? "BTC").trim().toUpperCase();

    const registry = await deltaProductService.getExpiryRegistry(underlying);

    return NextResponse.json({
      status: "success",
      provider: "DELTA",
      source: "DELTA_EXCHANGE",
      underlying: registry.underlying,
      count: registry.expiries.length,
      nearest_expiry: registry.expiries.length > 0 ? registry.expiries[0].expiryApiFormat : null,
      expiries: registry.expiries,
      all_underlyings: registry.allUnderlyings,
      last_updated: registry.lastUpdated,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        error: error?.message || "Failed to discover Delta expiries",
        provider: "DELTA",
      },
      { status: 500 }
    );
  }
}
