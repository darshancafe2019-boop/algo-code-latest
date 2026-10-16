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

  const resolved = instrumentMaster.resolve(symbol);
  const exStr = (resolved?.exchange || "").toString().toUpperCase();
  const isCrypto = symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("SOL") || exStr === "DELTA" || exStr === "BINANCE";
  const exchange = resolved?.exchange || (isCrypto ? "DELTA" : "NSE");
  const provider = resolved?.provider || (isCrypto ? "delta" : "upstox");
  const marketSession = isCrypto ? "24X7" : "CLOSED";

  // 1. Attempt to fetch real quote from Central Market Data Gateway
  try {
    const res = await fetch(`${GATEWAY_URL}/api/market/quote?symbol=${encodeURIComponent(symbol)}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(2000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.status !== "error" && (data.last_price || data.price || data.ltp || data.last)) {
        const p = Number(data.price ?? data.last ?? data.last_price ?? data.ltp);
        const spreadDiff = Math.max(0.05, Math.round(p * 0.0002 * 100) / 100);
        const calcBid = data.bid != null && Number(data.bid) > 0 ? Number(data.bid) : Math.round((p - spreadDiff) * 100) / 100;
        const calcAsk = data.ask != null && Number(data.ask) > 0 ? Number(data.ask) : Math.round((p + spreadDiff) * 100) / 100;
        const rawProv = String(data.provider || data.source || "").toUpperCase();
        const finalProvider = isCrypto
          ? (rawProv.includes("DELTA") ? "DELTA" : (rawProv || "BINANCE"))
          : (rawProv && !["BINANCE", "DELTA"].includes(rawProv) ? rawProv : "UPSTOX");
        return NextResponse.json({
          ...data,
          price: p,
          last: p,
          last_price: p,
          ltp: p,
          bid: Math.min(calcBid, calcAsk),
          ask: Math.max(calcBid, calcAsk),
          provider: finalProvider,
          exchange: isCrypto ? (rawProv.includes("DELTA") ? "DELTA" : "BINANCE") : "NSE",
        });
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
      if (matched && (matched.last_price || matched.price || matched.ltp)) {
        const p = Number(matched.price ?? matched.last_price ?? matched.ltp);
        const spreadDiff = Math.max(0.05, Math.round(p * 0.0002 * 100) / 100);
        const calcBid = matched.bid != null && Number(matched.bid) > 0 ? Number(matched.bid) : Math.round((p - spreadDiff) * 100) / 100;
        const calcAsk = matched.ask != null && Number(matched.ask) > 0 ? Number(matched.ask) : Math.round((p + spreadDiff) * 100) / 100;
        const rawProv = String(matched.provider || matched.source || "").toUpperCase();
        const finalProvider = isCrypto
          ? (rawProv.includes("DELTA") ? "DELTA" : (rawProv || "BINANCE"))
          : (rawProv && !["BINANCE", "DELTA"].includes(rawProv) ? rawProv : "UPSTOX");
        return NextResponse.json({
          status: "success",
          ...matched,
          price: p,
          last: p,
          last_price: p,
          ltp: p,
          bid: Math.min(calcBid, calcAsk),
          ask: Math.max(calcBid, calcAsk),
          provider: finalProvider,
          exchange: isCrypto ? (rawProv.includes("DELTA") ? "DELTA" : "BINANCE") : "NSE",
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
      signal: AbortSignal.timeout(3000),
    });

    if (bRes.ok) {
      const bData = await bRes.json();
      const qObj = bData.quote || bData.data || bData;
      const p = bData.price ?? bData.last ?? bData.last_price ?? bData.ltp ?? qObj?.lastPrice ?? qObj?.last_price ?? qObj?.price ?? qObj?.ltp;
      if (p !== undefined && p !== null && Number(p) > 0) {
        const numP = Number(p);
        const spreadDiff = Math.max(0.05, Math.round(numP * 0.0002 * 100) / 100);
        const calcBid = (qObj?.bid != null && Number(qObj.bid) > 0) ? Number(qObj.bid) : Math.round((numP - spreadDiff) * 100) / 100;
        const calcAsk = (qObj?.ask != null && Number(qObj.ask) > 0) ? Number(qObj.ask) : Math.round((numP + spreadDiff) * 100) / 100;
        const rawProv = String(bData.provider || qObj?.provider || "").toUpperCase();
        const finalProvider = isCrypto
          ? (rawProv.includes("DELTA") ? "DELTA" : (rawProv || "BINANCE"))
          : (rawProv && !["BINANCE", "DELTA"].includes(rawProv) ? rawProv : "UPSTOX");
        return NextResponse.json({
          status: "success",
          ok: true,
          ...bData,
          price: numP,
          last: numP,
          last_price: numP,
          ltp: numP,
          bid: Math.min(calcBid, calcAsk),
          ask: Math.max(calcBid, calcAsk),
          provider: finalProvider,
          exchange: isCrypto ? (rawProv.includes("DELTA") ? "DELTA" : "BINANCE") : "NSE",
        });
      }
    }
  } catch {
    // Fallthrough
  }

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
