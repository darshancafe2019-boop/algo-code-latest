import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_API_URL ||
  "http://127.0.0.1:5050";

/**
 * POST /api/upstox/disconnect
 * Safely removes stored Upstox authentication and session cookies.
 * Disconnects the backend trading bot from live Upstox session.
 */
export async function POST(req: NextRequest) {
  try {
    // Notify backend engine to clear live token and session
    try {
      await fetch(`${BACKEND_INTERNAL_URL}/api/upstox/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (backendErr) {
      console.warn("Notice: Python backend disconnect notification:", backendErr);
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
    return NextResponse.json(
      {
        status: "error",
        success: false,
        message: err?.message || "Failed to disconnect Upstox session.",
      },
      { status: 500 }
    );
  }
}
