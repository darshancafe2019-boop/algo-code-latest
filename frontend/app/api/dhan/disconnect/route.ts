import { NextRequest, NextResponse } from "next/server";
import { dhanTokenManager } from "@/lib/brokers/dhan/token-manager";
import { dhanLiveFeed } from "@/lib/market-data/dhan-feed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    dhanTokenManager.invalidateToken("User manually disconnected Dhan");
    dhanLiveFeed.disconnect();

    return NextResponse.json({
      success: true,
      message: "Dhan disconnected successfully",
      status: "NOT_CONFIGURED",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to disconnect Dhan",
      },
      { status: 500 }
    );
  }
}
