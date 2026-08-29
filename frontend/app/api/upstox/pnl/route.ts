import { NextRequest, NextResponse } from "next/server";
import { getUpstoxPnLSummary } from "@/lib/upstox/account";
import { UpstoxError } from "@/lib/upstox/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const pnl = await getUpstoxPnLSummary();
    return NextResponse.json({
      status: "success",
      data: pnl,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const isUpstoxErr = error instanceof UpstoxError;
    const statusCode = isUpstoxErr ? error.statusCode : 500;
    return NextResponse.json(
      {
        status: "error",
        error: isUpstoxErr ? error.code : "UPSTOX_PNL_ERROR",
        message: error.message || "Failed to calculate Upstox P&L summary.",
      },
      { status: statusCode }
    );
  }
}
