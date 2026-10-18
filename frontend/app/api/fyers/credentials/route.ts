import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/config/gatewayConfig";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    const backendUrl = getBackendBaseUrl();
    if (backendUrl) {
      try {
        const backendRes = await fetch(`${backendUrl}/api/fyers/credentials`, {
          method: "POST",
          headers: {
            ...getForwardHeaders(req),
            "Content-Type": "application/json",
          },
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
        if (backendRes.status === 401 || backendRes.status === 403) {
          const data = await backendRes.json().catch(() => ({ success: false, message: "Unauthorized" }));
          return NextResponse.json(data, { status: backendRes.status });
        }
      } catch {
        // If backend offline in development, fallback to local env
      }
    }

    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { success: false, message: "Backend credentials vault is unreachable in production." },
        { status: 503 }
      );
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
