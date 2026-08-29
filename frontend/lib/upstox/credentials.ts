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
    redirectUri: (process.env.UPSTOX_REDIRECT_URI || "http://localhost:3000/api/upstox/callback").trim(),
    analyticsToken: (process.env.UPSTOX_ANALYTICS_TOKEN || "").trim(),
    tradingEnabled: process.env.UPSTOX_TRADING_ENABLED === "true",
    paperMode: process.env.UPSTOX_PAPER_MODE !== "false",
  };
}

/**
 * Resolves the active market data token with strict priority:
 * 1. UPSTOX_ANALYTICS_TOKEN (read-only analytics token if configured)
 * 2. Server-side OAuth access token (from session cookie or environment)
 * 3. Authentication required error
 */
export function getUpstoxMarketDataToken(oauthToken?: string | null): UpstoxTokenResolution {
  const creds = getUpstoxCredentials();

  // 1. If explicit token passed, use it
  if (oauthToken && oauthToken.trim().length > 10) {
    return {
      token: oauthToken.trim(),
      tokenType: "OAUTH",
      isValid: true,
    };
  }

  // 2. Server-side OAuth Access Token from environment
  const envOauthToken = (creds.accessToken || process.env.UPSTOX_ACCESS_TOKEN || "").trim();
  if (envOauthToken && envOauthToken.length > 10) {
    return {
      token: envOauthToken,
      tokenType: "OAUTH",
      isValid: true,
    };
  }

  // 3. Analytics Token fallback
  if (creds.analyticsToken && creds.analyticsToken.length > 10) {
    return {
      token: creds.analyticsToken,
      tokenType: "ANALYTICS",
      isValid: true,
    };
  }

  // 4. Unauthenticated state
  return {
    token: null,
    tokenType: "NONE",
    isValid: false,
    error: "Authentication required. Configure UPSTOX_ACCESS_TOKEN or connect via /api/upstox/login.",
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
