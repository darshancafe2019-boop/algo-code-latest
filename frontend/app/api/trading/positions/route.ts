import { NextRequest, NextResponse } from "next/server";
import { brokerManager } from "@/lib/brokers/broker-manager";
import { Position } from "@/lib/brokers/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const brokerFilter = url.searchParams.get("broker")?.toLowerCase();

  try {
    const allAdapters = brokerManager.getAllAdapters();
    const positionsList: Position[] = [];

    await Promise.allSettled(
      allAdapters.map(async (adapter) => {
        if (brokerFilter && adapter.broker !== brokerFilter && brokerFilter !== "all") {
          return;
        }
        try {
          const pos = await adapter.getPositions();
          positionsList.push(...pos);
        } catch {}
      })
    );

    const totalUnrealizedPnl = positionsList.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);
    const totalRealizedPnl = positionsList.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);

    return NextResponse.json({
      success: true,
      positions: positionsList,
      count: positionsList.length,
      metrics: {
        totalUnrealizedPnl,
        totalRealizedPnl,
        openPositionsCount: positionsList.filter((p) => p.quantity > 0).length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: true,
        positions: [],
        count: 0,
        metrics: {
          totalUnrealizedPnl: 0,
          totalRealizedPnl: 0,
          openPositionsCount: 0,
        },
        error: err.message || "Failed to aggregate positions",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
