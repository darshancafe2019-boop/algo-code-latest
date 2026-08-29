import { NextRequest, NextResponse } from "next/server";
import { getUpstoxTrades } from "@/lib/upstox/account";
import { UpstoxError } from "@/lib/upstox/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category")?.toUpperCase(); // "STOCK", "FUTURE", "OPTION", "ALL"

    let trades = await getUpstoxTrades();
    if (category && category !== "ALL") {
      trades = trades.filter((t) => t.asset_class === category);
    }

    return NextResponse.json({
      status: "success",
      count: trades.length,
      data: trades,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const isUpstoxErr = error instanceof UpstoxError;
    const statusCode = isUpstoxErr ? error.statusCode : 500;
    return NextResponse.json(
      {
        status: "error",
        error: isUpstoxErr ? error.code : "UPSTOX_TRADES_ERROR",
        message: error.message || "Failed to fetch Upstox trades.",
      },
      { status: statusCode }
    );
  }
}
