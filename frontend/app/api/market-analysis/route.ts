import { NextRequest, NextResponse } from "next/server";
import { analyzeMarket, getAnalystTelemetry } from "@/lib/openai/marketAnalystService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/market-analysis
 * Accepts: { symbol, assetClass, exchange, analysisType, strategyContext }
 * Returns authoritative structured market analysis
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const symbol = body.symbol || "BTC/USDT";
    const assetClass = body.assetClass || "crypto";
    const exchange = body.exchange || "binance";
    const strategyContext = body.strategyContext;

    const analysis = await analyzeMarket(symbol, assetClass, exchange, strategyContext);

    return NextResponse.json(analysis, { status: 200 });
  } catch (error: any) {
    console.error("[API /api/market-analysis] Error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Market Analyst temporarily unavailable. Your trading system continues operating normally.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/market-analysis
 * Returns current analyst copilot status and telemetry
 */
export async function GET() {
  try {
    const telemetry = getAnalystTelemetry();
    return NextResponse.json(
      {
        status: "ok",
        role: "READ_ONLY_MARKET_ANALYSIS_COPILOT",
        execution_access: false,
        telemetry,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
