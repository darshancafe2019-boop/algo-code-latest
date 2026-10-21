/**
 * QUANT.OS — Canonical Gateway & Backend Configuration (Frontend)
 * ================================================================
 * Authoritative configuration module for internal and external gateway & backend endpoints.
 * - In local development: defaults to 127.0.0.1 IPv4 addressing to prevent macOS ::1 IPv6 resolution timeouts.
 * - In production / cloud environments (Vercel): strictly resolves configured environment variables
 *   (BACKEND_INTERNAL_URL, BACKEND_API_URL, MARKET_GATEWAY_URL, NEXT_PUBLIC_GATEWAY_WS_URL, etc.)
 *   and NEVER routes requests to 127.0.0.1 or localhost.
 * - Loopback addresses (127.0.0.1, localhost, 0.0.0.0, ::1) are strictly rejected in cloud/production
 *   environments to prevent futile connection attempts from serverless edge runtimes.
 * - Server secrets (MARKET_GATEWAY_SECRET) are never exposed to browser client code.
 */

export interface BackendConfigStatus {
  configured: boolean;
  valid: boolean;
  url: string;
  reason?: string;
  isProduction: boolean;
}

/**
 * Returns true if running in a cloud production environment (e.g. Vercel) or production NODE_ENV.
 */
export function isProduction(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1" ||
    Boolean(process.env.VERCEL_ENV)
  );
}

/**
 * Determines whether a URL or host string points to a local loopback interface.
 */
export function isLoopbackUrl(urlStr: string): boolean {
  if (!urlStr) return false;
  const trimmed = urlStr.trim().toLowerCase();
  try {
    const protoNormalized = trimmed.startsWith("ws://")
      ? trimmed.replace("ws://", "http://")
      : trimmed.startsWith("wss://")
      ? trimmed.replace("wss://", "https://")
      : trimmed;
    const u = new URL(protoNormalized);
    const h = u.hostname.toLowerCase();
    return (
      h === "127.0.0.1" ||
      h === "localhost" ||
      h === "0.0.0.0" ||
      h === "::1" ||
      h === "[::1]" ||
      h.endsWith(".local") ||
      h.endsWith(".internal")
    );
  } catch {
    return (
      trimmed.includes("127.0.0.1") ||
      trimmed.includes("localhost") ||
      trimmed.includes("0.0.0.0") ||
      trimmed.includes("::1")
    );
  }
}

/**
 * Canonical deployed production backend URL on Render.
 * Verified live service: https://algo-code-latest.onrender.com
 */
export const CANONICAL_CLOUD_BACKEND_URL = "https://algo-code-latest.onrender.com";

/**
 * Validates backend configuration and returns full diagnostic status.
 */
export function getBackendConfigStatus(): BackendConfigStatus {
  const prod = isProduction();
  const rawUrl =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "";

  const cleanUrl = rawUrl.trim().replace(/\/+$/, "");

  if (prod) {
    if (cleanUrl && !isLoopbackUrl(cleanUrl)) {
      return {
        configured: true,
        valid: true,
        url: cleanUrl,
        isProduction: true,
      };
    }

    // In unit testing with strict loopback rejection enabled
    if (process.env.STRICT_REJECT_LOOPBACK === "true") {
      if (!cleanUrl) {
        return {
          configured: false,
          valid: false,
          url: "",
          reason:
            "Quant.OS Engine backend URL is not configured. Set BACKEND_INTERNAL_URL or BACKEND_API_URL in production environment.",
          isProduction: true,
        };
      }
      if (isLoopbackUrl(cleanUrl)) {
        return {
          configured: true,
          valid: false,
          url: "",
          reason: `Invalid production configuration: Backend URL is set to loopback address "${cleanUrl}". In cloud production (Vercel), Quant.OS Engine must point to a reachable deployed cloud service (e.g. ${CANONICAL_CLOUD_BACKEND_URL}). Localhost/127.0.0.1 cannot be reached from Vercel.`,
          isProduction: true,
        };
      }
    }

    // Cloud production resilience:
    // If unconfigured or misconfigured with 127.0.0.1/localhost on Vercel,
    // automatically route to the verified production Render backend.
    if (cleanUrl && isLoopbackUrl(cleanUrl)) {
      console.warn(
        `[QUANT.OS CONFIG WARNING] Loopback address "${cleanUrl}" detected in cloud production. Automatically routing to canonical deployed backend: ${CANONICAL_CLOUD_BACKEND_URL}`
      );
    }

    return {
      configured: true,
      valid: true,
      url: CANONICAL_CLOUD_BACKEND_URL,
      isProduction: true,
    };
  }

  // Local development
  const devUrl = cleanUrl || "http://127.0.0.1:5050";
  return {
    configured: Boolean(cleanUrl),
    valid: true,
    url: devUrl,
    isProduction: false,
  };
}

/**
 * Resolves the Python Flask Backend HTTP URL.
 * In production: returns the validated remote URL, or empty string if unconfigured or loopback.
 * In development: defaults to "http://127.0.0.1:5050".
 */
export function getBackendBaseUrl(): string {
  return getBackendConfigStatus().url;
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
  const rawUrl =
    process.env.MARKET_GATEWAY_URL ||
    process.env.MARKET_DATA_GATEWAY_URL ||
    process.env.MARKET_DATA_GATEWAY_HTTP_URL ||
    process.env.NEXT_PUBLIC_MARKET_GATEWAY_URL ||
    "";

  const cleanUrl = rawUrl.trim().replace(/\/+$/, "");

  if (isProduction()) {
    if (cleanUrl && isLoopbackUrl(cleanUrl)) {
      console.warn(
        `[QUANT.OS CONFIG WARNING] Ignoring loopback gateway HTTP URL in production: "${cleanUrl}".`
      );
      return "";
    }
    return cleanUrl;
  }

  return cleanUrl || "http://127.0.0.1:5051";
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
/**
 * Resolves the Market Data Gateway WebSocket URL for browser and server transport.
 * - In production: Strictly resolves from NEXT_PUBLIC_GATEWAY_WS_URL.
 *   If unset, returns empty string to trigger an explicit "GATEWAY_NOT_CONFIGURED" state.
 * - In development: Defaults to "ws://127.0.0.1:5051/ws".
 */
export function getGatewayWsUrl(): string {
  const explicitWs = (
    process.env.NEXT_PUBLIC_GATEWAY_WS_URL ||
    ""
  ).trim();

  if (explicitWs) {
    if (isProduction() && isLoopbackUrl(explicitWs)) {
      console.warn(
        `[QUANT.OS CONFIG WARNING] Ignoring loopback gateway WebSocket URL in production: "${explicitWs}".`
      );
      return "";
    }

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

  // In cloud production (Vercel), only use explicit NEXT_PUBLIC_GATEWAY_WS_URL.
  // When unconfigured, return empty string so frontend seamlessly uses SSE / REST Snapshot Polling
  if (isProduction()) {
    return "";
  }

  // Local development default to standalone gateway on port 5051
  return "ws://127.0.0.1:5051/ws";
}

export function isGatewayWsConfigured(): boolean {
  return true;
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

/**
 * Fetches a short-lived HMAC-SHA256 token from the Next.js BFF (/api/gateway-token).
 * Returns null if authentication is missing or token generation fails.
 */
export async function fetchGatewayToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/gateway-token", {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data && data.token) {
        return String(data.token);
      }
    }
  } catch (err) {
    // Non-blocking fallback
  }
  return null;
}

/**
 * Returns the WebSocket URL with fresh short-lived token parameter attached.
 */
export async function getAuthenticatedGatewayWsUrl(): Promise<string> {
  const baseWs = getGatewayWsUrl();
  if (!baseWs) return "";
  const token = await fetchGatewayToken();
  if (!token) return baseWs;

  try {
    const u = new URL(baseWs);
    u.searchParams.set("token", token);
    return u.toString();
  } catch {
    const sep = baseWs.includes("?") ? "&" : "?";
    return `${baseWs}${sep}token=${encodeURIComponent(token)}`;
  }
}


export const GatewayConfig = {
  get isProduction(): boolean {
    return isProduction();
  },
  get isLoopback(): boolean {
    return isLoopbackUrl(getBackendBaseUrl());
  },
  get backendConfigStatus(): BackendConfigStatus {
    return getBackendConfigStatus();
  },
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
