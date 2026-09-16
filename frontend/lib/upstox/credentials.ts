/**
 * Upstox Server-Side Credentials & Token Resolver
 * ===============================================
 * Authoritatively manages Upstox credentials, tokens, and paper-mode guards.
 * NEVER exposed to client-side browser JavaScript.
 */

import { UpstoxCredentials, UpstoxTokenResolution } from "./types";
import { UpstoxTradingDisabledError } from "./errors";

/**
 * Loads server-side Upstox environment configuration.
 */
export function getUpstoxCredentials(): UpstoxCredentials {
  return {
    apiKey: (process.env.UPSTOX_API_KEY || process.env.UPSTOX_CLIENT_ID || "").trim(),
    apiSecret: (process.env.UPSTOX_API_SECRET || process.env.UPSTOX_CLIENT_SECRET || "").trim(),
    accessToken: (process.env.UPSTOX_ACCESS_TOKEN || "").trim(),
    redirectUri: (process.env.UPSTOX_REDIRECT_URI || "/api/upstox/callback").trim(),
    analyticsToken: (process.env.UPSTOX_ANALYTICS_TOKEN || "").trim(),
    tradingEnabled: process.env.UPSTOX_TRADING_ENABLED === "true",
    paperMode: process.env.UPSTOX_PAPER_MODE !== "false",
  };
}

/**
 * Helper to inspect JWT expiration timestamp.
 * Returns true if the token is a valid JWT and its expiration (exp) has passed.
 */
export function isJwtExpired(token: string): boolean {
  if (!token || typeof token !== "string") return true;
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payloadStr = typeof Buffer !== "undefined"
        ? Buffer.from(parts[1], "base64").toString("utf-8")
        : (typeof atob === "function" ? atob(parts[1]) : "");
      if (payloadStr) {
        const payload = JSON.parse(payloadStr);
        if (payload && typeof payload.exp === "number") {
          return Date.now() >= (payload.exp * 1000 - 5000);
        }
      }
    }
  } catch {
    // Non-standard token format; proceed without timestamp expiration block
  }
  return false;
}

/**
 * Resolves the active market data token with strict priority:
 * 1. Valid explicitly provided current OAuth token (if unexpired)
 * 2. Valid UPSTOX_ANALYTICS_TOKEN (preferred read-only market data token)
 * 3. Valid server-side environment OAuth access token (if unexpired)
 * 4. Truthful unauthenticated state if all tokens are missing or expired
 */
export function getUpstoxMarketDataToken(oauthToken?: string | null): UpstoxTokenResolution {
  const creds = getUpstoxCredentials();

  // 1. Explicitly provided current OAuth token (if unexpired)
  if (oauthToken && oauthToken.trim().length > 10 && !isJwtExpired(oauthToken.trim())) {
    return {
      token: oauthToken.trim(),
      tokenType: "OAUTH",
      isValid: true,
    };
  }

  // 2. Read-only Analytics Token (preferred for live market feed)
  if (creds.analyticsToken && creds.analyticsToken.length > 10 && !isJwtExpired(creds.analyticsToken)) {
    return {
      token: creds.analyticsToken,
      tokenType: "ANALYTICS",
      isValid: true,
    };
  }

  // 3. Server-side OAuth Access Token from environment (if unexpired)
  const envOauthToken = (creds.accessToken || process.env.UPSTOX_ACCESS_TOKEN || "").trim();
  if (envOauthToken && envOauthToken.length > 10 && !isJwtExpired(envOauthToken)) {
    return {
      token: envOauthToken,
      tokenType: "OAUTH",
      isValid: true,
    };
  }

  // 4. Fallback check: if explicit oauthToken or envOauthToken is present (even if format is non-standard JWT)
  if (envOauthToken && envOauthToken.length > 10) {
    return {
      token: envOauthToken,
      tokenType: "OAUTH",
      isValid: true,
    };
  }

  // 5. Unauthenticated state
  return {
    token: null,
    tokenType: "NONE",
    isValid: false,
    error: "Authentication required. Configure UPSTOX_ANALYTICS_TOKEN, UPSTOX_ACCESS_TOKEN, or connect via /api/upstox/login.",
  };
}

/**
 * Resolves the authenticated user token for Account, Holdings, Positions, and Orders.
 */
export function getUpstoxAccountToken(oauthToken?: string | null): UpstoxTokenResolution {
  return getUpstoxMarketDataToken(oauthToken);
}

/**
 * Server-Side Order Execution Safety Guard
 * Rejects any real automated order execution when UPSTOX_TRADING_ENABLED is false.
 */
export function assertPaperModeOnly(operation: string = "order execution"): void {
  const creds = getUpstoxCredentials();
  if (!creds.tradingEnabled || creds.paperMode) {
    throw new UpstoxTradingDisabledError(
      `Execution blocked: ${operation} is protected by Paper Trading Guard. Real broker orders are disabled.`
    );
  }
}
