import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const side = (body.side || "LONG").toUpperCase();
    const entryPrice = parseFloat(body.entryPrice || body.entry_price || "0");
    const leverage = parseInt(body.leverage || "10", 10);

    const isLong = side === "LONG" || side === "BUY";
    const initialMarginRate = 1.0 / (leverage > 0 ? leverage : 1);
    const mmr = 0.005;

    let liqPrice = 0.0;
    if (isLong) {
      liqPrice = entryPrice * (1.0 - initialMarginRate + mmr);
    } else {
      liqPrice = entryPrice * (1.0 + initialMarginRate - mmr);
    }

    liqPrice = Math.max(0.0, Math.round(liqPrice * 100) / 100);
    const distancePct =
      entryPrice > 0
        ? Math.round((Math.abs(entryPrice - liqPrice) / entryPrice) * 10000) / 100
        : 0;

    return NextResponse.json(
      {
        status: "SUCCESS",
        result: {
          entryPrice,
          leverage,
          side,
          liquidationPrice: liqPrice,
          liquidationDistancePct: distancePct,
          riskLevel: distancePct < 5.0 ? "HIGH" : distancePct < 15.0 ? "MODERATE" : "SAFE",
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: "ERROR", message: err.message },
      { status: 500 }
    );
  }
}
