import { NextRequest, NextResponse } from "next/server";
import { deltaProductService } from "@/lib/brokers/delta/delta-product-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams;
    const underlying = (search.get("underlying") ?? "BTC").trim().toUpperCase();
    const expiry = search.get("expiry") || search.get("expiry_date") || undefined;

    const snapshot = await deltaProductService.fetchOptionChainSnapshot(underlying, expiry);

    return NextResponse.json({
      status: "success",
      success: true,
      source: "DELTA_EXCHANGE",
      broker: "DELTA",
      provider: "DELTA",
      underlying: snapshot.underlying,
      expiry: snapshot.expiry,
      selected_expiry: snapshot.selectedExpiry,
      available_expiries: snapshot.availableExpiries,
      all_underlyings: snapshot.allUnderlyings,
      spot: snapshot.spotPrice,
      spot_price: snapshot.spotPrice,
      atmStrike: snapshot.atmStrike,
      atm_strike: snapshot.atmStrike,
      contracts: snapshot.contractsCount,
      total_strikes: snapshot.strikesCount,
      calls: snapshot.callsCount,
      puts: snapshot.putsCount,
      rowCount: snapshot.rows.length,
      rows: snapshot.rows,
      strikes: snapshot.rows,
      ws_subscription_symbol: snapshot.wsSubscriptionSymbol,
      data_status: "LIVE",
      timestamp: new Date().toISOString(),
      snapshot,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        success: false,
        error: error instanceof Error ? error.message : "Unknown Delta option-chain error",
        source: "DELTA_EXCHANGE",
      },
      { status: 500 }
    );
  }
}
