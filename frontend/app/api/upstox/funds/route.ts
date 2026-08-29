import { NextRequest, NextResponse } from "next/server";
import { getUpstoxFunds } from "@/lib/upstox/account";
import { UpstoxError } from "@/lib/upstox/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const funds = await getUpstoxFunds();
    return NextResponse.json({
      status: "success",
      data: funds,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const isUpstoxErr = error instanceof UpstoxError;
    const statusCode = isUpstoxErr ? error.statusCode : 500;
    return NextResponse.json(
      {
        status: "error",
        error: isUpstoxErr ? error.code : "UPSTOX_FUNDS_ERROR",
        message: error.message || "Failed to fetch Upstox funds and margin.",
      },
      { status: statusCode }
    );
  }
}
