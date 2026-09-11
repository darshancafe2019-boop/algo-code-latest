import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GATEWAY_URL = process.env.MARKET_GATEWAY_URL || "http://127.0.0.1:5051";
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_API_URL || "http://127.0.0.1:5050";
const GATEWAY_SECRET = process.env.MARKET_GATEWAY_SECRET || "changeme-set-a-strong-random-secret-here";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol");
  const requestId = req.headers.get("x-request-id") || `ltp_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

  if (!symbol || !symbol.trim()) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_SYMBOL",
        symbol: "",
        message: "Query parameter 'symbol' is required.",
      },
      { status: 400, headers: { "X-Request-Id": requestId } }
    );
  }

  const encodedSymbol = encodeURIComponent(symbol.trim());

  // 1. Send ONE canonical request to Market Data Gateway :5051
  try {
    const gatewayTarget = `${GATEWAY_URL}/ltp?symbol=${encodedSymbol}`;
    const resp = await fetch(gatewayTarget, {
      method: "GET",
      headers: {
        "X-Gateway-Secret": GATEWAY_SECRET,
        "Accept": "application/json",
        "X-Request-Id": requestId,
      },
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });

    if (resp.ok || resp.status === 404 || resp.status === 409 || resp.status === 503 || resp.status === 504) {
      const data = await resp.json().catch(() => null);
      if (data) {
        return NextResponse.json(data, {
          status: resp.status,
          headers: { "X-Request-Id": requestId, "X-Gateway-Proxied": "true" },
        });
      }
    }
  } catch {
    // Gateway offline or timed out, attempt single fallback to backend
  }

  // 2. Single canonical fallback to Backend :5050
  try {
    const backendTarget = `${BACKEND_URL}/api/market-data/ltp?symbol=${encodedSymbol}`;
    const resp = await fetch(backendTarget, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-Request-Id": requestId,
      },
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });

    const data = await resp.json().catch(() => null);
    if (data) {
      return NextResponse.json(data, {
        status: resp.status,
        headers: { "X-Request-Id": requestId, "X-Backend-Proxied": "true" },
      });
    }
  } catch {
    // Backend unreachable
  }

  return NextResponse.json(
    {
      ok: false,
      code: "SOURCE_DISCONNECTED",
      symbol: symbol.trim(),
      source: "UNAVAILABLE",
      message: "Market data services are currently unreachable.",
    },
    { status: 503, headers: { "X-Request-Id": requestId } }
  );
}
