/**
 * QUANT.OS — Canonical Gateway Configuration (Frontend)
 * ======================================================
 * Authoritative configuration module for internal and external gateway & backend endpoints.
 * - In local development: defaults to 127.0.0.1 IPv4 addressing to prevent macOS ::1 IPv6 resolution timeouts.
 * - In production (Vercel): strictly resolves configured environment variables (BACKEND_INTERNAL_URL,
 *   BACKEND_API_URL, MARKET_GATEWAY_URL, NEXT_PUBLIC_GATEWAY_WS_URL, etc.) and NEVER silently routes
 *   requests to 127.0.0.1 or localhost.
 * - Server secrets (MARKET_GATEWAY_SECRET) are never exposed to browser client code.
 */

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Resolves the Python Flask Backend HTTP URL.
 * Order of precedence:
 * 1. BACKEND_INTERNAL_URL (Server-side private network URL, e.g. Render service)
 * 2. BACKEND_API_URL (Server-side public URL)
 * 3. NEXT_PUBLIC_BACKEND_URL (Public URL available to client & server)
 * 4. NEXT_PUBLIC_API_URL
 * 5. In development only: fallback to "http://127.0.0.1:5050"
 */
export function getBackendBaseUrl(): string {
  const url =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (isProduction() ? "" : "http://127.0.0.1:5050");
  return url ? url.replace(/\/+$/, "") : "";
}

/**
 * Resolves the Market Data Gateway HTTP URL.
 * Order of precedence:
 * 1. MARKET_GATEWAY_URL (Server-side configured Render web service URL)
 * 2. MARKET_DATA_GATEWAY_URL
 * 3. MARKET_DATA_GATEWAY_HTTP_URL
 * 4. NEXT_PUBLIC_MARKET_GATEWAY_URL
 * 5. In development only: fallback to "http://127.0.0.1:5051"
 */
export function getGatewayHttpUrl(): string {
  const url =
    process.env.MARKET_GATEWAY_URL ||
    process.env.MARKET_DATA_GATEWAY_URL ||
    process.env.MARKET_DATA_GATEWAY_HTTP_URL ||
    process.env.NEXT_PUBLIC_MARKET_GATEWAY_URL ||
    (isProduction() ? "" : "http://127.0.0.1:5051");
  return url ? url.replace(/\/+$/, "") : "";
}

/**
 * Resolves the Market Data Gateway WebSocket URL for browser and server transport.
 * Order of precedence:
 * 1. NEXT_PUBLIC_GATEWAY_WS_URL
 * 2. NEXT_PUBLIC_MARKET_GATEWAY_WS
 * 3. NEXT_PUBLIC_MARKET_GATEWAY_WS_URL
 * 4. NEXT_PUBLIC_MARKET_WS_URL
 * 5. Server-side only: MARKET_DATA_GATEWAY_WS_URL / MARKET_GATEWAY_WS_URL
 * 6. Derived from MARKET_GATEWAY_URL (translating http:// -> ws:// and https:// -> wss://)
 * 7. In development only: fallback to "ws://127.0.0.1:5051/ws"
 */
export function getGatewayWsUrl(): string {
  const explicitWs =
    process.env.NEXT_PUBLIC_GATEWAY_WS_URL ||
    process.env.NEXT_PUBLIC_MARKET_GATEWAY_WS ||
    process.env.NEXT_PUBLIC_MARKET_GATEWAY_WS_URL ||
    process.env.NEXT_PUBLIC_MARKET_WS_URL ||
    (typeof window === "undefined"
      ? process.env.MARKET_DATA_GATEWAY_WS_URL || process.env.MARKET_GATEWAY_WS_URL
      : undefined);

  if (explicitWs) {
    if (explicitWs.startsWith("/")) {
      if (typeof window !== "undefined") {
        const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
        return `${proto}//${window.location.host}${explicitWs}`;
      }
      return isProduction() ? "" : `ws://127.0.0.1:5051${explicitWs}`;
    }
    if (explicitWs.startsWith("http://")) return explicitWs.replace("http://", "ws://");
    if (explicitWs.startsWith("https://")) return explicitWs.replace("https://", "wss://");
    return explicitWs;
  }

  // Derive from configured HTTP gateway URL if available
  const httpUrl =
    process.env.MARKET_GATEWAY_URL ||
    process.env.MARKET_DATA_GATEWAY_URL ||
    process.env.MARKET_DATA_GATEWAY_HTTP_URL;
  if (httpUrl) {
    const wsBase = httpUrl
      .replace(/\/+$/, "")
      .replace(/^http:\/\//, "ws://")
      .replace(/^https:\/\//, "wss://");
    return wsBase.endsWith("/ws") ? wsBase : `${wsBase}/ws`;
  }

  return isProduction() ? "" : "ws://127.0.0.1:5051/ws";
}

/**
 * Resolves the server-side Market Data Gateway secret.
 * STRICT SECURITY: Only callable on Node.js server side. Never exposed to browser bundles.
 */
export function getGatewaySecret(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  return (
    process.env.MARKET_GATEWAY_SECRET ||
    process.env.MARKET_DATA_GATEWAY_SECRET ||
    process.env.GATEWAY_SECRET ||
    ""
  );
}

export const GatewayConfig = {
  // Server-side internal API proxy destination
  get httpBaseUrl(): string {
    return getGatewayHttpUrl();
  },

  // Real-time WebSocket connection URL
  get wsBaseUrl(): string {
    return getGatewayWsUrl();
  },

  // Backend Core HTTP URL
  get backendBaseUrl(): string {
    return getBackendBaseUrl();
  },

  // Specific Health & Telemetry Routes
  get healthUrl(): string {
    const base = getGatewayHttpUrl();
    return base ? `${base}/health` : (isProduction() ? "" : "http://127.0.0.1:5051/health");
  },

  get snapshotUrl(): string {
    const base = getGatewayHttpUrl();
    return base ? `${base}/snapshot` : (isProduction() ? "" : "http://127.0.0.1:5051/snapshot");
  },

  get searchUrl(): string {
    const base = getGatewayHttpUrl();
    return base ? `${base}/search` : (isProduction() ? "" : "http://127.0.0.1:5051/search");
  },

  get systemHealthUrl(): string {
    const base = getBackendBaseUrl();
    return base ? `${base}/api/system/health` : (isProduction() ? "" : "http://127.0.0.1:5050/api/system/health");
  },

  // Tolerances
  maxQuoteAgeMs: 15000,
  maxLegQuoteSkewMs: 5000,
};

export type GatewayConfigType = typeof GatewayConfig;
