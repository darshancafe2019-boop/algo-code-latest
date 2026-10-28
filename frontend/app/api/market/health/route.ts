import { NextResponse } from "next/server";
import { marketDataConfig } from "@/lib/market-data/config";
import { getGatewayHttpUrl, getGatewaySecret, getBackendConfigStatus, isProduction } from "@/lib/config/gatewayConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  const GATEWAY_URL = getGatewayHttpUrl();
  const secret = getGatewaySecret();

  if (GATEWAY_URL) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (secret) {
        headers["X-Gateway-Secret"] = secret;
      }
      const res = await fetch(`${GATEWAY_URL}/health`, {
        cache: "no-store",
        headers,
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const data = await res.json();
        const provList = Array.isArray(data.providers)
          ? data.providers
          : (data.providers ? Object.values(data.providers) : []);
        const hasDisconnected = provList.some((p: any) => p.connected === false || p.status === "DISCONNECTED" || p.status === "DEGRADED");
        const computedStatus = hasDisconnected ? "degraded" : (data.status === "healthy" || data.status === "OK" ? "healthy" : "degraded");
        return NextResponse.json({
          ...data,
          status: computedStatus,
          gateway: "CONNECTED",
          timestamp: Date.now(),
        });
      }
    } catch {
      // Gateway offline or timed out
    }
  }

  // Fallback to Backend Integrated Provider Health
  const configStatus = getBackendConfigStatus();
  const BACKEND_URL = configStatus.url;
  if (BACKEND_URL) {
    try {
      const bRes = await fetch(`${BACKEND_URL}/api/market/providers/health`, {
        cache: "no-store",
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(3000),
      });
      if (bRes.ok) {
        const bData = await bRes.json();
        return NextResponse.json({
          status: "degraded",
          gateway: "DISCONNECTED",
          timestamp: Date.now(),
          providers: bData.providers_map || bData.providers || bData,
        });
      }
    } catch {}
  }

  const hasDhan = Boolean(marketDataConfig.dhan.clientId && marketDataConfig.dhan.accessToken);
  const hasUpstox = Boolean(marketDataConfig.upstox.apiKey && marketDataConfig.upstox.accessToken);
  const hasTwelveData = Boolean(marketDataConfig.twelvedata.apiKey && marketDataConfig.twelvedata.apiKey !== "demo");
  const hasDelta = Boolean(marketDataConfig.delta.apiKey);

  return NextResponse.json({
    status: "unavailable",
    gateway: "DISCONNECTED",
    timestamp: Date.now(),
    providers: {
      dhan: {
        configured: hasDhan,
        authenticated: hasDhan,
        rest: "DOWN",
        websocket: "DISCONNECTED",
        subscriptions: 0,
        lastTickAt: null,
        stale: true,
        error: hasDhan ? "Market data gateway offline" : "Credentials required",
      },
      upstox: {
        configured: hasUpstox,
        authenticated: hasUpstox,
        rest: "DOWN",
        websocket: "DISCONNECTED",
        subscriptions: 0,
        lastTickAt: null,
        stale: true,
        error: hasUpstox ? "Market data gateway offline" : "Credentials required",
      },
      delta: {
        configured: hasDelta,
        authenticated: hasDelta,
        rest: "DOWN",
        websocket: "DISCONNECTED",
        endpoint: "wss://public-socket.india.delta.exchange",
        subscriptions: 0,
        lastTickAt: null,
        stale: true,
        error: hasDelta ? "Market data gateway offline" : "Credentials required",
      },
      twelvedata: {
        configured: hasTwelveData,
        authenticated: hasTwelveData,
        rest: "DOWN",
        websocket: "DISCONNECTED",
        subscriptions: 0,
        lastTickAt: null,
        stale: true,
        error: hasTwelveData ? "Market data gateway offline" : "Set TWELVE_DATA_API_KEY",
      },
      binance: {
        configured: Boolean(process.env.BINANCE_API_KEY),
        authenticated: false,
        rest: "DOWN",
        websocket: "DISCONNECTED",
        subscriptions: 0,
        lastTickAt: null,
        stale: true,
        error: "Market data gateway offline",
      },
    },
    metrics: {
      ticksPerSec: 0,
      activeSockets: 0,
      totalSubscriptions: 0,
      avgLatencyMs: null,
    },
  });
}
