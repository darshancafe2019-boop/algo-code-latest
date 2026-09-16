import { NextRequest, NextResponse } from "next/server";
import {
  getUpstoxCredentials,
  getUpstoxMarketDataToken,
  isIndianMarketOpen,
  globalMarketStore,
  globalUpstoxWs,
  UpstoxHealthReport,
  UpstoxConnectionState,
} from "@/lib/upstox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/upstox/health
 * Returns safe health telemetry for the Upstox market data pipeline.
 * NEVER returns credentials, tokens, or secrets.
 */
export async function GET(req: NextRequest) {
  try {
    const creds = getUpstoxCredentials();
    const oauthToken = req.cookies?.get?.("upstox_access_token")?.value;
    const tokenResolution = getUpstoxMarketDataToken(oauthToken);
    const isOpen = isIndianMarketOpen();

    const lastMsgTs = globalUpstoxWs.getLastMessageTimestamp();
    const lastUpdateTs = globalMarketStore.getLastUpdateTimestamp();
    const latestTs = Math.max(lastMsgTs, lastUpdateTs);
    const ageMs = Date.now() - latestTs;

    const healthSummary = globalMarketStore.getHealthSummary();

    const wsState = globalUpstoxWs.getState();
    const connState: UpstoxConnectionState = wsState === "STALE" ? "ERROR" : wsState;

    const report: UpstoxHealthReport = {
      provider: "UPSTOX",
      configured: Boolean(creds.apiKey || creds.analyticsToken),
      authenticated: tokenResolution.isValid,
      tokenType: tokenResolution.tokenType,
      restApi: tokenResolution.isValid ? "healthy" : "unauthenticated",
      websocket: wsState,
      connectionState: connState,
      marketStatus: isOpen ? "OPEN" : "CLOSED",
      marketPhase: healthSummary.marketPhase,
      subscriptions: globalUpstoxWs.getSubscriptionsCount(),
      lastTickAt: latestTs > 0 ? new Date(latestTs).toISOString() : null,
      stale: isOpen && ageMs > 30000,
      paperMode: creds.paperMode,
      tradingEnabled: creds.tradingEnabled,
      timestamp: new Date().toISOString(),
      liveTradeCount: healthSummary.liveTradeCount,
      closingAuctionCount: healthSummary.closingAuctionCount,
      lastTradedCount: healthSummary.lastTradedCount,
      staleCount: healthSummary.staleCount,
    };

    return NextResponse.json({
      status: "success",
      ...report,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "degraded",
        provider: "UPSTOX",
        configured: false,
        authenticated: false,
        tokenType: "none",
        restApi: "unauthenticated",
        websocket: "DISCONNECTED",
        marketStatus: "CLOSED",
        subscriptions: 0,
        lastTickAt: null,
        stale: true,
        paperMode: true,
        tradingEnabled: false,
        message: err?.message || "Failed to generate health report.",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
