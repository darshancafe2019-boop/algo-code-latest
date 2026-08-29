import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_API_URL ||
  "http://127.0.0.1:5050";

/**
 * GET /api/upstox/status
 * Returns sanitized Upstox connection status.
 * NEVER exposes the access token or API secret.
 */
export async function GET(req: NextRequest) {
  try {
    const cookieHeader = req.headers?.get?.("cookie") || "";
    const headerCookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [k, ...v] = c.trim().split("=");
        return [k, v.join("=")];
      })
    );
    const accessToken = req.cookies?.get?.("upstox_access_token")?.value || headerCookies["upstox_access_token"];
    const sessionCookie = req.cookies?.get?.("upstox_user_session")?.value || headerCookies["upstox_user_session"];

    let sessionData: any = null;
    if (sessionCookie) {
      try {
        sessionData = JSON.parse(sessionCookie);
      } catch {
        sessionData = null;
      }
    }

    // Check if token exists in cookie or in backend
    let isConnected = Boolean(accessToken && accessToken.length > 10);
    let backendInfo: any = null;

    if (!isConnected) {
      try {
        const backendRes = await fetch(`${BACKEND_INTERNAL_URL}/api/upstox/status`, {
          cache: "no-store",
        });
        if (backendRes.ok) {
          backendInfo = await backendRes.json();
          if (backendInfo?.connected) {
            isConnected = true;
          }
        }
      } catch {
        // Backend check silent
      }
    }

    if (isConnected) {
      return NextResponse.json({
        status: "success",
        connected: true,
        broker: "UPSTOX",
        userName: sessionData?.user_name || backendInfo?.userName || "Upstox Trader",
        userId: sessionData?.user_id || backendInfo?.userId || "NSE-TRADER",
        email: sessionData?.email || backendInfo?.email || "",
        connectedAt: sessionData?.connected_at || backendInfo?.connectedAt || new Date().toISOString(),
        supportedMarkets: ["NSE Equities", "NSE Indices", "NSE Futures & Options"],
      });
    }

    return NextResponse.json({
      status: "success",
      connected: false,
      broker: "UPSTOX",
      message: "Upstox account is disconnected. Click 'Connect Upstox' to authenticate.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        connected: false,
        broker: "UPSTOX",
        message: err?.message || "Failed to retrieve Upstox connection status.",
      },
      { status: 500 }
    );
  }
}
