import { NextResponse } from "next/server";
import { marketDataConfig } from "@/lib/market-data/config";
import { getGatewayHttpUrl, getGatewaySecret, getBackendConfigStatus, isProduction } from "@/lib/config/gatewayConfig";

export const dynamic = "force-dynamic";

export interface ProviderCatalogItem {
  id: string;
  name: string;
  category: "INDIAN_BROKERS" | "CRYPTO" | "GLOBAL_FOREX";
  description: string;
  assetClasses: string[];
  connected: boolean;
  connectionState: "CONNECTED" | "DEGRADED" | "DISCONNECTED" | "NOT_CONFIGURED" | "AUTH_REQUIRED";
  mode: "REAL_TIME" | "DELAYED" | "SIMULATED" | "DISABLED";
  isPrimary?: boolean;
  health: {
    pingMs: number;
    lastTickAt: number;
    subscriptions: number;
    error?: string | null;
  };
}

export async function GET() {
  const GATEWAY_URL = getGatewayHttpUrl();
  const secret = getGatewaySecret();

  if (GATEWAY_URL) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (secret) {
        headers["X-Gateway-Secret"] = secret;
      }
      const res = await fetch(`${GATEWAY_URL}/api/v1/providers`, {
        cache: "no-store",
        headers,
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // Gateway offline, fallback to localized environment resolution
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
        if (Array.isArray(bData)) {
          return NextResponse.json(bData);
        } else if (bData.providers) {
          const catalogList: ProviderCatalogItem[] = Object.entries(bData.providers).map(([k, p]: [string, any]) => ({
            id: k,
            name: p.name || k.toUpperCase(),
            category: (k === "binance" || k === "delta") ? "CRYPTO" : "INDIAN_BROKERS",
            description: `${p.name || k} Market Data Feed`,
            assetClasses: ["EQUITY", "CRYPTO_SPOT"],
            connected: Boolean(p.connected),
            connectionState: p.connected ? "CONNECTED" : (p.configured ? "DEGRADED" : "NOT_CONFIGURED"),
            mode: p.connected ? "REAL_TIME" : "SIMULATED",
            isPrimary: true,
            health: {
              pingMs: p.latency_ms || 12,
              lastTickAt: Date.now(),
              subscriptions: 5,
              error: null,
            },
          }));
          return NextResponse.json(catalogList);
        }
      }
    } catch {}
  }

  // Canonical provider statuses derived from local config
  const hasDhan = Boolean(marketDataConfig.dhan.clientId && marketDataConfig.dhan.accessToken);
  const hasUpstox = Boolean(marketDataConfig.upstox.apiKey && marketDataConfig.upstox.accessToken);
  const hasDelta = Boolean(marketDataConfig.delta.apiKey);
  const hasTwelveData = Boolean(marketDataConfig.twelvedata.apiKey && marketDataConfig.twelvedata.apiKey !== "demo");
  const hasBinance = Boolean(process.env.BINANCE_API_KEY);

  const defaultState = (configured: boolean): "CONNECTED" | "NOT_CONFIGURED" => {
    return configured ? "CONNECTED" : "NOT_CONFIGURED";
  };

  const providers: ProviderCatalogItem[] = [
    {
      id: "dhan",
      name: "Dhan HQ",
      category: "INDIAN_BROKERS",
      description: "Direct NSE/BSE binary tick feed, F&O options, and portfolio execution",
      assetClasses: ["EQUITY", "INDICES", "FUTURES", "OPTIONS"],
      connected: false,
      connectionState: defaultState(hasDhan),
      mode: "DISABLED",
      isPrimary: true,
      health: {
        pingMs: 0,
        lastTickAt: 0,
        subscriptions: 0,
        error: hasDhan ? (GATEWAY_URL ? "Gateway offline" : "Gateway unconfigured") : "Credentials required",
      },
    },
    {
      id: "upstox",
      name: "Upstox V3",
      category: "INDIAN_BROKERS",
      description: "Protobuf market data feed, Greeks, multi-leg options, and NSE/BSE equities",
      assetClasses: ["EQUITY", "INDICES", "FUTURES", "OPTIONS"],
      connected: false,
      connectionState: defaultState(hasUpstox),
      mode: "DISABLED",
      health: {
        pingMs: 0,
        lastTickAt: 0,
        subscriptions: 0,
        error: hasUpstox ? (GATEWAY_URL ? "Gateway offline" : "Gateway unconfigured") : "Credentials required",
      },
    },
    {
      id: "delta",
      name: "Delta Exchange India",
      category: "CRYPTO",
      description: "Public & private WebSocket feeds for crypto perpetuals, futures, and options",
      assetClasses: ["CRYPTO_SPOT", "CRYPTO_FUTURES", "CRYPTO_OPTIONS"],
      connected: false,
      connectionState: defaultState(hasDelta),
      mode: "DISABLED",
      isPrimary: true,
      health: {
        pingMs: 0,
        lastTickAt: 0,
        subscriptions: 0,
        error: hasDelta ? (GATEWAY_URL ? "Gateway offline" : "Gateway unconfigured") : "Credentials required",
      },
    },
    {
      id: "twelvedata",
      name: "Twelve Data",
      category: "GLOBAL_FOREX",
      description: "Global US equities, Forex pairs, precious metals, and reference indices",
      assetClasses: ["GLOBAL_EQUITIES", "FOREX", "COMMODITIES"],
      connected: false,
      connectionState: defaultState(hasTwelveData),
      mode: "DISABLED",
      health: {
        pingMs: 0,
        lastTickAt: 0,
        subscriptions: 0,
        error: hasTwelveData ? null : "Set TWELVE_DATA_API_KEY in server environment to enable global data",
      },
    },
    {
      id: "binance",
      name: "Binance Public Feed",
      category: "CRYPTO",
      description: "Global crypto reference ticker and orderbook data",
      assetClasses: ["CRYPTO_SPOT", "CRYPTO_FUTURES"],
      connected: false,
      connectionState: defaultState(hasBinance),
      mode: "DISABLED",
      health: {
        pingMs: 0,
        lastTickAt: 0,
        subscriptions: 0,
        error: GATEWAY_URL ? "Gateway offline" : "Gateway unconfigured",
      },
    },
  ];

  return NextResponse.json({
    status: isProduction() && !GATEWAY_URL ? "unavailable" : "degraded",
    timestamp: Date.now(),
    providers,
    totalCount: providers.length,
    connectedCount: providers.filter((p) => p.connected).length,
  });
}
