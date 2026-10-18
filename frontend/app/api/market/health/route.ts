import { NextResponse } from "next/server";
import { marketDataConfig } from "@/lib/market-data/config";
import { getGatewayHttpUrl, getGatewaySecret, isProduction } from "@/lib/config/gatewayConfig";

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
        return NextResponse.json({
          status: "healthy",
          gateway: "CONNECTED",
          timestamp: Date.now(),
          ...data,
        });
      }
    } catch {
      // Gateway offline or timed out
    }
  }

  const hasDhan = Boolean(marketDataConfig.dhan.clientId && marketDataConfig.dhan.accessToken);
  const hasUpstox = Boolean(marketDataConfig.upstox.apiKey && marketDataConfig.upstox.accessToken);
  const hasTwelveData = Boolean(marketDataConfig.twelvedata.apiKey && marketDataConfig.twelvedata.apiKey !== "demo");
  const hasDelta = Boolean(marketDataConfig.delta.apiKey);

  return NextResponse.json({
    status: isProduction() && !GATEWAY_URL ? "unavailable" : "degraded",
    gateway: GATEWAY_URL ? "UNAVAILABLE" : "NOT_CONFIGURED",
    timestamp: Date.now(),
    providers: {
      dhan: {
        configured: hasDhan,
        authenticated: hasDhan,
        rest: hasDhan ? "OK" : "NOT_CONFIGURED",
        websocket: "DISCONNECTED",
        subscriptions: 0,
        lastTickAt: null,
        stale: true,
        error: GATEWAY_URL ? "Gateway offline" : "Gateway not configured",
      },
      upstox: {
        configured: hasUpstox,
        authenticated: hasUpstox,
        rest: hasUpstox ? "OK" : "NOT_CONFIGURED",
        websocket: "DISCONNECTED",
        subscriptions: 0,
        lastTickAt: null,
        stale: true,
        error: GATEWAY_URL ? "Gateway offline" : "Gateway not configured",
      },
      delta: {
        configured: hasDelta,
        authenticated: hasDelta,
        rest: hasDelta ? "OK" : "NOT_CONFIGURED",
        websocket: "DISCONNECTED",
        endpoint: "wss://public-socket.india.delta.exchange",
        subscriptions: 0,
        lastTickAt: null,
        stale: true,
        error: GATEWAY_URL ? "Gateway offline" : "Gateway not configured",
      },
      twelvedata: {
        configured: hasTwelveData,
        authenticated: hasTwelveData,
        rest: hasTwelveData ? "OK" : "NOT_CONFIGURED",
        websocket: "DISCONNECTED",
        subscriptions: 0,
        lastTickAt: null,
        stale: true,
        error: hasTwelveData ? (GATEWAY_URL ? "Gateway offline" : "Gateway not configured") : "NO LIVE PROVIDER",
      },
      binance: {
        configured: true,
        authenticated: false,
        rest: "STANDBY",
        websocket: "DISCONNECTED",
        subscriptions: 0,
        lastTickAt: null,
        stale: true,
        error: GATEWAY_URL ? "Gateway offline" : "Gateway not configured",
      },
    },
    metrics: {
      ticksPerSec: 0,
      activeSockets: 0,
      totalSubscriptions: 0,
      avgLatencyMs: 0,
    },
  });
}
