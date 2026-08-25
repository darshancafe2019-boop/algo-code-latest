import { NextRequest, NextResponse } from "next/server";
import { askAnalyst } from "@/lib/openai/marketAnalystService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/market-analysis/ask
 * Accepts: { symbol, question, assetClass, exchange }
 * Returns conversational Q&A answer grounded in current snapshot
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const symbol = body.symbol || "BTC/USDT";
    const question = body.question || "Explain the current market state and key levels.";
    const assetClass = body.assetClass || "crypto";
    const exchange = body.exchange || "binance";

    const result = await askAnalyst(symbol, question, assetClass, exchange);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[API /api/market-analysis/ask] Error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to query analyst.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
