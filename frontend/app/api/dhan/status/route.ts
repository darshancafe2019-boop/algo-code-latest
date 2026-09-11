import { NextRequest, NextResponse } from "next/server";
import { dhanAuth } from "@/lib/brokers/dhan/auth";
import { dhanTokenManager } from "@/lib/brokers/dhan/token-manager";
import { dhanLiveFeed } from "@/lib/market-data/dhan-feed";
import { marketHealthMonitor } from "@/lib/market-data/health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const authStatus = await dhanAuth.getAuthStatus();
    const providerHealth = marketHealthMonitor.getProviderHealth("dhan");
    const isLiveFeedActive = dhanLiveFeed.getState() === "LIVE" || providerHealth.state === "LIVE";

    return NextResponse.json({
      success: true,
      status: authStatus.authentication,
      connected: authStatus.authentication === "AUTHENTICATED" || authStatus.authentication === "EXPIRING",
      broker: "dhan",
      brokerName: "Dhan HQ API v2",
      clientId: dhanTokenManager.getClientId(),
      clientIdMasked: authStatus.clientIdMasked,
      hasToken: dhanTokenManager.hasToken(),
      tradingMode: "LIVE",
      dataPlanActive: authStatus.dataPlanActive,
      dataValidity: authStatus.dataValidity,
      marketDataStatus: isLiveFeedActive ? "LIVE" : authStatus.marketData,
      tradingReadiness: authStatus.trading,
      expiresAt: authStatus.expiresAt,
      expiresInSeconds: authStatus.expiresInSeconds,
      latencyMs: authStatus.latencyMs,
      supportedMarkets: ["NSE_EQ", "NSE_FNO", "NSE_CURR", "BSE_EQ", "BSE_FNO", "MCX_COMM"],
      funds: {
        available: 0,
        utilized: 0,
        collateral: 0,
        withdrawable: 0,
      },
      positionsCount: 0,
      ordersCount: 0,
      timestamp: new Date().toISOString(),
      errorMessage: authStatus.errorMessage,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        connected: false,
        status: "ERROR",
        clientIdMasked: dhanTokenManager.getMaskedClientId(),
        hasToken: false,
        dataPlanActive: false,
        marketDataStatus: "DISCONNECTED",
        tradingReadiness: "BLOCKED",
        error: err.message || "Failed to retrieve Dhan connection status",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
