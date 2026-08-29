import { NextRequest, NextResponse } from "next/server";
import { getOptionContracts, UpstoxError } from "@/lib/upstox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/upstox/options/contracts
 * Discovers available option contracts and dynamic expiry dates for an underlying.
 * Example: /api/upstox/options/contracts?underlying=NIFTY
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const searchParams = req.nextUrl?.searchParams || url.searchParams;
    const underlying = searchParams.get("underlying") || searchParams.get("symbol") || "NIFTY";
    const oauthToken = req.cookies?.get?.("upstox_access_token")?.value;

    const result = await getOptionContracts(underlying, oauthToken);

    return NextResponse.json({
      status: "success",
      ...result,
    });
  } catch (err: any) {
    const statusCode = err instanceof UpstoxError && err.statusCode ? err.statusCode : 500;
    return NextResponse.json(
      {
        status: "error",
        error: err?.errorCode || "UPSTOX_OPTIONS_ERROR",
        message: err?.message || "Failed to fetch option contracts.",
      },
      { status: statusCode }
    );
  }
}
