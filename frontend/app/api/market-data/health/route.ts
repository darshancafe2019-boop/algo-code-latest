import { NextRequest, NextResponse } from "next/server";
import { marketHealthMonitor } from "@/lib/market-data/health";
import { subscriptionManager } from "@/lib/market-data/subscription-manager";
import { marketState } from "@/lib/market-data/market-state";
import { DHAN_CONFIG } from "@/lib/market-data/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const dhanAuth = DHAN_CONFIG.getCredentials();
  const tokenConfigured = Boolean(dhanAuth.accessToken);
  
  let isTokenExpired = false;
  if (dhanAuth.accessToken) {
    try {
      const parts = dhanAuth.accessToken.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
        if (payload.exp) {
          isTokenExpired = Date.now() > payload.exp * 1000;
        }
      }
    } catch {
      // Ignore parse failure
    }
  }

  const dhanHealth = marketHealthMonitor.getProviderHealth("dhan");
  const overallState = marketHealthMonitor.getOverallSystemState();
  const activeSymbols = subscriptionManager.getActiveSymbols();
  const allQuotes = marketState.getAllQuotes();
  
  const liveQuotesCount = allQuotes.filter((q) => q.freshness_status === "LIVE" || q.freshness_status === "FRESH").length;
  const staleQuotesCount = allQuotes.filter((q) => q.freshness_status === "STALE" || q.freshness_status === "EXPIRED").length;

  return NextResponse.json({
    dhan: {
      connected: dhanHealth.state === "LIVE" || dhanHealth.state === "CONNECTED",
      authenticated: tokenConfigured && !isTokenExpired,
      authStatus: isTokenExpired ? "DHAN_AUTH_FAILED" : tokenConfigured ? "OK" : "NOT_CONFIGURED",
      subscribed: activeSymbols.length,
      subscriptions: activeSymbols,
      lastPacketAt: dhanHealth.lastMessageTime ? new Date(dhanHealth.lastMessageTime).toISOString() : null,
      lastTickAt: dhanHealth.lastMessageTime ? new Date(dhanHealth.lastMessageTime).toISOString() : null,
      latency: dhanHealth.latencyMs,
      packetRate: dhanHealth.ticksPerSec,
      ticksReceived: dhanHealth.subscribedCount,
      errorsCount: dhanHealth.errorCount,
      errorMessage: isTokenExpired
        ? "DHAN_AUTH_FAILED: Access token has expired"
        : dhanHealth.lastError || null,
    },
    redis: {
      connected: false,
      mode: "IN_MEMORY_FALLBACK",
      latency: 0,
    },
    marketData: {
      state: overallState,
      live: liveQuotesCount > 0,
      stale: staleQuotesCount > 0 && liveQuotesCount === 0,
      instruments: activeSymbols.length,
      cachedQuotesCount: allQuotes.length,
      timestamp: new Date().toISOString(),
    },
  });
}
