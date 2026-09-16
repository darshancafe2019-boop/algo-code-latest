import { NextRequest, NextResponse } from "next/server";
import { instrumentMaster } from "@/lib/market-data/instrument-master";
import { NormalizedQuote, BrokerProvider } from "@/lib/market-data/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GATEWAY_HTTP_URL =
  process.env.MARKET_DATA_GATEWAY_HTTP_URL ||
  process.env.MARKET_GATEWAY_URL ||
  "http://127.0.0.1:5051";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawSymbol = searchParams.get("symbol");

    if (!rawSymbol || !rawSymbol.trim()) {
      return NextResponse.json(
        {
          status: "INVALID_REQUEST",
          error: "SYMBOL_REQUIRED",
          message: "Query parameter 'symbol' is required.",
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const cleanSym = rawSymbol.trim().toUpperCase();

    // 1. Safe instrument metadata resolution (never crash the route)
    let safeInst: {
      symbol: string;
      tradingSymbol?: string;
      securityId?: string;
      exchange?: string;
      provider?: string;
      instrumentType?: string;
      lotSize?: number;
      tickSize?: number;
    } | null = null;

    try {
      const rawInst = instrumentMaster.resolve(cleanSym);
      if (rawInst) {
        safeInst = {
          symbol: String(rawInst.symbol || cleanSym),
          tradingSymbol: rawInst.tradingSymbol ? String(rawInst.tradingSymbol) : undefined,
          securityId: rawInst.securityId ? String(rawInst.securityId) : undefined,
          exchange: (rawInst as any).exchange || (rawInst as any).exchangeSegment || "NSE_EQ",
          provider: rawInst.provider ? String(rawInst.provider) : undefined,
          instrumentType: rawInst.instrumentType ? String(rawInst.instrumentType) : undefined,
          lotSize: typeof rawInst.lotSize === "number" ? rawInst.lotSize : undefined,
          tickSize: typeof rawInst.tickSize === "number" ? rawInst.tickSize : undefined,
        };
      }
    } catch (err: any) {
      console.warn(`[API:quote] Instrument lookup safely bypassed for '${cleanSym}':`, err?.message || err);
      safeInst = null;
    }

    // 2. Query authoritative Python Market Data Gateway snapshot
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
            resolvedInstrument: safeInst,
            message: `Market data gateway returned HTTP ${gwRes.status}.`,
            timestamp: new Date().toISOString(),
          },
          { status: 502 }
        );
      }

      const data = await gwRes.json();
      const quotes = data.quotes || {};

      // Match quote from direct symbol or aliases
      let foundQuote: any = quotes[cleanSym];
      if (!foundQuote) {
        for (const alias of symbolsToQuery) {
          if (quotes[alias]) {
            foundQuote = quotes[alias];
            break;
          }
        }
      }

      if (foundQuote && foundQuote.status === "DATA_SOURCE_NOT_CONFIGURED") {
        return NextResponse.json(
          {
            status: "DATA_SOURCE_NOT_CONFIGURED",
            symbol: cleanSym,
            resolvedInstrument: safeInst,
            quote: null,
            message: foundQuote.message || "Set TWELVE_DATA_API_KEY or POLYGON_API_KEY in .env to activate US market data.",
            timestamp: new Date().toISOString(),
          },
          { status: 200 }
        );
      }

      // Handle missing quote for US stocks
      if (["AAPL", "NVDA", "TSLA"].includes(cleanSym) && (!foundQuote || !foundQuote.last_price || Number(foundQuote.last_price) <= 0)) {
        return NextResponse.json(
          {
            status: "DATA_SOURCE_NOT_CONFIGURED",
            symbol: cleanSym,
            resolvedInstrument: safeInst,
            quote: null,
            message: "Set TWELVE_DATA_API_KEY or POLYGON_API_KEY in .env to activate US market data.",
            timestamp: new Date().toISOString(),
          },
          { status: 200 }
        );
      }

      // Handle missing quote (e.g., market closed, no active tick)
      if (!foundQuote || foundQuote.last_price === undefined || foundQuote.last_price === null || Number(foundQuote.last_price) <= 0) {
        return NextResponse.json(
          {
            status: "NOT_FOUND",
            symbol: cleanSym,
            resolvedInstrument: safeInst,
            message: `No authoritative quote currently available for symbol '${cleanSym}'.`,
            marketStatus: "MARKET_CLOSED_OR_NO_TICK",
            timestamp: new Date().toISOString(),
          },
          { status: 404 }
        );
      }

      const quote: NormalizedQuote = {
        symbol: cleanSym,
        exchange: String(foundQuote.exchange || "NSE_EQ"),
        provider: (foundQuote.provider || "dhan") as BrokerProvider,
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
        event_timestamp: String(foundQuote.event_timestamp || new Date().toISOString()),
        received_timestamp: String(foundQuote.received_timestamp || new Date().toISOString()),
        feed_latency_ms: Number(foundQuote.feed_latency_ms ?? 0),
        data_mode: (foundQuote.data_mode || "REAL_TIME") as "DELAYED" | "REAL_TIME" | "EOD" | "CACHED",
        is_stale: Boolean(foundQuote.is_stale),
        age_seconds: Number(foundQuote.age_seconds ?? 0),
        freshness_status: foundQuote.is_stale ? "STALE" : "LIVE",
      };

      return NextResponse.json({
        status: "SUCCESS",
        symbol: cleanSym,
        quote,
        instrument: safeInst,
        source: String(foundQuote.provider || "GATEWAY").toUpperCase(),
        timestamp: new Date().toISOString(),
      });
    } catch (fetchErr: any) {
      if (fetchErr.name === "TimeoutError" || fetchErr.name === "AbortError") {
        return NextResponse.json(
          {
            status: "GATEWAY_TIMEOUT",
            symbol: cleanSym,
            resolvedInstrument: safeInst,
            message: "Market data gateway request timed out after 3000ms.",
            timestamp: new Date().toISOString(),
          },
          { status: 504 }
        );
      }

      return NextResponse.json(
        {
          status: "GATEWAY_UNAVAILABLE",
          symbol: cleanSym,
          resolvedInstrument: safeInst,
          message: `Market data gateway is unreachable at ${GATEWAY_HTTP_URL}: ${fetchErr?.message || fetchErr}`,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }
  } catch (globalErr: any) {
    console.error("[API:quote] Unexpected runtime error:", globalErr);
    return NextResponse.json(
      {
        status: "INTERNAL_ERROR",
        message: String(globalErr?.message || "Internal server error processing quote request"),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
