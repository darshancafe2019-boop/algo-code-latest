import { NextResponse } from "next/server";
import { getBackendBaseUrl, getGatewayHttpUrl, getGatewaySecret, isProduction } from "@/lib/config/gatewayConfig";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const timestamp = new Date().toISOString();
  const BACKEND_URL = getBackendBaseUrl();
  const GATEWAY_URL = getGatewayHttpUrl();
  const gatewaySecret = getGatewaySecret();
  
  // 1. Query Gateway health
  let gatewayHealth: any = null;
  let gatewayOnline = false;
  if (GATEWAY_URL) {
    try {
      const headers: Record<string, string> = {};
      if (gatewaySecret) {
        headers["X-Gateway-Secret"] = gatewaySecret;
      }
      const res = await fetch(`${GATEWAY_URL}/health`, {
        cache: "no-store",
        headers,
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) {
        gatewayHealth = await res.json();
        gatewayOnline = true;
      }
    } catch (_e) {
      gatewayOnline = false;
    }
  }

  // 2. Query Backend health
  let backendHealth: any = null;
  let backendOnline = false;
  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) {
        backendHealth = await res.json();
        backendOnline = true;
      }
    } catch (_e) {
      backendOnline = false;
    }
  }

  // 3. Collect Provider states
  const providers: Record<string, any> = {
    dhan: {
      configured: !!(process.env.DHAN_CLIENT_ID && process.env.DHAN_ACCESS_TOKEN),
      role: "PRIMARY_EQUITY_OPTIONS",
      status: gatewayHealth?.providers?.find((p: any) => p.provider_id?.includes("dhan"))?.status || (gatewayOnline ? "STANDBY" : "DISCONNECTED"),
    },
    upstox: {
      configured: !!(process.env.UPSTOX_API_KEY && process.env.UPSTOX_ACCESS_TOKEN),
      role: "FAILOVER_EQUITY_OPTIONS",
      status: gatewayHealth?.providers?.find((p: any) => p.provider_id?.includes("upstox"))?.status || (gatewayOnline ? "STANDBY" : "DISCONNECTED"),
    },
    delta: {
      configured: !!(process.env.DELTA_API_KEY && process.env.DELTA_API_SECRET),
      role: "CRYPTO_DERIVATIVES",
      status: gatewayHealth?.providers?.find((p: any) => p.provider_id?.includes("delta"))?.status || (gatewayOnline ? "STANDBY" : "DISCONNECTED"),
    },
    binance: {
      configured: Boolean(process.env.BINANCE_API_KEY),
      role: "PUBLIC_CRYPTO_FEED",
      status: gatewayHealth?.providers?.find((p: any) => p.provider_id?.includes("binance"))?.status || (gatewayOnline ? "STANDBY" : "DISCONNECTED"),
    },
  };

  return NextResponse.json({
    status: gatewayOnline || backendOnline ? "OPERATIONAL" : (isProduction() && (!BACKEND_URL || !GATEWAY_URL) ? "UNCONFIGURED" : "DEGRADED"),
    timestamp,
    mode: (process.env.TRADING_MODE || "PAPER").toUpperCase(),
    live_trading_enabled: process.env.LIVE_TRADING_ENABLED === "true",
    gateway: {
      online: gatewayOnline,
      configured: Boolean(GATEWAY_URL),
      telemetry: gatewayHealth,
    },
    backend: {
      online: backendOnline,
      configured: Boolean(BACKEND_URL),
      telemetry: backendHealth,
    },
    providers,
    integrity_policy: "FAIL_CLOSED_NO_SYNTHETIC_DATA",
  });
}
