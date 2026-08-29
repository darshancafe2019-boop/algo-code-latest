/**
 * Upstox OAuth Authentication Helper
 * ==================================
 * Handles OAuth2 authorization dialog URL generation and server-side token exchange.
 */

import crypto from "crypto";
import { getUpstoxCredentials } from "./credentials";
import { UpstoxAuthError, UpstoxValidationError } from "./errors";

const UPSTOX_AUTH_DIALOG_URL = "https://api.upstox.com/v2/login/authorization/dialog";
const UPSTOX_TOKEN_URL = "https://api.upstox.com/v2/login/authorization/token";

export interface OAuthInitResult {
  authUrl: string;
  state: string;
}

export interface OAuthTokenResult {
  accessToken: string;
  userName: string;
  userId: string;
  email: string;
  broker: string;
  connectedAt: string;
}

/**
 * Initializes OAuth2 login flow with a cryptographically secure CSRF state.
 */
export function generateOAuthDialogUrl(origin?: string): OAuthInitResult {
  const creds = getUpstoxCredentials();

  if (!creds.apiKey) {
    throw new UpstoxValidationError(
      "UPSTOX_API_KEY (Client ID) is not configured in server environment (.env.local)."
    );
  }

  const redirectUri = creds.redirectUri || (origin ? `${origin}/api/upstox/callback` : "http://localhost:3100/api/upstox/callback");
  const state = crypto.randomBytes(24).toString("hex");

  const authUrl = new URL(UPSTOX_AUTH_DIALOG_URL);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", creds.apiKey);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  return {
    authUrl: authUrl.toString(),
    state,
  };
}

/**
 * Exchanges authorization code for an authenticated access token server-side.
 */
export async function exchangeAuthCodeForToken(
  code: string,
  state: string,
  storedState: string | undefined,
  origin?: string
): Promise<OAuthTokenResult> {
  if (!code || !code.trim()) {
    throw new UpstoxValidationError("Authorization code is missing from redirect.");
  }

  if (!storedState || !state || storedState !== state) {
    throw new UpstoxAuthError(
      "OAuth state mismatch (possible CSRF attack or expired session). Please try connecting again."
    );
  }

  const creds = getUpstoxCredentials();
  if (!creds.apiKey || !creds.apiSecret) {
    throw new UpstoxValidationError(
      "Server-side UPSTOX_API_KEY or UPSTOX_API_SECRET is missing."
    );
  }

  const redirectUri = creds.redirectUri || (origin ? `${origin}/api/upstox/callback` : "http://localhost:3100/api/upstox/callback");

  const body = new URLSearchParams({
    code: code.trim(),
    client_id: creds.apiKey,
    client_secret: creds.apiSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(UPSTOX_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.access_token) {
    const errMsg =
      data?.message ||
      data?.error ||
      data?.errors?.[0]?.message ||
      `Token exchange failed with HTTP ${response.status}.`;
    throw new UpstoxAuthError(errMsg);
  }

  return {
    accessToken: data.access_token,
    userName: data.user_name || "Upstox Trader",
    userId: data.user_id || "",
    email: data.email || "",
    broker: data.broker || "UPSTOX",
    connectedAt: new Date().toISOString(),
  };
}
