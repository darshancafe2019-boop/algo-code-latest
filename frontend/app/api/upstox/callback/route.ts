import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPSTOX_TOKEN_URL = "https://api.upstox.com/v2/login/authorization/token";
const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_API_URL ||
  "http://127.0.0.1:5050";

/**
 * GET /api/upstox/callback
 * Handles OAuth2 authorization code callback from Upstox.
 * Validates CSRF state, exchanges code for access token, stores token server-side,
 * and syncs token with the backend engine.
 */
export async function GET(req: NextRequest) {
  const urlObj = new URL(req.url);
  const searchParams = req.nextUrl?.searchParams || urlObj.searchParams;
  const origin = req.nextUrl?.origin || urlObj.origin || "http://localhost:3100";

  const code = searchParams.get("code")?.trim();
  const state = searchParams.get("state")?.trim();
  const upstoxError = searchParams.get("error");
  const upstoxErrorDescription = searchParams.get("error_description");

  // Determine if caller expects JSON or browser navigation
  const acceptHeader = req.headers.get("accept") || "";
  const wantsJson = acceptHeader.includes("application/json") && !acceptHeader.includes("text/html");

  const buildErrorResponse = (errorCode: string, errorDescription: string, httpStatus: number = 400) => {
    if (wantsJson) {
      return NextResponse.json(
        {
          status: "error",
          error: errorCode,
          error_code: errorCode,
          message: errorDescription,
          timestamp: new Date().toISOString(),
        },
        { status: httpStatus }
      );
    }

    const redirectUrl = new URL("/settings", origin);
    redirectUrl.searchParams.set("tab", "brokers");
    redirectUrl.searchParams.set("upstox", "error");
    redirectUrl.searchParams.set("error_code", errorCode);
    redirectUrl.searchParams.set("error_description", errorDescription);
    return NextResponse.redirect(redirectUrl);
  };

  // 1. Check for Upstox returned error (e.g. user cancelled login or consent denied)
  if (upstoxError) {
    const msg = upstoxErrorDescription || upstoxError || "Upstox authorization was declined or encountered an error.";
    return buildErrorResponse("UPSTOX_AUTH_DECLINED", msg, 400);
  }

  // 2. Validate Authorization Code presence
  if (!code) {
    return buildErrorResponse(
      "MISSING_AUTH_CODE",
      "Missing authorization code in Upstox redirect query parameters.",
      400
    );
  }

  // 3. Validate Returned State presence
  if (!state) {
    return buildErrorResponse(
      "MISSING_RETURNED_STATE",
      "Missing state parameter in Upstox redirect query parameters.",
      400
    );
  }

  // 4. Retrieve and Validate State Cookie (CSRF Protection)
  const cookieHeader = req.headers.get("cookie") || "";
  const headerCookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, v.join("=")];
    })
  );

  let storedState = "";
  if (req.cookies && typeof req.cookies.get === "function") {
    storedState = req.cookies.get("upstox_oauth_state")?.value || "";
  }
  if (!storedState && headerCookies["upstox_oauth_state"]) {
    storedState = headerCookies["upstox_oauth_state"];
  }
  storedState = storedState.trim();

  if (!storedState) {
    return buildErrorResponse(
      "MISSING_STATE_COOKIE",
      "OAuth state cookie 'upstox_oauth_state' is missing. Please start the login flow from /api/upstox/login.",
      400
    );
  }

  if (storedState !== state) {
    return buildErrorResponse(
      "STATE_MISMATCH",
      "OAuth state mismatch detected (possible CSRF attempt or expired login session). Please restart login.",
      400
    );
  }

  // 5. Retrieve Server-Side Environment Credentials
  const apiKey = (
    process.env.UPSTOX_API_KEY ||
    process.env.UPSTOX_CLIENT_ID ||
    ""
  ).trim();

  const apiSecret = (
    process.env.UPSTOX_API_SECRET ||
    process.env.UPSTOX_CLIENT_SECRET ||
    ""
  ).trim();

  const redirectUri = (
    process.env.UPSTOX_REDIRECT_URI ||
    `${origin}/api/upstox/callback`
  ).trim();

  if (!apiKey || !apiSecret) {
    return buildErrorResponse(
      "MISSING_ENVIRONMENT",
      "Server configuration error: UPSTOX_API_KEY or UPSTOX_API_SECRET is not configured.",
      500
    );
  }

  try {
    // 6. Exchange Authorization Code for Access Token
    const tokenRequestBody = new URLSearchParams({
      code: code,
      client_id: apiKey,
      client_secret: apiSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const tokenResponse = await fetch(UPSTOX_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: tokenRequestBody.toString(),
    });

    const tokenData = await tokenResponse.json().catch(() => null);

    if (!tokenResponse.ok || !tokenData?.access_token) {
      // Safe error extraction without logging secrets
      const safeErrorCode = tokenData?.errors?.[0]?.errorCode || tokenData?.error_code || "UPSTOX_TOKEN_EXCHANGE_FAILED";
      const safeErrorMessage =
        tokenData?.errors?.[0]?.message ||
        tokenData?.message ||
        tokenData?.error ||
        `Upstox token endpoint returned HTTP ${tokenResponse.status}.`;

      console.error(
        `[Upstox OAuth] Token exchange failed: HTTP ${tokenResponse.status} | Code: ${safeErrorCode} | Message: ${safeErrorMessage}`
      );

      return buildErrorResponse(
        "UPSTOX_TOKEN_EXCHANGE_FAILED",
        `${safeErrorMessage} (${safeErrorCode}). Please initiate a fresh login.`,
        tokenResponse.status >= 500 ? 502 : 400
      );
    }

    const accessToken: string = tokenData.access_token;
    const userName: string = tokenData.user_name || "Upstox Trader";
    const userId: string = tokenData.user_id || "";
    const email: string = tokenData.email || "";
    const broker: string = tokenData.broker || "UPSTOX";
    const connectedAt = new Date().toISOString();

    // 7. Synchronize Token with Backend Algo Engine & Database
    try {
      await fetch(`${BACKEND_INTERNAL_URL}/api/upstox/sync-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: accessToken,
          user_name: userName,
          user_id: userId,
          email: email,
          broker: broker,
          connected_at: connectedAt,
        }),
      });
    } catch {
      // Non-blocking if Python backend is temporarily starting up
    }

    // 8. Handle JSON Response vs Browser Redirect
    if (wantsJson) {
      const jsonRes = NextResponse.json({
        status: "success",
        connected: true,
        broker,
        user_name: userName,
        user_id: userId,
        connected_at: connectedAt,
      });

      // Secure HTTP-Only Cookie for Access Token
      jsonRes.cookies.set("upstox_access_token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 86400 * 30, // 30 days
        path: "/",
      });

      // Clear one-time OAuth state cookie
      jsonRes.cookies.set("upstox_oauth_state", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });

      return jsonRes;
    }

    // Prepare Browser Success Redirect
    const redirectUrl = new URL("/settings", origin);
    redirectUrl.searchParams.set("tab", "brokers");
    redirectUrl.searchParams.set("upstox", "connected");

    const successRedirect = NextResponse.redirect(redirectUrl);

    // Secure HTTP-Only Cookie for Access Token (Server-Only Access)
    successRedirect.cookies.set("upstox_access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400 * 30,
      path: "/",
    });

    // Sanitized session cookie for UI status display (contains NO secret/token)
    successRedirect.cookies.set(
      "upstox_user_session",
      JSON.stringify({
        connected: true,
        broker,
        user_name: userName,
        user_id: userId,
        email: email,
        connected_at: connectedAt,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 86400 * 30,
        path: "/",
      }
    );

    // Clear one-time OAuth state cookie
    successRedirect.cookies.set("upstox_oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return successRedirect;
  } catch (err: any) {
    return buildErrorResponse(
      "UPSTOX_TOKEN_EXCHANGE_FAILED",
      err?.message || "Network error occurred while exchanging token with Upstox.",
      502
    );
  }
}
