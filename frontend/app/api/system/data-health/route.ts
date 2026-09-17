import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5050";
const GATEWAY_URL = process.env.MARKET_DATA_GATEWAY_HTTP_URL || "http://127.0.0.1:5051";

export async function GET() {
  const timestamp = new Date().toISOString();
  
  // 1. Query Gateway health on port 5051
  let gatewayHealth: any = null;
  let gatewayOnline = false;
  try {
    const res = await fetch(`${GATEWAY_URL}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      gatewayHealth = await res.json();
      gatewayOnline = true;
    }
  } catch (_e) {
    gatewayOnline = false;
  }

  // 2. Query Backend health on port 5050
  let backendHealth: any = null;
  let backendOnline = false;
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

  // 3. Collect Provider states
  const providers: Record<string, any> = {
    dhan: {
      configured: !!(process.env.DHAN_CLIENT_ID && process.env.DHAN_ACCESS_TOKEN),
      role: "PRIMARY_EQUITY_OPTIONS",
      status: gatewayHealth?.providers?.find((p: any) => p.provider_id?.includes("dhan"))?.status || "STANDBY",
    },
    upstox: {
      configured: !!(process.env.UPSTOX_API_KEY && process.env.UPSTOX_ACCESS_TOKEN),
      role: "FAILOVER_EQUITY_OPTIONS",
      status: gatewayHealth?.providers?.find((p: any) => p.provider_id?.includes("upstox"))?.status || "STANDBY",
    },
    delta: {
      configured: !!(process.env.DELTA_API_KEY && process.env.DELTA_API_SECRET),
      role: "CRYPTO_DERIVATIVES",
      status: gatewayHealth?.providers?.find((p: any) => p.provider_id?.includes("delta"))?.status || "STANDBY",
    },
    binance: {
      configured: true,
      role: "PUBLIC_CRYPTO_FEED",
      status: gatewayHealth?.providers?.find((p: any) => p.provider_id?.includes("binance"))?.status || "STANDBY",
    },
  };

  return NextResponse.json({
    status: gatewayOnline || backendOnline ? "OPERATIONAL" : "DEGRADED",
    timestamp,
    mode: (process.env.TRADING_MODE || "PAPER").toUpperCase(),
    live_trading_enabled: process.env.LIVE_TRADING_ENABLED === "true",
    gateway: {
      online: gatewayOnline,
      port: 5051,
      telemetry: gatewayHealth,
    },
    backend: {
      online: backendOnline,
      port: 5050,
      telemetry: backendHealth,
    },
    providers,
    integrity_policy: "FAIL_CLOSED_NO_SYNTHETIC_DATA",
  });
}
