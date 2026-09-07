import { NextResponse } from "next/server";
import { brokerManager } from "@/lib/brokers/broker-manager";
import { riskEngine } from "@/lib/trading/risk-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const dhanAdapter = brokerManager.getAdapter("dhan");
    const upstoxAdapter = brokerManager.getAdapter("upstox");
    const deltaAdapter = brokerManager.getAdapter("delta");

    const dhanAuth = dhanAdapter.isAuthenticated();
    const upstoxAuth = upstoxAdapter.isAuthenticated();
    const deltaAuth = deltaAdapter.isAuthenticated();

    return NextResponse.json({
      app: "healthy",
      database: "healthy",
      tradingMode: (process.env.TRADING_MODE || "PAPER").toUpperCase(),
      killSwitchActive: riskEngine.isKillSwitchActive(),
      dhan: {
        auth: dhanAuth ? "connected" : "not_configured",
        marketData: dhanAuth ? "live" : "ready",
        trading: "ready",
        environment: (process.env.DHAN_SANDBOX === "true" || process.env.DHAN_BASE_URL?.includes("sandbox")) ? "SANDBOX" : "LIVE",
      },
      upstox: {
        auth: upstoxAuth ? "connected" : "not_configured",
        marketData: upstoxAuth ? "live" : "ready",
        trading: "ready",
      },
      delta: {
        auth: deltaAuth ? "connected" : "not_configured",
        marketData: deltaAuth ? "live" : "ready",
        trading: "ready",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { app: "degraded", error: err.message },
      { status: 500 }
    );
  }
}
