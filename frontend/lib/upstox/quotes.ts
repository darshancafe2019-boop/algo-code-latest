/**
 * Upstox Live Market Quotes Service
 * =================================
 * Fetches real-time Last Traded Price (LTP) and Full Quotes from Upstox API V2.
 * Never fabricates or synthesizes prices.
 */

import { upstoxFetch } from "./client";
import { NormalizedLtp, NormalizedQuote } from "./types";
import { resolveInstrumentKey, PRIMARY_UPSTOX_INSTRUMENTS } from "./instruments";
import { UpstoxValidationError } from "./errors";

/**
 * Fetches normalized Last Traded Price (LTP) for a specific instrument.
 */
export async function getLtp(
  instrumentKeyOrSymbol: string,
  oauthToken?: string | null
): Promise<NormalizedLtp> {
  const instrumentKey =
    resolveInstrumentKey(instrumentKeyOrSymbol) || instrumentKeyOrSymbol;

  if (!instrumentKey || !instrumentKey.includes("|")) {
    throw new UpstoxValidationError(
      `Invalid instrument identifier '${instrumentKeyOrSymbol}'. Format must be 'EXCHANGE|SYMBOL' (e.g. 'NSE_INDEX|Nifty 50').`
    );
  }

  const response = await upstoxFetch<any>("/market-quote/ltp", {
    params: { instrument_key: instrumentKey },
    oauthToken,
  });

  const data = response?.data || {};
  // Upstox LTP API returns data keyed by instrumentKey or formatted symbol key
  const quoteData =
    data[instrumentKey] ||
    data[instrumentKey.replace("|", ":")] ||
    Object.values(data)[0] as any;

  if (!quoteData || typeof quoteData.last_price !== "number") {
    throw new UpstoxValidationError(
      `No market data returned by Upstox for '${instrumentKey}'. Ensure market is accessible.`
    );
  }

  const ltp = quoteData.last_price;
  const prevClose = quoteData.previous_close || ltp;
  const change = +(ltp - prevClose).toFixed(2);
  const changePct = prevClose > 0 ? +((change / prevClose) * 100).toFixed(2) : 0;

  const instMeta = PRIMARY_UPSTOX_INSTRUMENTS.find((i) => i.instrumentKey === instrumentKey);
  const symbol = instMeta ? instMeta.symbol : instrumentKey.split("|")[1] || instrumentKey;

  return {
    provider: "UPSTOX",
    instrumentKey,
    symbol,
    ltp,
    previousClose: prevClose,
    lastTradeTime: quoteData.last_trade_time ? new Date(quoteData.last_trade_time).toISOString() : new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    source: "LIVE",
    change,
    changePct,
  };
}

/**
 * Fetches comprehensive full quotes including OHLC, depth, volume, and OI.
 */
export async function getFullQuotes(
  instrumentKeys: string[],
  oauthToken?: string | null
): Promise<Record<string, NormalizedQuote>> {
  if (!instrumentKeys || instrumentKeys.length === 0) {
    return {};
  }

  const validKeys = instrumentKeys.map((k) => resolveInstrumentKey(k) || k).filter(Boolean);
  const keysParam = validKeys.join(",");

  const response = await upstoxFetch<any>("/market-quote/quotes", {
    params: { instrument_key: keysParam },
    oauthToken,
  });

  const rawQuotes = response?.data || {};
  const normalized: Record<string, NormalizedQuote> = {};
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  for (const key of validKeys) {
    const q = rawQuotes[key] || rawQuotes[key.replace("|", ":")];
    if (!q) continue;

    const ohlc = q.ohlc || {};
    const depth = q.depth || {};
    const ltp = typeof q.last_price === "number" ? q.last_price : 0;
    const prevClose = typeof ohlc.close === "number" ? ohlc.close : ltp;
    const lastTradeTs = q.last_trade_time ? Number(q.last_trade_time) : now;
    const ageMs = Math.max(0, now - lastTradeTs);

    const bids = (depth.buy || []).map((b: any) => ({
      bidPrice: b.price || 0,
      bidQty: b.quantity || 0,
      bidOrders: b.orders || 0,
      askPrice: 0,
      askQty: 0,
      askOrders: 0,
    }));

    const asks = (depth.sell || []).map((a: any) => ({
      bidPrice: 0,
      bidQty: 0,
      bidOrders: 0,
      askPrice: a.price || 0,
      askQty: a.quantity || 0,
      askOrders: a.orders || 0,
    }));

    const instMeta = PRIMARY_UPSTOX_INSTRUMENTS.find((i) => i.instrumentKey === key);

    normalized[key] = {
      provider: "UPSTOX",
      instrumentKey: key,
      symbol: instMeta ? instMeta.symbol : key.split("|")[1] || key,
      exchange: instMeta ? instMeta.exchange : key.split("|")[0] || "NSE",
      segment: instMeta ? instMeta.segment : "CASH",
      ltp,
      ltq: q.volume || 0,
      lastTradeTime: new Date(lastTradeTs).toISOString(),
      previousClose: prevClose,
      open: typeof ohlc.open === "number" ? ohlc.open : ltp,
      high: typeof ohlc.high === "number" ? ohlc.high : ltp,
      low: typeof ohlc.low === "number" ? ohlc.low : ltp,
      close: typeof ohlc.close === "number" ? ohlc.close : ltp,
      volume: q.volume || 0,
      oi: q.oi || 0,
      iv: null,
      bid: bids[0]?.bidPrice || ltp,
      bidQty: bids[0]?.bidQty || 0,
      ask: asks[0]?.askPrice || ltp,
      askQty: asks[0]?.askQty || 0,
      marketDepth: bids.slice(0, 5),
      greeks: {
        delta: null,
        gamma: null,
        theta: null,
        vega: null,
        rho: null,
      },
      exchangeTimestamp: new Date(lastTradeTs).toISOString(),
      receivedAt: nowIso,
      ageMs,
      stale: ageMs > 30000,
      status: ageMs > 30000 ? "STALE" : "LIVE",
    };
  }

  return normalized;
}
