import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/config/gatewayConfig";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/fyers/disconnect
 * Disconnects Fyers broker credentials safely.
 */
export async function POST(req: NextRequest) {
  try {
    const backendUrl = getBackendBaseUrl();
    if (backendUrl) {
      try {
        const res = await fetch(`${backendUrl}/api/fyers/disconnect`, {
          method: "POST",
          headers: getForwardHeaders(req),
          cache: "no-store",
          signal: AbortSignal.timeout(3000),
        });
        if (res.status === 401 || res.status === 403) {
          const data = await res.json().catch(() => null);
          return NextResponse.json(data || { success: false, message: "Unauthorized" }, { status: res.status });
        }
      } catch {
        // Backend offline
      }
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
