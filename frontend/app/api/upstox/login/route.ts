import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPSTOX_AUTH_DIALOG_URL = "https://api.upstox.com/v2/login/authorization/dialog";

/**
 * GET /api/upstox/login
 * Initiates Upstox OAuth2 authorization code flow.
 * Generates a cryptographically random CSRF state, stores it in an HTTP-only cookie,
 * and redirects the user to the official Upstox authorization dialog.
 */
export async function GET(req: NextRequest) {
  try {
    const urlObj = new URL(req.url);
    const origin = req.nextUrl?.origin || urlObj.origin || "http://localhost:3000";

    const apiKey = (
      process.env.UPSTOX_API_KEY ||
      process.env.UPSTOX_CLIENT_ID ||
      ""
    ).trim();

    const redirectUri = (
      process.env.UPSTOX_REDIRECT_URI ||
      `${origin}/api/upstox/callback`
    ).trim();

    if (!apiKey) {
      const errorUrl = new URL("/settings", origin);
      errorUrl.searchParams.set("tab", "brokers");
      errorUrl.searchParams.set("upstox", "error");
      errorUrl.searchParams.set("error_code", "MISSING_ENVIRONMENT");
      errorUrl.searchParams.set(
        "error_description",
        "UPSTOX_API_KEY (Client ID) is missing in server environment variables."
      );
      return NextResponse.redirect(errorUrl);
    }

    // Generate cryptographically random state (48 hex characters)
    const state = crypto.randomBytes(24).toString("hex");

    // Construct the official Upstox OAuth authorization URL
    const authUrl = new URL(UPSTOX_AUTH_DIALOG_URL);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", apiKey);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);

    // Create redirect response with secure state cookie
    const response = NextResponse.redirect(authUrl.toString());

    response.cookies.set("upstox_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes expiry
      path: "/",
    });

    return response;
  } catch (error: any) {
    const origin = req.nextUrl?.origin || "http://localhost:3000";
    const errorUrl = new URL("/settings", origin);
    errorUrl.searchParams.set("tab", "brokers");
    errorUrl.searchParams.set("upstox", "error");
    errorUrl.searchParams.set("error_code", "LOGIN_INIT_FAILED");
    errorUrl.searchParams.set(
      "error_description",
      error?.message || "Failed to initialize Upstox login flow."
    );
    return NextResponse.redirect(errorUrl);
  }
}
