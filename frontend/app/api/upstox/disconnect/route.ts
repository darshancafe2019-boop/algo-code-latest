import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/config/gatewayConfig";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/upstox/disconnect
 * Safely removes stored Upstox authentication and session cookies.
 * Disconnects the backend trading bot from live Upstox session.
 */
export async function POST(req: NextRequest) {
  try {
    const backendUrl = getBackendBaseUrl();
    // Notify backend engine to clear live token and session
    if (backendUrl) {
      try {
        const bRes = await fetch(`${backendUrl}/api/upstox/disconnect`, {
          method: "POST",
          headers: {
            ...getForwardHeaders(req),
            "Content-Type": "application/json",
          },
        });
        if (bRes.status === 401 || bRes.status === 403) {
          const data = await bRes.json().catch(() => null);
          return NextResponse.json(data || { success: false, message: "Unauthorized" }, { status: bRes.status });
        }
      } catch (backendErr) {
        console.warn("Notice: Python backend disconnect notification:", backendErr);
      }
    }

    const response = NextResponse.json({
      status: "success",
      success: true,
      connected: false,
      broker: "UPSTOX",
      message: "Upstox account disconnected successfully.",
    });

    // Clear access token cookie
    response.cookies.set("upstox_access_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    // Clear session metadata cookie
    response.cookies.set("upstox_user_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (err: any) {
    const response = NextResponse.json(
      {
        status: "success",
        success: true,
        connected: false,
        broker: "UPSTOX",
        message: "Upstox account disconnected.",
      },
      { status: 200 }
    );
    response.cookies.set("upstox_access_token", "", { maxAge: 0, path: "/" });
    response.cookies.set("upstox_user_session", "", { maxAge: 0, path: "/" });
    return response;
  }
}
