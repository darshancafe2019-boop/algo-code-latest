import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl, CANONICAL_CLOUD_BACKEND_URL } from "@/lib/config/gatewayConfig";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GLOBAL_SNAPSHOT_CACHE = new Map<string, any>();

function generateFallbackSnapshot(symbols: string[]): Record<string, any> {
  const result: Record<string, any> = {};
  const requested = symbols.length > 0 ? symbols : [];

  for (const s of requested) {
    const rawSym = s.trim().toUpperCase();
    if (!rawSym) continue;

    // Check memory cache first
    if (GLOBAL_SNAPSHOT_CACHE.has(rawSym)) {
      const cached = GLOBAL_SNAPSHOT_CACHE.get(rawSym);
      result[rawSym] = { ...cached, is_stale: true, price_state: "STALE", status_label: "STALE" };
      continue;
    }

    const clean = rawSym.replace(/^(NSE|BSE|NASDAQ|NYSE|BINANCE|DELTA|OANDA|FOREX|COM):/, "");
    if (GLOBAL_SNAPSHOT_CACHE.has(clean)) {
      const cached = GLOBAL_SNAPSHOT_CACHE.get(clean);
      result[rawSym] = { ...cached, is_stale: true, price_state: "STALE", status_label: "STALE" };
      continue;
    }

    // Return explicit unavailable metadata when no quote is known
    const ex = rawSym.includes("BINANCE") || rawSym.includes("DELTA") || rawSym.includes("BTC") || rawSym.includes("ETH") || rawSym.includes("USDT")
      ? "CRYPTO"
      : (rawSym.includes("NASDAQ") ? "NASDAQ" : (rawSym.includes("BSE") ? "BSE" : "NSE"));
    result[rawSym] = {
      symbol: rawSym,
      clean_symbol: clean,
      exchange: ex,
      provider: "UNAVAILABLE",
      last_price: null,
      lastPrice: null,
      open: null,
      high: null,
      low: null,
      close: null,
      previous_close: null,
      change_pct: 0.0,
      changePercent: 0.0,
      change: 0.0,
      volume: 0,
      bid: null,
      ask: null,
      market_status: "CLOSED",
      price_state: "UNAVAILABLE",
      status_label: "DATA UNAVAILABLE",
      data_quality: "UNAVAILABLE",
      data_mode: "UNAVAILABLE",
      is_stale: true,
      error: `Market data provider unavailable for ${clean}`,
      timestamp: new Date().toISOString(),
    };
  }

  return result;
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const backendBase = getBackendBaseUrl() || CANONICAL_CLOUD_BACKEND_URL;
  const symbolsParam = searchParams.get("symbols") || searchParams.get("symbol") || "";
  const requestedSymbols = symbolsParam.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const effectiveSymbols = requestedSymbols.length > 0 ? requestedSymbols : ["NIFTY", "BANKNIFTY", "SENSEX", "FINNIFTY", "RELIANCE", "TCS", "HDFCBANK", "INFY", "BTCUSDT", "ETHUSDT"];
  const finalSearchParams = new URLSearchParams(searchParams);
  if (!symbolsParam) {
    finalSearchParams.set("symbols", effectiveSymbols.join(","));
  }
  const targetUrl = `${backendBase.replace(/\/+$/, "")}/api/market/snapshot?${finalSearchParams.toString()}`;

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "QuantOS-NextJS-Proxy",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });

    if (res && res.ok) {
      const data = await res.json();
      const incomingQuotes = data.quotes || data.data || {};
      for (const [k, v] of Object.entries(incomingQuotes)) {
        GLOBAL_SNAPSHOT_CACHE.set(k.toUpperCase(), v);
      }
      return NextResponse.json(data);
    }
  } catch (err: any) {
    console.warn(`[SNAPSHOT_PROXY] Upstream fetch notice: ${err?.message || err}. Serving resilient snapshot.`);
  }

  // Resilient Fallback: Always return status success with cached / baseline quotes so client never buffers
  const fallbackData = generateFallbackSnapshot(requestedSymbols);
  return NextResponse.json({
    status: "success",
    quotes: fallbackData,
    data: fallbackData,
    fallback: true,
    cached: true,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  const backendBase = getBackendBaseUrl() || CANONICAL_CLOUD_BACKEND_URL;
  let requestedSymbols: string[] = [];
  try {
    const body = await req.json();
    requestedSymbols = Array.isArray(body.symbols) ? body.symbols.map((s: string) => s.toUpperCase()) : [];
  } catch {}

  const symbolsStr = requestedSymbols.join(",");
  const targetUrl = `${backendBase.replace(/\/+$/, "")}/api/market/snapshot?symbols=${encodeURIComponent(symbolsStr)}`;

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "QuantOS-NextJS-Proxy",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });

    if (res.ok) {
      const data = await res.json();
      const incomingQuotes = data.quotes || data.data || {};
      for (const [k, v] of Object.entries(incomingQuotes)) {
        GLOBAL_SNAPSHOT_CACHE.set(k.toUpperCase(), v);
      }
      return NextResponse.json(data);
    }
  } catch (err: any) {
    console.warn(`[SNAPSHOT_PROXY_POST] Upstream fetch notice: ${err?.message || err}. Serving resilient snapshot.`);
  }

  const fallbackData = generateFallbackSnapshot(requestedSymbols);
  return NextResponse.json({
    status: "success",
    quotes: fallbackData,
    data: fallbackData,
    fallback: true,
    cached: true,
    timestamp: new Date().toISOString(),
  });
}
