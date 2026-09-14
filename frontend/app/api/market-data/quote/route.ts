import { NextRequest, NextResponse } from "next/server";
import { instrumentMaster } from "@/lib/market-data/instrument-master";
import { NormalizedQuote } from "@/lib/market-data/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GATEWAY_HTTP_URL =
  process.env.MARKET_DATA_GATEWAY_HTTP_URL ||
  process.env.MARKET_GATEWAY_URL ||
  "http://127.0.0.1:5051";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawSymbol = searchParams.get("symbol");

  if (!rawSymbol || !rawSymbol.trim()) {
    return NextResponse.json(
      { error: "SYMBOL_REQUIRED", message: "Query parameter 'symbol' is required." },
      { status: 400 }
    );
  }

  const cleanSym = rawSymbol.trim().toUpperCase();
  const inst = instrumentMaster.resolve(cleanSym);

  // Fetch authoritative snapshot from Python Market Data Gateway
  const symbolsToQuery = [cleanSym];
  if (cleanSym.includes("/")) {
    symbolsToQuery.push(cleanSym.replace("/", ""));
  }

  try {
    const url = `${GATEWAY_HTTP_URL}/snapshot?symbols=${encodeURIComponent(symbolsToQuery.join(","))}`;
    const gwRes = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!gwRes.ok) {
      return NextResponse.json(
        {
          status: "GATEWAY_ERROR",
          symbol: cleanSym,
          message: `Market data gateway returned HTTP ${gwRes.status}.`,
        },
        { status: 502 }
      );
    }

    const data = await gwRes.json();
    const quotes = data.quotes || {};

    // Find matching quote (direct or alias)
    let foundQuote: any = quotes[cleanSym];
    if (!foundQuote) {
      for (const alias of symbolsToQuery) {
        if (quotes[alias]) {
          foundQuote = quotes[alias];
          break;
        }
      }
    }

    if (!foundQuote || !foundQuote.last_price || foundQuote.last_price <= 0) {
      return NextResponse.json(
        {
          status: "NOT_FOUND",
          symbol: cleanSym,
          resolvedInstrument: inst || null,
          message: `No active market data quote available for symbol '${cleanSym}'.`,
        },
        { status: 404 }
      );
    }

    const quote: NormalizedQuote = {
      symbol: cleanSym,
      exchange: foundQuote.exchange || "NSE_EQ",
      provider: foundQuote.provider || "dhan",
      last_price: Number(foundQuote.last_price),
      bid: Number(foundQuote.bid ?? foundQuote.last_price),
      ask: Number(foundQuote.ask ?? foundQuote.last_price),
      volume: Number(foundQuote.volume ?? 0),
      high: foundQuote.high != null ? Number(foundQuote.high) : null,
      low: foundQuote.low != null ? Number(foundQuote.low) : null,
      open: foundQuote.open != null ? Number(foundQuote.open) : null,
      close: foundQuote.close != null ? Number(foundQuote.close) : null,
      change_pct: foundQuote.change_pct != null ? Number(foundQuote.change_pct) : null,
      vwap: foundQuote.vwap != null ? Number(foundQuote.vwap) : null,
      open_interest: foundQuote.oi != null ? Number(foundQuote.oi) : undefined,
      event_timestamp: foundQuote.event_timestamp || new Date().toISOString(),
      received_timestamp: foundQuote.received_timestamp || new Date().toISOString(),
      feed_latency_ms: Number(foundQuote.feed_latency_ms ?? 0),
      data_mode: foundQuote.data_mode || "REAL_TIME",
      is_stale: Boolean(foundQuote.is_stale),
      age_seconds: Number(foundQuote.age_seconds ?? 0),
      freshness_status: foundQuote.is_stale ? "STALE" : "LIVE",
    };

    return NextResponse.json({
      status: "SUCCESS",
      symbol: cleanSym,
      quote,
      instrument: inst || null,
      source: (foundQuote.provider || "GATEWAY").toUpperCase(),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return NextResponse.json(
        {
          status: "GATEWAY_TIMEOUT",
          symbol: cleanSym,
          message: "Market data gateway request timed out after 3000ms.",
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        status: "GATEWAY_UNAVAILABLE",
        symbol: cleanSym,
        message: `Market data gateway is unreachable at ${GATEWAY_HTTP_URL}: ${err.message}`,
      },
      { status: 503 }
    );
  }
}
