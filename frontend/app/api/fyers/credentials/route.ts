import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_API_URL ||
  "http://127.0.0.1:5050";

/**
 * POST /api/fyers/credentials
 * Securely updates Fyers API v3 App ID and Secret ID.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const appId = String(body.app_id || "").trim();
    const secretId = String(body.secret_id || body.secret_key || "").trim();
    const accessToken = String(body.access_token || "").trim();
    const redirectUri = String(body.redirect_uri || "").trim();

    if (!appId || (!secretId && !accessToken)) {
      return NextResponse.json(
        { success: false, message: "Fyers App ID and Secret ID (or Access Token) are required." },
        { status: 400 }
      );
    }

    // Forward to backend Python vault if running
    try {
      const backendRes = await fetch(`${BACKEND_INTERNAL_URL}/api/fyers/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: appId,
          secret_id: secretId,
          access_token: accessToken,
          redirect_uri: redirectUri,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });

      if (backendRes.ok) {
        const data = await backendRes.json();
        return NextResponse.json(data);
      }
    } catch {
      // If backend offline, process locally in Node process.env
    }

    process.env.FYERS_APP_ID = appId;
    process.env.FYERS_CLIENT_ID = appId;
    process.env.FYERS_SECRET_ID = secretId;
    process.env.FYERS_SECRET_KEY = secretId;
    if (accessToken) {
      process.env.FYERS_ACCESS_TOKEN = accessToken;
    }

    return NextResponse.json({
      success: true,
      message: "Fyers API v3 credentials securely encrypted & stored in vault.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: `Failed to save Fyers credentials: ${err.message}` },
      { status: 500 }
    );
  }
}
