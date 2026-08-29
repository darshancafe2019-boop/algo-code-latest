import { NextRequest, NextResponse } from "next/server";
import { getUpstoxHoldings } from "@/lib/upstox/account";
import { UpstoxError } from "@/lib/upstox/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const holdings = await getUpstoxHoldings();
    return NextResponse.json({
      status: "success",
      count: holdings.length,
      data: holdings,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const isUpstoxErr = error instanceof UpstoxError;
    const statusCode = isUpstoxErr ? error.statusCode : 500;
    return NextResponse.json(
      {
        status: "error",
        error: isUpstoxErr ? error.code : "UPSTOX_HOLDINGS_ERROR",
        message: error.message || "Failed to fetch Upstox holdings.",
      },
      { status: statusCode }
    );
  }
}
