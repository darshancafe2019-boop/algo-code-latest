import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_API_URL ||
  "http://127.0.0.1:5050";

/**
 * POST /api/fyers/disconnect
 * Disconnects Fyers broker credentials safely.
 */
export async function POST(req: NextRequest) {
  try {
    try {
      await fetch(`${BACKEND_INTERNAL_URL}/api/fyers/disconnect`, {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // Backend offline
    }

    process.env.FYERS_APP_ID = "";
    process.env.FYERS_CLIENT_ID = "";
    process.env.FYERS_SECRET_ID = "";
    process.env.FYERS_SECRET_KEY = "";
    process.env.FYERS_ACCESS_TOKEN = "";

    return NextResponse.json({
      success: true,
      message: "Fyers broker disconnected safely.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: `Failed to disconnect Fyers: ${err.message}` },
      { status: 500 }
    );
  }
}
