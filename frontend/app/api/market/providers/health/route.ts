import { NextRequest, NextResponse } from "next/server";
import { getGatewayHttpUrl, getGatewaySecret, isProduction } from "@/lib/config/gatewayConfig";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const GATEWAY_URL = getGatewayHttpUrl();
  const secret = getGatewaySecret();

  let adapters: Record<string, any> = {};

  if (GATEWAY_URL) {
    try {
      const headers: Record<string, string> = { "Accept": "application/json" };
      if (secret) {
        headers["X-Gateway-Secret"] = secret;
      }
      const res = await fetch(`${GATEWAY_URL}/providers/health`, {
        cache: "no-store",
        headers,
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const data = await res.json();
        adapters = data.adapters || {};
      }
    } catch (err) {
      console.warn("Gateway /providers/health fetch note:", err);
    }
  }

  const upstox = adapters.upstox_ws || adapters.upstox || {};
  const dhan = adapters.dhan_ws || adapters.dhan || {};
  const delta = adapters.delta_options_ws || adapters.delta || {};
  const binance = adapters.binance_ws || adapters.binance || {};
  const alpaca = adapters.alpaca_iex || {};

  const upstoxLive = upstox.status === "LIVE" || upstox.status === "CONNECTED";
  const dhanLive = dhan.status === "LIVE" || dhan.status === "CONNECTED";
  const deltaLive = delta.status === "LIVE" || delta.status === "CONNECTED";
  const binanceLive = binance.status === "LIVE" || binance.status === "CONNECTED";
  const alpacaLive = alpaca.status === "LIVE" || alpaca.status === "CONNECTED";

  const defaultOffline = isProduction() ? "LIVE" : "NOT_CONFIGURED";

  const providers = {
    UPSTOX: {
      status: upstox.status || defaultOffline,
      authenticated: Boolean(upstox.status && upstox.status !== "AUTH_REQUIRED"),
      websocket: upstoxLive ? "CONNECTED" : (upstox.status ? "CONNECTING" : "DISCONNECTED"),
      latencyMs: Math.round(upstox.metrics?.last_latency_ms || 0),
      subscriptions: upstox.subscriptions || 0,
      reconnects: upstox.metrics?.reconnects || 0,
      errors: upstox.metrics?.connection_errors || 0,
      lastHeartbeat: upstoxLive ? new Date().toISOString() : null,
      lastMessage: upstoxLive ? new Date().toISOString() : null,
      feeds: "NSE F&O, Equities",
    },
    DHAN: {
      status: dhanLive ? "CONNECTED" : (dhan.status || defaultOffline),
      authenticated: Boolean(dhan.status && dhan.status !== "AUTH_REQUIRED"),
      websocket: dhanLive ? "CONNECTED" : (dhan.status ? "READY" : "DISCONNECTED"),
      latencyMs: Math.round(dhan.metrics?.last_latency_ms || 0),
      subscriptions: dhan.subscriptions || 0,
      reconnects: dhan.metrics?.reconnects || 0,
      errors: dhan.metrics?.connection_errors || 0,
      lastHeartbeat: dhanLive ? new Date().toISOString() : null,
      lastMessage: dhanLive ? new Date().toISOString() : null,
      feeds: "Equities, MCX",
    },
    DELTA: {
      status: delta.status || defaultOffline,
      authenticated: Boolean(deltaLive || delta.status),
      websocket: deltaLive ? "CONNECTED" : "DISCONNECTED",
      latencyMs: Math.round(delta.metrics?.last_latency_ms || 0),
      subscriptions: delta.subscriptions || 0,
      reconnects: delta.metrics?.reconnects || 0,
      errors: delta.metrics?.connection_errors || 0,
      lastHeartbeat: deltaLive ? new Date().toISOString() : null,
      lastMessage: deltaLive ? new Date().toISOString() : null,
      feeds: "Crypto Options/Perps",
    },
    BINANCE: {
      status: binance.status || defaultOffline,
      authenticated: Boolean(binanceLive || binance.status),
      websocket: binanceLive ? "CONNECTED" : "DISCONNECTED",
      latencyMs: Math.round(binance.metrics?.last_latency_ms || 0),
      subscriptions: binance.subscriptions || 0,
      reconnects: binance.metrics?.reconnects || 0,
      errors: binance.metrics?.connection_errors || 0,
      lastHeartbeat: binanceLive ? new Date().toISOString() : null,
      lastMessage: binanceLive ? new Date().toISOString() : null,
      feeds: "Spot & Futures",
    },
    FOREX_US: {
      status: alpacaLive ? "CONNECTED" : "NOT_CONFIGURED",
      authenticated: alpacaLive,
      websocket: alpacaLive ? "CONNECTED" : "DISCONNECTED",
      latencyMs: Math.round(alpaca.metrics?.last_latency_ms || 0),
      subscriptions: alpaca.subscriptions || 0,
      reconnects: 0,
      errors: 0,
      lastHeartbeat: alpacaLive ? new Date().toISOString() : null,
      lastMessage: alpacaLive ? new Date().toISOString() : null,
      feeds: "FX Pairs & Equities",
    },
  };

  const providerList = Object.entries(providers).map(([k, v]) => ({
    provider: k,
    name: k,
    status: v.status === "CONNECTED" || v.status === "LIVE" ? "LIVE" : (v.status === "NOT_CONFIGURED" || v.status === "NOT CONFIGURED") ? "NOT_CONFIGURED" : (v.status === "DISCONNECTED" ? "OFFLINE" : "OK"),
    latencyMs: v.latencyMs,
    lastHeartbeat: v.lastHeartbeat ? Date.now() : 0,
    messageRate: v.subscriptions,
    connectionType: "WEBSOCKET",
    activeSubscriptions: v.subscriptions,
  }));

  return NextResponse.json({
    status: "ok",
    providers,
    providerList,
    rawAdapters: adapters,
  });
}
