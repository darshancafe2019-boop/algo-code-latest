import { NextRequest, NextResponse } from "next/server";
import {
  analyzeMarket,
  analyzeOpenPosition,
  reviewCompletedTrade,
  getAnalystTelemetry,
} from "@/lib/openai/marketAnalystService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/analysis/market
 * Primary server-side market analysis endpoint.
 * Accepts:
 * {
 *   market: "crypto" | "nse" | "us_equities" | "forex" | "commodities",
 *   symbol: "BTC/USDT",
 *   timeframe: "15m",
 *   analysisType: "QUICK" | "DETAILED" | "TRADE_REVIEW" | "OPTIONS" | "MACRO",
 *   strategyContext?: any,
 *   position?: any,
 *   trade?: any
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const symbol = body.symbol || "BTC/USDT";
    const market = body.market || body.assetClass || "crypto";
    const exchange = body.exchange || "binance";
    const mode = (body.analysisType || body.mode || "DETAILED").toUpperCase();

    // 1. Handle Position Analysis if position payload provided
    if (mode === "POSITION" || body.position) {
      const positionResult = await analyzeOpenPosition(body.position);
      return NextResponse.json(
        {
          status: "ok",
          type: "POSITION_REVIEW",
          analysis: positionResult,
        },
        { status: 200 }
      );
    }

    // 2. Handle Completed Trade Postmortem if trade payload provided
    if (mode === "TRADE_REVIEW" && body.trade) {
      const tradeResult = await reviewCompletedTrade(body.trade);
      return NextResponse.json(
        {
          status: "ok",
          type: "TRADE_REVIEW",
          analysis: tradeResult,
        },
        { status: 200 }
      );
    }

    // 3. Standard Market Analysis (Quick, Detailed, Options, Macro)
    const analysis = await analyzeMarket(
      symbol,
      market,
      exchange,
      body.strategyContext,
      mode as any
    );

    return NextResponse.json(analysis, { status: 200 });
  } catch (error: any) {
    console.error("[API /api/analysis/market] Error:", error);
    return NextResponse.json(
      {
        status: "warning",
        fallback: true,
        message: "Market Analyst operating in deterministic mode. Your trading system continues operating normally.",
        error: error.message,
      },
      { status: 200 }
    );
  }
}

/**
 * GET /api/analysis/market
 * Returns status, telemetry, and rate limits
 */
export async function GET() {
  try {
    const telemetry = getAnalystTelemetry();
    return NextResponse.json(
      {
        status: "ok",
        role: "READ_ONLY_MARKET_ANALYSIS_ASSISTANT",
        execution_access: false,
        telemetry,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "warning",
        role: "READ_ONLY_MARKET_ANALYSIS_ASSISTANT",
        execution_access: false,
        telemetry: { status: "DEGRADED", error: error.message },
      },
      { status: 200 }
    );
  }
}
