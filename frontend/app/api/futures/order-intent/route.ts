import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl, isProduction } from "@/lib/config/gatewayConfig";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const backendUrl = getBackendBaseUrl();
  if (isProduction() && !backendUrl) {
    return NextResponse.json(
      { error: "Backend service URL is not configured in production environment." },
      { status: 503 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  if (backendUrl) {
    try {
      const backendRes = await fetch(`${backendUrl}/api/futures/order-intent`, {
        method: "POST",
        headers: {
          ...getForwardHeaders(req),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });

      if (backendRes.ok) {
        const data = await backendRes.json();
        return NextResponse.json(data, { status: 200 });
      }
      if (backendRes.status >= 400 && backendRes.status < 500) {
        const data = await backendRes.json().catch(() => ({ error: "Request failed" }));
        return NextResponse.json(data, { status: backendRes.status });
      }
    } catch (_err) {}
  }

  // In production, fail closed
  if (isProduction()) {
    return NextResponse.json(
      {
        status: "ERROR",
        error: "Backend quantitative engine order router unreachable.",
      },
      { status: 503 }
    );
  }

  // Local development simulation only
  return NextResponse.json(
    {
      status: "SUCCESS",
      result: {
        order_intent_id: `INTENT_${Date.now().toString(36)}`,
        client_order_id: `FO_${Date.now()}`,
        symbol: body.symbol || "BTC/USDT:USDT",
        environment: "PAPER",
        side: body.side || "BUY",
        quantity: body.quantity || 0.1,
        order_type: body.order_type || "MARKET",
        execution_price: 78540.0,
        estimated_notional: 7854.0,
        required_margin: 785.4,
        leverage: body.leverage || 10,
        margin_mode: "ISOLATED",
        estimated_fee: 3.92,
        status: "FILLED",
        risk_decision: "ALLOW",
        message: "Paper order intent processed in dev simulation mode.",
        timestamp: new Date().toISOString(),
      },
    },
    { status: 200 }
  );
}
