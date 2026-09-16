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
      safeInst = null;
    }

    // 2. Build symbols list to query from Gateway (support aliases e.g. BTC -> BTC/USDT)
    const symbolsToQuery = [cleanSym];
    if (cleanSym === "BTC") symbolsToQuery.push("BTC/USDT", "BTCUSDT");
    if (cleanSym === "ETH") symbolsToQuery.push("ETH/USDT", "ETHUSDT");
    if (cleanSym === "SOL") symbolsToQuery.push("SOL/USDT", "SOLUSDT");
    if (cleanSym.includes("/")) {
      symbolsToQuery.push(cleanSym.replace("/", ""));
    }

    try {
      const url = `${GATEWAY_HTTP_URL}/snapshot?symbols=${encodeURIComponent(symbolsToQuery.join(","))}`;
      const gwRes = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(2500),
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
            message: foundQuote.message || "Set provider API keys in .env to activate.",
            timestamp: new Date().toISOString(),
          },
          { status: 200 }
        );
      }

      // 3. Truthful response for symbols with no active live quote (e.g. GOLD, unsupported symbols, closed market with no tick)
      // Do NOT return HTTP 404 for valid symbols without live provider feeds
      if (!foundQuote || foundQuote.last_price === undefined || foundQuote.last_price === null || Number(foundQuote.last_price) <= 0) {
        return NextResponse.json(
          {
            status: "UNAVAILABLE",
            symbol: cleanSym,
            reason: "NO_LIVE_PROVIDER",
            resolvedInstrument: safeInst,
            quote: null,
            message: `No active live feed currently available for symbol '${cleanSym}'.`,
            marketStatus: "NO_LIVE_FEED",
            timestamp: new Date().toISOString(),
          },
          { status: 200 }
        );
      }

      const lastPrice = Number(foundQuote.last_price);
      const closePrice = foundQuote.close != null ? Number(foundQuote.close) : (foundQuote.previous_close != null ? Number(foundQuote.previous_close) : null);
      const changeVal = foundQuote.change_val != null ? Number(foundQuote.change_val) : (foundQuote.change != null ? Number(foundQuote.change) : (closePrice ? (lastPrice - closePrice) : 0));
      const changePct = foundQuote.change_pct != null ? Number(foundQuote.change_pct) : 0;
      const isMarketClosed = foundQuote.status === "MARKET_CLOSED";
      const isLive = !foundQuote.is_stale && foundQuote.status === "LIVE";

      // Normalized quote conforming to Quant.OS canonical contract
      const normalizedQuote: NormalizedQuote = {
        symbol: cleanSym,
        exchange: String(foundQuote.exchange || safeInst?.exchange || "NSE_EQ"),
        provider: (foundQuote.provider || safeInst?.provider || "dhan") as BrokerProvider,
        last_price: lastPrice,
        bid: Number(foundQuote.bid ?? foundQuote.bid_price ?? lastPrice),
        ask: Number(foundQuote.ask ?? foundQuote.ask_price ?? lastPrice),
        volume: Number(foundQuote.volume ?? 0),
        high: foundQuote.high != null ? Number(foundQuote.high) : null,
        low: foundQuote.low != null ? Number(foundQuote.low) : null,
        open: foundQuote.open != null ? Number(foundQuote.open) : null,
        close: closePrice,
        change_pct: changePct,
        vwap: foundQuote.vwap != null ? Number(foundQuote.vwap) : null,
        open_interest: foundQuote.oi != null ? Number(foundQuote.oi) : undefined,
        event_timestamp: String(foundQuote.event_timestamp || foundQuote.event_time || new Date().toISOString()),
        received_timestamp: String(foundQuote.received_timestamp || foundQuote.received_at || new Date().toISOString()),
        feed_latency_ms: Number(foundQuote.feed_latency_ms ?? foundQuote.latency_ms ?? 0),
        data_mode: (foundQuote.data_mode || "REAL_TIME") as "DELAYED" | "REAL_TIME" | "EOD" | "CACHED",
        is_stale: Boolean(foundQuote.is_stale),
        age_seconds: Number(foundQuote.age_seconds ?? 0),
        freshness_status: isLive ? "LIVE" : "STALE",
      };

      return NextResponse.json({
        status: "success",
        symbol: cleanSym,
        quote: {
          ...normalizedQuote,
          ltp: lastPrice,
          previousClose: closePrice,
          change: changeVal,
          changePercent: changePct,
          volume: normalizedQuote.volume,
          lastTradeTime: normalizedQuote.event_timestamp,
          receivedAt: normalizedQuote.received_timestamp,
          marketSession: isMarketClosed ? "CLOSED" : "OPEN",
          priceState: isMarketClosed ? "LAST_TRADED" : (isLive ? "LIVE" : "LAST_TRADED"),
          isLive,
          instrumentKey: safeInst?.securityId ? `${safeInst.exchange || "NSE_EQ"}|${safeInst.securityId}` : cleanSym,
        },
        instrument: safeInst,
        source: String(foundQuote.provider || "GATEWAY").toUpperCase(),
        timestamp: new Date().toISOString(),
      }, { status: 200 });

    } catch (fetchErr: any) {
      // In case Gateway is temporarily unreachable, respond with UNAVAILABLE instead of 404
      return NextResponse.json(
        {
          status: "UNAVAILABLE",
          symbol: cleanSym,
          reason: "GATEWAY_UNAVAILABLE",
          resolvedInstrument: safeInst,
          quote: null,
          message: `Market data gateway is currently offline: ${fetchErr?.message || fetchErr}`,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
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
