import { NextRequest, NextResponse } from "next/server";
import { getUpstoxPositions } from "@/lib/upstox/account";
import { UpstoxError } from "@/lib/upstox/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category")?.toUpperCase(); // "STOCK", "FUTURE", "OPTION", "ALL"

    let positions = await getUpstoxPositions();
    if (category && category !== "ALL") {
      positions = positions.filter((p) => p.asset_class === category);
    }

    return NextResponse.json({
      status: "success",
      count: positions.length,
      data: positions,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const isUpstoxErr = error instanceof UpstoxError;
    const statusCode = isUpstoxErr ? error.statusCode : 500;
    return NextResponse.json(
      {
        status: "error",
        error: isUpstoxErr ? error.code : "UPSTOX_POSITIONS_ERROR",
        message: error.message || "Failed to fetch Upstox positions.",
      },
      { status: statusCode }
    );
  }
}
