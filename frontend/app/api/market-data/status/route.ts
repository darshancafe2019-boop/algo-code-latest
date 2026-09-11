import { NextRequest, NextResponse } from "next/server";
import { dhanFeed } from "@/lib/market-data/dhan-feed";
import { marketHealthMonitor } from "@/lib/market-data/health";
import { marketState } from "@/lib/market-data/market-state";
import { subscriptionManager } from "@/lib/market-data/subscription-manager";
import { DHAN_CONFIG } from "@/lib/market-data/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const dhanAuth = DHAN_CONFIG.getCredentials();
  const tokenConfigured = Boolean(dhanAuth.accessToken);
  const clientId = dhanAuth.clientId ? `${dhanAuth.clientId.slice(0, 4)}...${dhanAuth.clientId.slice(-4)}` : "NOT_CONFIGURED";
  
  // Check token expiration if JWT format
  let isTokenExpired = false;
  let tokenExpiry: string | null = null;
  if (dhanAuth.accessToken) {
    try {
      const parts = dhanAuth.accessToken.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
        if (payload.exp) {
          isTokenExpired = Date.now() > payload.exp * 1000;
          tokenExpiry = new Date(payload.exp * 1000).toISOString();
        }
      }
    } catch {
      // Ignore parse failure
    }
  }

  const dhanHealth = marketHealthMonitor.getProviderHealth("dhan");

  const response = {
    provider: "dhan",
    account: "dhan_primary",
    status: isTokenExpired
      ? "DHAN_AUTH_FAILED"
      : !tokenConfigured
      ? "CREDENTIALS_MISSING"
      : dhanHealth.state,
    authenticated: tokenConfigured && !isTokenExpired,
    authStatus: isTokenExpired
      ? "TOKEN_EXPIRED"
      : tokenConfigured
      ? "AUTHENTICATED"
      : "MISSING_CREDENTIALS",
    clientIdMasked: clientId,
    tokenExpiry,
    isTokenExpired,
    subscribedInstruments: subscriptionManager.getActiveSymbols().length,
    activeSubscriptions: subscriptionManager.getActiveSymbols(),
    lastPacketAt: dhanHealth.lastMessageTime ? new Date(dhanHealth.lastMessageTime).toISOString() : null,
    lastTickAt: dhanHealth.lastMessageTime ? new Date(dhanHealth.lastMessageTime).toISOString() : null,
    latencyMs: dhanHealth.latencyMs,
    packetRate: dhanHealth.ticksPerSec,
    ticksReceived: dhanHealth.subscribedCount,
    errorsCount: dhanHealth.errorCount,
    errorMessage: isTokenExpired
      ? "Dhan Access Token expired. Please regenerate your token from DhanHQ Web/App."
      : !tokenConfigured
      ? "Dhan Client ID and Access Token are not configured in environment variables."
      : dhanHealth.lastError || null,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response);
}
