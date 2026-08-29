import { NextRequest, NextResponse } from "next/server";
import { getOptionChain, UpstoxError } from "@/lib/upstox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/upstox/options/chain
 * Fetches and normalizes full real-time option chain with Greeks, IV, OI, and LTP.
 * Parameters: underlying (NIFTY / BANKNIFTY), expiry (YYYY-MM-DD)
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const searchParams = req.nextUrl?.searchParams || url.searchParams;
    const underlying = searchParams.get("underlying") || searchParams.get("symbol") || "NIFTY";
    const expiry = searchParams.get("expiry") || undefined;
    const oauthToken = req.cookies?.get?.("upstox_access_token")?.value;

    const chain = await getOptionChain(underlying, expiry, oauthToken);

    return NextResponse.json({
      status: "success",
      ...chain,
    });
  } catch (err: any) {
    const statusCode = err instanceof UpstoxError && err.statusCode ? err.statusCode : 500;
    return NextResponse.json(
      {
        status: "error",
        error: err?.errorCode || "UPSTOX_OPTION_CHAIN_ERROR",
        message: err?.message || "Failed to fetch option chain.",
      },
      { status: statusCode }
    );
  }
}
