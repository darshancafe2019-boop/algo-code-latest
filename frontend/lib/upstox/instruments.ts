/**
 * Upstox Instrument Master, Taxonomy, & Dynamic Search Engine
 * ============================================================
 * Resolves symbols to authoritative Upstox instrument_keys and provides
 * fast deduplicated search across Equities, Indices, Futures, and Options.
 *
 * Strict Taxonomy Separation:
 * - STOCKS: instrument_type == "EQUITY" | segment == "NSE_EQ" | "BSE_EQ"
 * - FUTURES: instrument_type == "FUT" | segment == "NSE_FO" | "MCX_FO"
 * - OPTIONS: instrument_type == "CE" | "PE"
 * - INDICES: instrument_type == "INDEX" | segment == "NSE_INDEX"
 */

import { UpstoxInstrument } from "./types";
import { upstoxFetch } from "./client";

export type InstrumentCategory = "ALL" | "STOCKS" | "FUTURES" | "OPTIONS" | "INDICES";

export const PRIMARY_UPSTOX_INSTRUMENTS: UpstoxInstrument[] = [
  // Indices
  {
    instrumentKey: "NSE_INDEX|Nifty 50",
    exchange: "NSE_INDEX",
    segment: "INDEX",
    symbol: "NIFTY 50",
    tradingSymbol: "NIFTY",
    name: "NIFTY 50",
    isin: "NIFTY50",
    instrumentType: "INDEX",
    lotSize: 25,
    tickSize: 0.05,
  },
  {
    instrumentKey: "NSE_INDEX|Nifty Bank",
    exchange: "NSE_INDEX",
    segment: "INDEX",
    symbol: "BANKNIFTY",
    tradingSymbol: "BANKNIFTY",
    name: "NIFTY BANK",
    isin: "NIFTYBANK",
    instrumentType: "INDEX",
    lotSize: 15,
    tickSize: 0.05,
  },
  {
    instrumentKey: "NSE_INDEX|India VIX",
    exchange: "NSE_INDEX",
    segment: "INDEX",
    symbol: "INDIA VIX",
    tradingSymbol: "INDIA VIX",
    name: "INDIA VIX",
    isin: "INDIAVIX",
    instrumentType: "INDEX",
    lotSize: 1,
    tickSize: 0.01,
  },
  {
    instrumentKey: "NSE_INDEX|Nifty Fin Service",
    exchange: "NSE_INDEX",
    segment: "INDEX",
    symbol: "FINNIFTY",
    tradingSymbol: "FINNIFTY",
    name: "NIFTY FINANCIAL SERVICES",
    isin: "FINNIFTY",
    instrumentType: "INDEX",
    lotSize: 25,
    tickSize: 0.05,
  },
  {
    instrumentKey: "NSE_INDEX|NIFTY MID SELECT",
    exchange: "NSE_INDEX",
    segment: "INDEX",
    symbol: "MIDCPNIFTY",
    tradingSymbol: "MIDCPNIFTY",
    name: "NIFTY MIDCAP SELECT",
    isin: "MIDCPNIFTY",
    instrumentType: "INDEX",
    lotSize: 50,
    tickSize: 0.05,
  },

  // High-Liquidity Equities (Cash Stocks)
  {
    instrumentKey: "NSE_EQ|INE002A01018",
    exchange: "NSE_EQ",
    segment: "CASH",
    symbol: "RELIANCE",
    tradingSymbol: "RELIANCE",
    name: "Reliance Industries Limited",
    isin: "INE002A01018",
    instrumentType: "EQUITY",
    lotSize: 1,
    tickSize: 0.05,
  },
  {
    instrumentKey: "NSE_EQ|INE040A01034",
    exchange: "NSE_EQ",
    segment: "CASH",
    symbol: "HDFCBANK",
    tradingSymbol: "HDFCBANK",
    name: "HDFC Bank Limited",
    isin: "INE040A01034",
    instrumentType: "EQUITY",
    lotSize: 1,
    tickSize: 0.05,
  },
  {
    instrumentKey: "NSE_EQ|INE090A01021",
    exchange: "NSE_EQ",
    segment: "CASH",
    symbol: "ICICIBANK",
    tradingSymbol: "ICICIBANK",
    name: "ICICI Bank Limited",
    isin: "INE090A01021",
    instrumentType: "EQUITY",
    lotSize: 1,
    tickSize: 0.05,
  },
  {
    instrumentKey: "NSE_EQ|INE009A01021",
    exchange: "NSE_EQ",
    segment: "CASH",
    symbol: "INFY",
    tradingSymbol: "INFY",
    name: "Infosys Limited",
    isin: "INE009A01021",
    instrumentType: "EQUITY",
    lotSize: 1,
    tickSize: 0.05,
  },
  {
    instrumentKey: "NSE_EQ|INE467B01029",
    exchange: "NSE_EQ",
    segment: "CASH",
    symbol: "TCS",
    tradingSymbol: "TCS",
    name: "Tata Consultancy Services Limited",
    isin: "INE467B01029",
    instrumentType: "EQUITY",
    lotSize: 1,
    tickSize: 0.05,
  },
  {
    instrumentKey: "NSE_EQ|INE062A01020",
    exchange: "NSE_EQ",
    segment: "CASH",
    symbol: "SBIN",
    tradingSymbol: "SBIN",
    name: "State Bank of India",
    isin: "INE062A01020",
    instrumentType: "EQUITY",
    lotSize: 1,
    tickSize: 0.05,
  },
  {
    instrumentKey: "NSE_EQ|INE397D01024",
    exchange: "NSE_EQ",
    segment: "CASH",
    symbol: "BHARTIARTL",
    tradingSymbol: "BHARTIARTL",
    name: "Bharti Airtel Limited",
    isin: "INE397D01024",
    instrumentType: "EQUITY",
    lotSize: 1,
    tickSize: 0.05,
  },
  {
    instrumentKey: "NSE_EQ|INE237A01028",
    exchange: "NSE_EQ",
    segment: "CASH",
    symbol: "KOTAKBANK",
    tradingSymbol: "KOTAKBANK",
    name: "Kotak Mahindra Bank Limited",
    isin: "INE237A01028",
    instrumentType: "EQUITY",
    lotSize: 1,
    tickSize: 0.05,
  },
  {
    instrumentKey: "NSE_EQ|INE018A01030",
    exchange: "NSE_EQ",
    segment: "CASH",
    symbol: "LT",
    tradingSymbol: "LT",
    name: "Larsen & Toubro Limited",
    isin: "INE018A01030",
    instrumentType: "EQUITY",
    lotSize: 1,
    tickSize: 0.05,
  },
  {
    instrumentKey: "NSE_EQ|INE238A01034",
    exchange: "NSE_EQ",
    segment: "CASH",
    symbol: "AXISBANK",
    tradingSymbol: "AXISBANK",
    name: "Axis Bank Limited",
    isin: "INE238A01034",
    instrumentType: "EQUITY",
    lotSize: 1,
    tickSize: 0.05,
  },

  // Active Futures Contracts
  {
    instrumentKey: "NSE_FO|NIFTY24AUGFUT",
    exchange: "NSE_FO",
    segment: "FUTURES",
    symbol: "NIFTY FUT",
    tradingSymbol: "NIFTY 24AUG FUT",
    name: "NIFTY 50 Futures",
    instrumentType: "FUT",
    underlyingKey: "NSE_INDEX|Nifty 50",
    underlyingSymbol: "NIFTY",
    expiry: "2026-08-27",
    lotSize: 25,
    tickSize: 0.05,
  },
  {
    instrumentKey: "NSE_FO|BANKNIFTY24AUGFUT",
    exchange: "NSE_FO",
    segment: "FUTURES",
    symbol: "BANKNIFTY FUT",
    tradingSymbol: "BANKNIFTY 24AUG FUT",
    name: "NIFTY BANK Futures",
    instrumentType: "FUT",
    underlyingKey: "NSE_INDEX|Nifty Bank",
    underlyingSymbol: "BANKNIFTY",
    expiry: "2026-08-27",
    lotSize: 15,
    tickSize: 0.05,
  },
  {
    instrumentKey: "NSE_FO|RELIANCE24AUGFUT",
    exchange: "NSE_FO",
    segment: "FUTURES",
    symbol: "RELIANCE FUT",
    tradingSymbol: "RELIANCE 24AUG FUT",
    name: "Reliance Industries Futures",
    instrumentType: "FUT",
    underlyingKey: "NSE_EQ|INE002A01018",
    underlyingSymbol: "RELIANCE",
    expiry: "2026-08-27",
    lotSize: 250,
    tickSize: 0.05,
  },

  // Active Options Contracts
  {
    instrumentKey: "NSE_FO|NIFTY24AUG24500CE",
    exchange: "NSE_FO",
    segment: "OPTIONS",
    symbol: "NIFTY 24500 CE",
    tradingSymbol: "NIFTY 24AUG 24500 CE",
    name: "NIFTY 24500 Call Option",
    instrumentType: "CE",
    underlyingKey: "NSE_INDEX|Nifty 50",
    underlyingSymbol: "NIFTY",
    expiry: "2026-08-27",
    strikePrice: 24500,
    optionType: "CE",
    lotSize: 25,
    tickSize: 0.05,
  },
  {
    instrumentKey: "NSE_FO|NIFTY24AUG24500PE",
    exchange: "NSE_FO",
    segment: "OPTIONS",
    symbol: "NIFTY 24500 PE",
    tradingSymbol: "NIFTY 24AUG 24500 PE",
    name: "NIFTY 24500 Put Option",
    instrumentType: "PE",
    underlyingKey: "NSE_INDEX|Nifty 50",
    underlyingSymbol: "NIFTY",
    expiry: "2026-08-27",
    strikePrice: 24500,
    optionType: "PE",
    lotSize: 25,
    tickSize: 0.05,
  },
];

/**
 * Resolves a symbol, name, or ISIN to its canonical Upstox instrument_key.
 */
export function resolveInstrumentKey(input: string): string | null {
  if (!input || !input.trim()) return null;
  const clean = input.trim();

  // If already formatted like NSE_INDEX|... or NSE_EQ|... or NSE_FO|...
  if (clean.includes("|") && (clean.startsWith("NSE_") || clean.startsWith("BSE_") || clean.startsWith("MCX_"))) {
    return clean;
  }

  const normalized = clean.toUpperCase().replace(/\s+/g, " ");

  const match = PRIMARY_UPSTOX_INSTRUMENTS.find(
    (inst) =>
      inst.symbol.toUpperCase() === normalized ||
      inst.tradingSymbol.toUpperCase() === normalized ||
      inst.name.toUpperCase() === normalized ||
      inst.isin?.toUpperCase() === normalized ||
      inst.instrumentKey.toUpperCase() === normalized
  );

  return match ? match.instrumentKey : null;
}

/**
 * Searches the instrument master with strict category filtering.
 */
export function searchInstruments(
  query: string,
  limit: number = 20,
  category: InstrumentCategory = "ALL"
): UpstoxInstrument[] {
  let pool = PRIMARY_UPSTOX_INSTRUMENTS;

  // Apply strict category filtering
  if (category === "STOCKS") {
    pool = pool.filter((i) => i.instrumentType === "EQUITY" || i.exchange === "NSE_EQ" || i.exchange === "BSE_EQ");
  } else if (category === "FUTURES") {
    pool = pool.filter((i) => i.instrumentType === "FUT" || i.segment === "FUTURES");
  } else if (category === "OPTIONS") {
    pool = pool.filter((i) => i.instrumentType === "CE" || i.instrumentType === "PE" || i.segment === "OPTIONS");
  } else if (category === "INDICES") {
    pool = pool.filter((i) => i.instrumentType === "INDEX" || i.exchange === "NSE_INDEX");
  }

  if (!query || !query.trim()) {
    return pool.slice(0, limit);
  }

  const q = query.trim().toUpperCase();
  const results = pool.filter(
    (inst) =>
      inst.symbol.toUpperCase().includes(q) ||
      inst.tradingSymbol.toUpperCase().includes(q) ||
      inst.name.toUpperCase().includes(q) ||
      inst.isin?.toUpperCase().includes(q) ||
      inst.instrumentKey.toUpperCase().includes(q)
  );

  return results.slice(0, limit);
}

/**
 * Online Search directly via Upstox API V2 /instruments/search
 */
export async function searchOnlineUpstoxInstruments(
  query: string,
  limit: number = 20,
  category: InstrumentCategory = "ALL",
  oauthToken?: string | null
): Promise<UpstoxInstrument[]> {
  try {
    const res = await upstoxFetch<{ status: string; data: any[] }>("instruments/search", {
      apiVersion: "v2",
      params: { query },
      oauthToken,
    });

    if (res?.data && Array.isArray(res.data)) {
      const normalized: UpstoxInstrument[] = res.data.map((item) => ({
        instrumentKey: item.instrument_key || item.instrumentKey,
        exchange: item.exchange,
        segment: item.segment,
        symbol: item.trading_symbol || item.symbol,
        tradingSymbol: item.trading_symbol,
        name: item.name || item.trading_symbol,
        isin: item.isin,
        instrumentType: item.instrument_type,
        lotSize: Number(item.lot_size) || 1,
        tickSize: Number(item.tick_size) || 0.05,
        expiry: item.expiry,
        strikePrice: item.strike_price,
        optionType: item.option_type,
        underlyingKey: item.underlying_key,
        underlyingSymbol: item.underlying_symbol,
      }));

      return searchInstruments(query, limit, category).concat(
        normalized.filter(
          (n) => !PRIMARY_UPSTOX_INSTRUMENTS.some((p) => p.instrumentKey === n.instrumentKey)
        )
      ).slice(0, limit);
    }
  } catch {
    // Fall back to local instrument master
  }

  return searchInstruments(query, limit, category);
}
