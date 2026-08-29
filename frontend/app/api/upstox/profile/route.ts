import { NextRequest, NextResponse } from "next/server";
import { getUpstoxProfile } from "@/lib/upstox/account";
import { UpstoxError } from "@/lib/upstox/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const profile = await getUpstoxProfile();
    return NextResponse.json({
      status: "success",
      data: profile,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const isUpstoxErr = error instanceof UpstoxError;
    const statusCode = isUpstoxErr ? error.statusCode : 500;
    return NextResponse.json(
      {
        status: "error",
        error: isUpstoxErr ? error.code : "UPSTOX_PROFILE_ERROR",
        message: error.message || "Failed to fetch Upstox user profile.",
      },
      { status: statusCode }
    );
  }
}
