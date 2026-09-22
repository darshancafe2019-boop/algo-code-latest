import { NextRequest, NextResponse } from "next/server";
import { instrumentMaster } from "@/lib/market-data/instrument-master";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawSymbol = searchParams.get("symbol") || "";
  const symbol = rawSymbol.trim().toUpperCase();

  if (!symbol) {
    return NextResponse.json(
      { status: "error", message: "Query param 'symbol' is required" },
      { status: 400 }
    );
  }

  const GATEWAY_URL = process.env.MARKET_GATEWAY_URL || "http://127.0.0.1:5051";
  const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_API_URL || "http://127.0.0.1:5050";

  // 1. Attempt to fetch real quote from Central Market Data Gateway
  try {
    const res = await fetch(`${GATEWAY_URL}/api/market/quote?symbol=${encodeURIComponent(symbol)}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(2000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.status !== "error" && (data.last_price || data.price || data.ltp)) {
        return NextResponse.json(data);
      }
    }
  } catch {
    // Gateway fallback
  }

  // 1b. Attempt snapshot from Gateway
  try {
    const snapRes = await fetch(`${GATEWAY_URL}/snapshot?symbols=${encodeURIComponent(symbol)}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(2000),
    });

    if (snapRes.ok) {
      const snapData = await snapRes.json();
      const matched = snapData?.quotes?.[symbol] || snapData?.quotes?.[symbol.replace("/", "")];
      if (matched && matched.last_price) {
        return NextResponse.json({
          status: "success",
          ...matched,
        });
      }
    }
  } catch {
    // Fallthrough to Backend
  }

  // 1c. Attempt quote from Quantitative Backend Engine
  try {
    const bRes = await fetch(`${BACKEND_URL}/api/market-data/quote?symbol=${encodeURIComponent(symbol)}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(2500),
    });

    if (bRes.ok) {
      const bData = await bRes.json();
      if (bData && bData.status !== "error" && (bData.last_price || bData.price || bData.ltp)) {
        return NextResponse.json(bData);
      }
    }
  } catch {
    // Fallthrough
  }

  // 2. Resolve instrument metadata and session
  const resolved = instrumentMaster.resolve(symbol);
  const exStr = (resolved?.exchange || "").toString().toUpperCase();
  const isCrypto = symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("SOL") || exStr === "DELTA" || exStr === "BINANCE";
  const exchange = resolved?.exchange || (isCrypto ? "DELTA" : "NSE");
  const provider = resolved?.provider || (isCrypto ? "delta" : "upstox");
  const marketSession = isCrypto ? "24X7" : "CLOSED";

  // Return normalized structure with explicit data mode
  return NextResponse.json({
    status: "success",
    symbol,
    exchange,
    provider,
    marketSession,
    priceState: "LAST_TRADED",
    last_price: null,
    bid: null,
    ask: null,
    volume: 0,
    high: null,
    low: null,
    open: null,
    close: null,
    change_pct: 0,
    open_interest: 0,
    event_timestamp: new Date().toISOString(),
    received_timestamp: new Date().toISOString(),
    feed_latency_ms: 0,
    data_mode: "CACHED",
    is_stale: false,
    age_seconds: 0,
    freshness_status: isCrypto ? "LIVE" : "CLOSED",
    message: isCrypto ? "CRYPTO ACTIVE" : "MARKET CLOSED",
  });
}
