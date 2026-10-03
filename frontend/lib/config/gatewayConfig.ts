/**
 * QUANT.OS — Canonical Gateway Configuration (Frontend)
 * ======================================================
 * Single authoritative source of truth for internal and external gateway endpoints.
 * Enforces 127.0.0.1 IPv4 addressing to prevent macOS ::1 IPv6 resolution timeouts.
 */

export const GatewayConfig = {
  // Server-side internal API proxy destination
  httpBaseUrl: process.env.MARKET_DATA_GATEWAY_URL || "http://127.0.0.1:5051",
  
  // Real-time WebSocket connection URL
  wsBaseUrl: process.env.NEXT_PUBLIC_MARKET_WS_URL || "ws://127.0.0.1:5051/ws",
  
  // Backend Core HTTP URL
  backendBaseUrl: process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5050",
  
  // Specific Health & Telemetry Routes
  healthUrl: "http://127.0.0.1:5051/health",
  snapshotUrl: "http://127.0.0.1:5051/snapshot",
  searchUrl: "http://127.0.0.1:5051/search",
  systemHealthUrl: "http://127.0.0.1:5050/api/system/health",

  // Tolerances
  maxQuoteAgeMs: 15000,
  maxLegQuoteSkewMs: 5000,
} as const;

export type GatewayConfigType = typeof GatewayConfig;
