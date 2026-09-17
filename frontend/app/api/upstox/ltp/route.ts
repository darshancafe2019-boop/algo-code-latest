import { NextRequest, NextResponse } from "next/server";
import { getLtp, getMultipleLtp, UpstoxError } from "@/lib/upstox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/upstox/ltp
 * Returns normalized Last Traded Price (LTP) for Indian stocks or indices.
 * Example: /api/upstox/ltp?instrument_key=NSE_INDEX|Nifty 50,NSE_EQ|INE002A01018
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const searchParams = req.nextUrl?.searchParams || url.searchParams;
    const rawKeys = searchParams.get("instrument_key") || searchParams.get("symbol") || "NSE_INDEX|Nifty 50";
    const oauthToken = req.cookies?.get?.("upstox_access_token")?.value;

    const keysList = rawKeys
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    if (keysList.length > 1) {
      const multiData = await getMultipleLtp(keysList, oauthToken);
      return NextResponse.json({
        status: "success",
        data: multiData,
        quotes: multiData,
      });
    }

    const singleKey = keysList[0] || "NSE_INDEX|Nifty 50";
    const normalizedLtp = await getLtp(singleKey, oauthToken);

    return NextResponse.json({
      status: "success",
      ...normalizedLtp,
      data: {
        [normalizedLtp.instrumentKey]: normalizedLtp,
        [normalizedLtp.symbol]: normalizedLtp,
        [singleKey]: normalizedLtp,
      },
      quotes: {
        [normalizedLtp.instrumentKey]: normalizedLtp,
        [normalizedLtp.symbol]: normalizedLtp,
        [singleKey]: normalizedLtp,
      },
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
