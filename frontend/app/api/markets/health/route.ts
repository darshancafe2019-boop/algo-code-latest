import { NextRequest, NextResponse } from "next/server";
import { marketHealthMonitor } from "@/lib/market-data/health";
import { dhanTokenManager } from "@/lib/brokers/dhan/token-manager";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const systemState = marketHealthMonitor.getOverallSystemState();
    const providers = marketHealthMonitor.getAllProvidersHealth();
    const metrics = marketHealthMonitor.getMetrics();
    const dhanSafeState = dhanTokenManager.getSafeState();

    return NextResponse.json({
      success: true,
      systemState,
      isLive: systemState === "LIVE",
      providers,
      metrics,
      dhanAuth: dhanSafeState,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to retrieve market health metrics",
      },
      { status: 500 }
    );
  }
}
