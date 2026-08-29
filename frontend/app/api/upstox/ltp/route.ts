import { NextRequest, NextResponse } from "next/server";
import { getLtp, UpstoxError } from "@/lib/upstox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/upstox/ltp
 * Returns normalized Last Traded Price (LTP) for an Indian stock or index.
 * Example: /api/upstox/ltp?instrument_key=NSE_INDEX%7CNifty%2050
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const searchParams = req.nextUrl?.searchParams || url.searchParams;
    const instrumentKey = searchParams.get("instrument_key") || searchParams.get("symbol") || "NSE_INDEX|Nifty 50";
    const oauthToken = req.cookies?.get?.("upstox_access_token")?.value;

    const normalizedLtp = await getLtp(instrumentKey, oauthToken);

    return NextResponse.json({
      status: "success",
      ...normalizedLtp,
    });
  } catch (err: any) {
    const statusCode = err instanceof UpstoxError && err.statusCode ? err.statusCode : 500;
    return NextResponse.json(
      {
        status: "error",
        provider: "UPSTOX",
        error: err?.errorCode || "UPSTOX_LTP_ERROR",
        message: err?.message || "Failed to fetch Upstox LTP.",
      },
      { status: statusCode }
    );
  }
}
