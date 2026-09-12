/**
 * Centralized Live Market Data Engine - Authoritative Instrument Master & Resolver
 * Provides comprehensive resolution across Indian Indices, Equities, Futures, and Option strikes.
 */

import { InstrumentMasterRecord, ExchangeSegment, BrokerProvider } from "./types";

export interface ResolvedInstrument {
  symbol: string;
  tradingSymbol: string;
  securityId: string;
  exchangeSegment: ExchangeSegment;
  instrumentType: "INDEX" | "EQUITY" | "FUTURES" | "OPTION_CE" | "OPTION_PE" | "CRYPTO_PERP";
  lotSize: number;
  tickSize: number;
  underlying?: string;
  strike?: number;
  expiry?: string;
  optionType?: "CE" | "PE";
  provider: BrokerProvider;
  status: "RESOLVED" | "INSTRUMENT_NOT_FOUND";
}

class InstrumentMaster {
  private static instance: InstrumentMaster | null = null;
  private bySymbol: Map<string, InstrumentMasterRecord> = new Map();
  private bySecurityId: Map<string, InstrumentMasterRecord> = new Map();

  private constructor() {
    this.seedCanonicalInstruments();
  }

  public static getInstance(): InstrumentMaster {
    if (!InstrumentMaster.instance) {
      InstrumentMaster.instance = new InstrumentMaster();
    }
    return InstrumentMaster.instance;
  }

  private seedCanonicalInstruments() {
    const seeds: InstrumentMasterRecord[] = [
      // ── NSE Indices ────────────────────────────────────────────────────────
      {
        symbol: "NIFTY",
        tradingSymbol: "NIFTY 50",
        securityId: "13",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "INDEX",
        lotSize: 25,
        tickSize: 0.05,
      },
      {
        symbol: "NIFTY 50",
        tradingSymbol: "NIFTY 50",
        securityId: "13",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "INDEX",
        lotSize: 25,
        tickSize: 0.05,
      },
      {
        symbol: "BANKNIFTY",
        tradingSymbol: "NIFTY BANK",
        securityId: "25",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "INDEX",
        lotSize: 15,
        tickSize: 0.05,
      },
      {
        symbol: "NIFTY BANK",
        tradingSymbol: "NIFTY BANK",
        securityId: "25",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "INDEX",
        lotSize: 15,
        tickSize: 0.05,
      },
      {
        symbol: "FINNIFTY",
        tradingSymbol: "NIFTY FIN SERVICE",
        securityId: "27",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "INDEX",
        lotSize: 25,
        tickSize: 0.05,
      },
      {
        symbol: "MIDCPNIFTY",
        tradingSymbol: "NIFTY MID SELECT",
        securityId: "28",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "INDEX",
        lotSize: 50,
        tickSize: 0.05,
      },
      {
        symbol: "SENSEX",
        tradingSymbol: "BSE SENSEX",
        securityId: "51",
        exchange: "BSE_EQ",
        provider: "dhan",
        instrumentType: "INDEX",
        lotSize: 10,
        tickSize: 0.05,
      },
      {
        symbol: "INDIA_VIX",
        tradingSymbol: "INDIA VIX",
        securityId: "24",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "INDEX",
        lotSize: 1,
        tickSize: 0.01,
      },
      {
        symbol: "INDIAVIX",
        tradingSymbol: "INDIA VIX",
        securityId: "24",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "INDEX",
        lotSize: 1,
        tickSize: 0.01,
      },

      // ── NSE Heavyweight Equities ───────────────────────────────────────────
      {
        symbol: "RELIANCE",
        tradingSymbol: "RELIANCE-EQ",
        securityId: "2885",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "HDFCBANK",
        tradingSymbol: "HDFCBANK-EQ",
        securityId: "1333",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "ICICIBANK",
        tradingSymbol: "ICICIBANK-EQ",
        securityId: "4963",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "TCS",
        tradingSymbol: "TCS-EQ",
        securityId: "11536",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "INFY",
        tradingSymbol: "INFY-EQ",
        securityId: "1594",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "SBIN",
        tradingSymbol: "SBIN-EQ",
        securityId: "3045",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "BHARTIARTL",
        tradingSymbol: "BHARTIARTL-EQ",
        securityId: "10604",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "KOTAKBANK",
        tradingSymbol: "KOTAKBANK-EQ",
        securityId: "1922",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "LT",
        tradingSymbol: "LT-EQ",
        securityId: "11483",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "AXISBANK",
        tradingSymbol: "AXISBANK-EQ",
        securityId: "5900",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "TATAMOTORS",
        tradingSymbol: "TATAMOTORS-EQ",
        securityId: "3456",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "ITC",
        tradingSymbol: "ITC-EQ",
        securityId: "1660",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "HINDUNILVR",
        tradingSymbol: "HINDUNILVR-EQ",
        securityId: "1394",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "BAJFINANCE",
        tradingSymbol: "BAJFINANCE-EQ",
        securityId: "317",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "MARUTI",
        tradingSymbol: "MARUTI-EQ",
        securityId: "10999",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "SUNPHARMA",
        tradingSymbol: "SUNPHARMA-EQ",
        securityId: "3351",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "TITAN",
        tradingSymbol: "TITAN-EQ",
        securityId: "3506",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "TATASTEEL",
        tradingSymbol: "TATASTEEL-EQ",
        securityId: "3499",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "WIPRO",
        tradingSymbol: "WIPRO-EQ",
        securityId: "3787",
        exchange: "NSE_EQ",
        provider: "dhan",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },

      // ── Delta Crypto Perps ──────────────────────────────────────────────────
      {
        symbol: "BTC",
        tradingSymbol: "BTCUSDT",
        securityId: "BTC-USDT-PERP",
        exchange: "DELTA_PERP",
        provider: "delta",
        instrumentType: "CRYPTO_PERP",
        lotSize: 1,
        tickSize: 0.1,
      },
      {
        symbol: "BTC/USDT",
        tradingSymbol: "BTCUSDT",
        securityId: "BTC-USDT-PERP",
        exchange: "DELTA_PERP",
        provider: "delta",
        instrumentType: "CRYPTO_PERP",
        lotSize: 1,
        tickSize: 0.1,
      },
      {
        symbol: "BTCUSDT",
        tradingSymbol: "BTCUSDT",
        securityId: "BTC-USDT-PERP",
        exchange: "DELTA_PERP",
        provider: "delta",
        instrumentType: "CRYPTO_PERP",
        lotSize: 1,
        tickSize: 0.1,
      },
      {
        symbol: "ETH",
        tradingSymbol: "ETHUSDT",
        securityId: "ETH-USDT-PERP",
        exchange: "DELTA_PERP",
        provider: "delta",
        instrumentType: "CRYPTO_PERP",
        lotSize: 1,
        tickSize: 0.01,
      },
      {
        symbol: "ETH/USDT",
        tradingSymbol: "ETHUSDT",
        securityId: "ETH-USDT-PERP",
        exchange: "DELTA_PERP",
        provider: "delta",
        instrumentType: "CRYPTO_PERP",
        lotSize: 1,
        tickSize: 0.01,
      },
      {
        symbol: "SOL/USDT",
        tradingSymbol: "SOLUSDT",
        securityId: "SOL-USDT-PERP",
        exchange: "DELTA_PERP",
        provider: "delta",
        instrumentType: "CRYPTO_PERP",
        lotSize: 1,
        tickSize: 0.01,
      },
      {
        symbol: "XRP/USDT",
        tradingSymbol: "XRPUSDT",
        securityId: "XRP-USDT-PERP",
        exchange: "DELTA_PERP",
        provider: "delta",
        instrumentType: "CRYPTO_PERP",
        lotSize: 1,
        tickSize: 0.0001,
      },
    ];

    for (const record of seeds) {
      this.register(record);
    }
  }

  public register(record: InstrumentMasterRecord): void {
    const symKey = record.symbol.toUpperCase();
    const secKey = `${record.exchange}:${record.securityId}`;

    this.bySymbol.set(symKey, record);
    if (!this.bySecurityId.has(secKey)) {
      this.bySecurityId.set(secKey, record);
    }
    if (!this.bySecurityId.has(record.securityId)) {
      this.bySecurityId.set(record.securityId, record);
    }
  }

  public resolve(symbol: string, exchange?: ExchangeSegment): InstrumentMasterRecord | undefined {
    const symKey = symbol.toUpperCase().trim();
    const found = this.bySymbol.get(symKey);
    if (found) return found;

    // Direct matches by tradingSymbol
    for (const rec of this.bySymbol.values()) {
      if (
        rec.tradingSymbol.toUpperCase() === symKey ||
        rec.symbol.toUpperCase() === symKey
      ) {
        if (!exchange || rec.exchange === exchange) {
          return rec;
        }
      }
    }
    return undefined;
  }

  public resolveBySecurityId(securityId: string, exchange?: ExchangeSegment): InstrumentMasterRecord | undefined {
    if (exchange) {
      const key = `${exchange}:${securityId}`;
      const found = this.bySecurityId.get(key);
      if (found) return found;
    }
    return this.bySecurityId.get(securityId);
  }

  public getAll(): InstrumentMasterRecord[] {
    return Array.from(this.bySymbol.values());
  }

  public getByProvider(provider: BrokerProvider): InstrumentMasterRecord[] {
    return Array.from(this.bySymbol.values()).filter((r) => r.provider === provider);
  }

  /**
   * Fast indexed search supporting tokenized queries, options (e.g. "NIFTY 25000 CE"),
   * futures, stocks, indices, crypto, forex, and commodities.
   */
  public search(query: string, category: string = "ALL", limit: number = 60): InstrumentMasterRecord[] {
    const q = query.trim().toUpperCase();
    const cat = category.toUpperCase();

    // If query is an option expression like "NIFTY 25000 CE", dynamically resolve and return it
    if (q) {
      const optionMatch = q.match(/^([A-Z]+)\s+(\d+)\s+(CE|PE)$/);
      if (optionMatch) {
        const underlying = optionMatch[1];
        const strike = parseInt(optionMatch[2], 10);
        const optType = optionMatch[3] as "CE" | "PE";
        const symbol = `${underlying} ${strike} ${optType}`;
        const secId = `OPT-${underlying}-${strike}-${optType}`;
        const dynRecord: InstrumentMasterRecord = {
          symbol,
          tradingSymbol: symbol,
          securityId: secId,
          exchange: "NSE_FNO",
          provider: "dhan",
          instrumentType: "OPTION",
          lotSize: underlying === "BANKNIFTY" ? 15 : underlying === "FINNIFTY" ? 25 : 25,
          tickSize: 0.05,
          underlying,
          strikePrice: strike,
          optionType: optType,
        };
        return [dynRecord];
      }
    }

    const allRecords = Array.from(this.bySymbol.values());

    // Filter by category
    const categoryFiltered = allRecords.filter((rec) => {
      if (cat === "ALL") return true;
      if (cat === "STOCKS" || cat === "EQUITIES") return rec.instrumentType === "EQUITY";
      if (cat === "INDICES") return rec.instrumentType === "INDEX";
      if (cat === "FUTURES") return rec.instrumentType === "FUTURES" || rec.symbol.includes("FUT");
      if (cat === "OPTIONS") return rec.instrumentType === "OPTION" || rec.optionType !== undefined;
      if (cat === "CRYPTO") return rec.instrumentType === "CRYPTO_PERP" || rec.exchange === "DELTA_PERP";
      if (cat === "COMMODITIES") return rec.exchange === "MCX_COMM" || rec.symbol.includes("GOLD") || rec.symbol.includes("SILVER") || rec.symbol.includes("CRUDE");
      if (cat === "FOREX") return rec.exchange === "NSE_CURR" || rec.exchange === "BSE_CURR" || rec.symbol.includes("INR") || rec.symbol.includes("USD");
      return true;
    });

    if (!q) {
      return categoryFiltered.slice(0, limit);
    }

    const queryTokens = q.split(/[\s\-_/]+/).filter(Boolean);

    // Score matches
    const scored = categoryFiltered.map((rec) => {
      const sym = rec.symbol.toUpperCase();
      const ts = rec.tradingSymbol.toUpperCase();
      const name = (rec.underlying || "").toUpperCase();

      let score = 0;
      if (sym === q || ts === q) score += 100;
      else if (sym.startsWith(q) || ts.startsWith(q)) score += 50;
      else if (sym.includes(q) || ts.includes(q)) score += 25;

      for (const token of queryTokens) {
        if (sym.includes(token)) score += 10;
        if (ts.includes(token)) score += 10;
        if (name.includes(token)) score += 5;
      }

      return { rec, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.rec);
  }
}

export const instrumentMaster = InstrumentMaster.getInstance();

/**
 * Authoritative InstrumentResolver for Phase 6
 * Dynamically resolves Indices, Equities, Futures, and Options contracts.
 */
export class InstrumentResolver {
  public static resolve(rawInput: string): ResolvedInstrument {
    if (!rawInput || typeof rawInput !== "string") {
      return {
        symbol: "",
        tradingSymbol: "",
        securityId: "",
        exchangeSegment: "NSE_EQ",
        instrumentType: "INDEX",
        lotSize: 1,
        tickSize: 0.05,
        provider: "dhan",
        status: "INSTRUMENT_NOT_FOUND",
      };
    }

    const input = rawInput.trim().toUpperCase();

    // 1. Direct match in canonical registry
    const registered = instrumentMaster.resolve(input);
    if (registered) {
      return {
        symbol: registered.symbol,
        tradingSymbol: registered.tradingSymbol,
        securityId: registered.securityId,
        exchangeSegment: registered.exchange,
        instrumentType: registered.instrumentType as any,
        lotSize: registered.lotSize,
        tickSize: registered.tickSize,
        underlying: registered.symbol,
        provider: registered.provider,
        status: "RESOLVED",
      };
    }

    // 2. Parse Options (e.g., "NIFTY 24500 CE", "NIFTY24SEP24500CE", "BANKNIFTY 52000 PE")
    const optionMatch = input.match(/^([A-Z]+)\s*(\d{1,2}[A-Z]{3}\d{2}|\d{2}[A-Z]{3})?\s*(\d+)\s*(CE|PE)$/i) ||
                        input.match(/^([A-Z]+)\s*(\d+)\s*(CE|PE)$/i);

    if (optionMatch) {
      const underlying = optionMatch[1];
      let expiry: string | undefined;
      let strike: number;
      let optionType: "CE" | "PE";

      if (optionMatch.length === 5) {
        expiry = optionMatch[2];
        strike = parseInt(optionMatch[3], 10);
        optionType = optionMatch[4] as "CE" | "PE";
      } else {
        strike = parseInt(optionMatch[2], 10);
        optionType = optionMatch[3] as "CE" | "PE";
      }

      const canonicalUnd = instrumentMaster.resolve(underlying);
      const lotSize = canonicalUnd ? canonicalUnd.lotSize : (underlying === "BANKNIFTY" ? 15 : 25);
      const formattedSymbol = `${underlying} ${strike} ${optionType}`;

      return {
        symbol: formattedSymbol,
        tradingSymbol: `${underlying}${expiry || ""}${strike}${optionType}`,
        securityId: `OPT_${underlying}_${strike}_${optionType}`,
        exchangeSegment: "NSE_FNO",
        instrumentType: optionType === "CE" ? "OPTION_CE" : "OPTION_PE",
        lotSize,
        tickSize: 0.05,
        underlying,
        strike,
        expiry,
        optionType,
        provider: "dhan",
        status: "RESOLVED",
      };
    }

    // 3. Parse Futures (e.g., "NIFTY-FUT", "NIFTY FUT", "BANKNIFTY-FUT")
    const futMatch = input.match(/^([A-Z]+)[-\s]*(FUT|FUTURES)$/i);
    if (futMatch) {
      const underlying = futMatch[1];
      const canonicalUnd = instrumentMaster.resolve(underlying);
      const lotSize = canonicalUnd ? canonicalUnd.lotSize : (underlying === "BANKNIFTY" ? 15 : 25);

      return {
        symbol: `${underlying}-FUT`,
        tradingSymbol: `${underlying} FUT`,
        securityId: `FUT_${underlying}`,
        exchangeSegment: "NSE_FNO",
        instrumentType: "FUTURES",
        lotSize,
        tickSize: 0.05,
        underlying,
        provider: "dhan",
        status: "RESOLVED",
      };
    }

    return {
      symbol: input,
      tradingSymbol: input,
      securityId: "",
      exchangeSegment: "NSE_EQ",
      instrumentType: "INDEX",
      lotSize: 1,
      tickSize: 0.05,
      provider: "dhan",
      status: "INSTRUMENT_NOT_FOUND",
    };
  }

  public static resolveOrThrow(rawInput: string): ResolvedInstrument {
    const resolved = InstrumentResolver.resolve(rawInput);
    if (resolved.status === "INSTRUMENT_NOT_FOUND" || !resolved.securityId) {
      throw new Error(`INSTRUMENT_NOT_FOUND: Unable to resolve security ID for "${rawInput}"`);
    }
    return resolved;
  }
}

/**
 * DhanInstrumentResolver
 * Authoritative resolver for DhanHQ V2 official instrument and security ID master.
 */
export class DhanInstrumentResolver {
  private static cache: Map<string, ResolvedInstrument> = new Map();
  private static lastSyncTimestamp: number = 0;
  private static syncIntervalMs: number = 24 * 60 * 60 * 1000; // Daily cache refresh

  /**
   * Resolves an instrument symbol, tradingSymbol, or query to a fully qualified ResolvedInstrument.
   * Throws INSTRUMENT_NOT_FOUND if the instrument cannot be authoritatively resolved.
   */
  public static resolve(symbolOrQuery: string, exchange?: ExchangeSegment): ResolvedInstrument {
    if (!symbolOrQuery || typeof symbolOrQuery !== "string") {
      throw new Error(`INSTRUMENT_NOT_FOUND: Invalid instrument query "${symbolOrQuery}"`);
    }

    const key = `${exchange || ""}:${symbolOrQuery.trim().toUpperCase()}`;
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    // Attempt resolution via InstrumentMaster
    const registered = instrumentMaster.resolve(symbolOrQuery, exchange);
    if (registered) {
      const resolved: ResolvedInstrument = {
        symbol: registered.symbol,
        tradingSymbol: registered.tradingSymbol,
        securityId: registered.securityId,
        exchangeSegment: registered.exchange,
        instrumentType: registered.instrumentType as any,
        lotSize: registered.lotSize,
        tickSize: registered.tickSize,
        underlying: registered.symbol,
        provider: "dhan",
        status: "RESOLVED",
      };
      this.cache.set(key, resolved);
      return resolved;
    }

    // Dynamic resolution (options, futures)
    const dynamicRes = InstrumentResolver.resolve(symbolOrQuery);
    if (dynamicRes.status === "RESOLVED" && dynamicRes.securityId) {
      if (exchange) dynamicRes.exchangeSegment = exchange;
      this.cache.set(key, dynamicRes);
      return dynamicRes;
    }

    throw new Error(`INSTRUMENT_NOT_FOUND: Symbol "${symbolOrQuery}" cannot be resolved to a Dhan Security ID`);
  }

  /**
   * Safe resolution without throwing.
   */
  public static safeResolve(symbolOrQuery: string, exchange?: ExchangeSegment): ResolvedInstrument | null {
    try {
      return this.resolve(symbolOrQuery, exchange);
    } catch {
      return null;
    }
  }

  /**
   * Registers a batch of Dhan master instruments into memory.
   */
  public static registerBatch(records: InstrumentMasterRecord[]): void {
    for (const rec of records) {
      instrumentMaster.register(rec);
    }
    this.cache.clear();
    this.lastSyncTimestamp = Date.now();
  }

  /**
   * Clears internal resolver cache.
   */
  public static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Returns cache stats.
   */
  public static getStats() {
    return {
      cachedCount: this.cache.size,
      totalRegistered: instrumentMaster.getAll().length,
      lastSyncTimestamp: this.lastSyncTimestamp,
    };
  }
}
