/**
 * Authoritative Delta Exchange Product Discovery & Option Chain Service
 * 
 * Flow:
 * DELTA /products (exhaust all pages with contract_types=call_options,put_options & states=live,upcoming)
 *   -> Extract all active/upcoming contracts
 *   -> Group by underlying & expiry
 *   -> Build DeltaExpiryRegistry
 *   -> When user selects underlying + expiry -> Fetch /v2/tickers (DD-MM-YYYY)
 *   -> Normalize into full strike matrix
 *   -> Live WebSocket incremental updates
 */

import {
  DeltaOptionContract,
  DeltaExpiryItem,
  DeltaExpiryRegistry,
  DeltaChainSnapshot,
  DeltaOptionChainRow,
} from "@/types/delta-options";
import {
  parseDeltaDate,
  toDeltaApiExpiry,
  toDeltaWsChainSymbol,
} from "./delta-date-utils";

const DELTA_REST_BASE = "https://api.india.delta.exchange/v2";

interface CachedRegistry {
  timestamp: number;
  underlyings: string[];
  expiriesByUnderlying: Map<string, DeltaExpiryItem[]>;
  allProducts: any[];
}

class DeltaProductService {
  private cache: CachedRegistry | null = null;
  private cacheTtlMs = 5 * 60 * 1000; // 5 minutes TTL for metadata discovery
  private isFetchingProducts = false;
  private fetchPromise: Promise<CachedRegistry> | null = null;

  private safeNum(val: unknown): number | null {
    if (val === null || val === undefined || val === "") return null;
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  }

  /**
   * Fetches ALL Delta option products and tickers, discovering expiries directly from live contract symbols.
   */
  public async discoverAllOptionProducts(forceRefresh: boolean = false): Promise<CachedRegistry> {
    const now = Date.now();
    if (!forceRefresh && this.cache && (now - this.cache.timestamp) < this.cacheTtlMs) {
      return this.cache;
    }

    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    this.fetchPromise = (async () => {
      try {
        const allProducts: any[] = [];
        const seenProductIds = new Set<string>();

        // 1. Primary discovery: Fetch all live option tickers from /v2/tickers
        try {
          const tickersUrl = new URL(`${DELTA_REST_BASE}/tickers`);
          tickersUrl.searchParams.set("contract_types", "call_options,put_options");

          const tickersRes = await fetch(tickersUrl.toString(), {
            headers: { Accept: "application/json", "User-Agent": "QuantOS/2.0" },
            cache: "no-store",
            signal: AbortSignal.timeout(6000),
          });

          if (tickersRes.ok) {
            const tickersJson = await tickersRes.json();
            if (tickersJson?.success && Array.isArray(tickersJson?.result)) {
              for (const item of tickersJson.result) {
                const sym = String(item.symbol || "");
                if (sym && !seenProductIds.has(sym)) {
                  seenProductIds.add(sym);
                  allProducts.push(item);
                }
              }
            }
          }
        } catch (tickersErr) {
          console.warn("[DeltaProductService] /v2/tickers discovery fallback to /v2/products:", tickersErr);
        }

        // 2. Secondary discovery / Exhaust pagination on /v2/products if tickers returned few items
        if (allProducts.length < 50) {
          let afterCursor: string | null = null;
          let pageCount = 0;
          const maxPages = 50;

          do {
            pageCount++;
            const url = new URL(`${DELTA_REST_BASE}/products`);
            url.searchParams.set("contract_types", "call_options,put_options");
            url.searchParams.set("states", "live,upcoming");
            url.searchParams.set("page_size", "100");
            if (afterCursor) {
              url.searchParams.set("after", afterCursor);
            }

            const response = await fetch(url.toString(), {
              headers: {
                Accept: "application/json",
                "User-Agent": "QuantOS/2.0",
              },
              cache: "no-store",
              signal: AbortSignal.timeout(10000),
            });

            if (!response.ok) {
              break;
            }

            const data = await response.json();
            const pageResult: any[] = Array.isArray(data?.result) ? data.result : [];

            if (pageResult.length === 0) {
              break;
            }

            let newItemsInPage = 0;
            for (const item of pageResult) {
              const sym = String(item.symbol || item.id || "");
              if (sym && !seenProductIds.has(sym)) {
                seenProductIds.add(sym);
                allProducts.push(item);
                newItemsInPage++;
              }
            }

            const nextCursor = data?.meta?.after;
            if (nextCursor && nextCursor !== afterCursor && newItemsInPage > 0 && pageCount < maxPages) {
              afterCursor = nextCursor;
            } else {
              afterCursor = null;
            }
          } while (afterCursor !== null);
        }

        // Group discovered products by underlying symbol & extracted contract expiry
        const expiriesByUnderlying = new Map<string, Map<string, {
          calls: any[];
          puts: any[];
          strikes: Set<number>;
          state: string;
          settlementTime: string;
          rawExpiryDate: string;
        }>>();

        const nowUtcMidnight = new Date();
        nowUtcMidnight.setUTCHours(0, 0, 0, 0);

        for (const p of allProducts) {
          const sym = String(p.symbol || "").trim();
          let rawDate: string | null = null;

          // Priority 1: Extract DDMMYY from symbol e.g. C-BTC-77000-130926 -> 130926
          if (sym.includes("-")) {
            const parts = sym.split("-");
            const lastPart = parts[parts.length - 1];
            if (/^\d{6}$/.test(lastPart)) {
              rawDate = lastPart;
            }
          }

          // Priority 2: Use settlement_time if available
          if (!rawDate && p.settlement_time) {
            rawDate = p.settlement_time;
          }

          if (!rawDate) continue;

          const parsed = parseDeltaDate(rawDate);
          if (!parsed) continue;

          // Strictly exclude already expired contracts (before UTC today 00:00:00)
          const expiryDateObj = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 23, 59, 59));
          if (expiryDateObj.getTime() < nowUtcMidnight.getTime()) {
            continue;
          }

          // Extract underlying symbol e.g. BTC from symbol or underlying_asset
          let undSym = "BTC";
          if (sym.startsWith("C-") || sym.startsWith("P-")) {
            const parts = sym.split("-");
            if (parts.length >= 2) undSym = parts[1].toUpperCase();
          } else if (p.underlying_asset?.symbol) {
            undSym = String(p.underlying_asset.symbol).toUpperCase();
          } else if (p.underlying_symbol) {
            undSym = String(p.underlying_symbol).toUpperCase();
          }

          const ctype = String(p.contract_type || "").toLowerCase();
          const isCall = sym.startsWith("C-") || ctype.includes("call");
          const isPut = sym.startsWith("P-") || ctype.includes("put");
          const strike = this.safeNum(p.strike_price);

          if (!expiriesByUnderlying.has(undSym)) {
            expiriesByUnderlying.set(undSym, new Map());
          }

          const undMap = expiriesByUnderlying.get(undSym)!;
          const expKey = parsed.apiDateFormat; // DD-MM-YYYY canonical key

          if (!undMap.has(expKey)) {
            undMap.set(expKey, {
              calls: [],
              puts: [],
              strikes: new Set<number>(),
              state: String(p.state || "live").toUpperCase(),
              settlementTime: p.settlement_time || `${parsed.isoDate}T12:00:00Z`,
              rawExpiryDate: parsed.apiDateFormat,
            });
          }

          const entry = undMap.get(expKey)!;
          if (isCall) {
            entry.calls.push(p);
          } else if (isPut) {
            entry.puts.push(p);
          }
          if (strike !== null && strike > 0) {
            entry.strikes.add(strike);
          }
        }

        // Transform into structured DeltaExpiryItem arrays per underlying
        const finalExpiriesMap = new Map<string, DeltaExpiryItem[]>();
        const discoveredUnderlyings = Array.from(expiriesByUnderlying.keys()).sort((a, b) => {
          const prio: Record<string, number> = { BTC: 1, ETH: 2, SOL: 3, XRP: 4, XAUT: 5 };
          const pA = prio[a] || 99;
          const pB = prio[b] || 99;
          return pA - pB;
        });

        for (const [und, expMap] of expiriesByUnderlying.entries()) {
          const expiryItems: DeltaExpiryItem[] = [];

          for (const [expKey, expData] of expMap.entries()) {
            const parsed = parseDeltaDate(expKey);
            if (!parsed) continue;

            const callCount = expData.calls.length;
            const putCount = expData.puts.length;
            const totalCount = callCount + putCount;

            const strikesSorted = Array.from(expData.strikes).sort((a, b) => a - b);

            expiryItems.push({
              underlying: und,
              expiryIso: parsed.isoDate,
              expiryDisplay: parsed.displayDate,
              expiryApiFormat: parsed.apiDateFormat,
              expiryWsFormat: parsed.wsDateFormat,
              daysToExpiry: parsed.daysToExpiry,
              contractCount: totalCount,
              callCount,
              putCount,
              firstStrike: strikesSorted.length > 0 ? strikesSorted[0] : null,
              lastStrike: strikesSorted.length > 0 ? strikesSorted[strikesSorted.length - 1] : null,
              state: expData.state,
              status: parsed.daysToExpiry >= 0 ? "LIVE" : "STALE",
              category: parsed.category,
            });
          }

          // Sort ascending (nearest expiry first)
          expiryItems.sort((a, b) => {
            const dateA = new Date(a.expiryIso).getTime();
            const dateB = new Date(b.expiryIso).getTime();
            return dateA - dateB;
          });

          finalExpiriesMap.set(und, expiryItems);
        }

        const newCache: CachedRegistry = {
          timestamp: Date.now(),
          underlyings: discoveredUnderlyings,
          expiriesByUnderlying: finalExpiriesMap,
          allProducts,
        };

        this.cache = newCache;
        return newCache;
      } finally {
        this.fetchPromise = null;
      }
    })();

    return this.fetchPromise;
  }

  /**
   * Retrieves the Delta Expiry Registry for a given underlying.
   */
  public async getExpiryRegistry(underlying: string = "BTC"): Promise<DeltaExpiryRegistry> {
    const cleanUnd = underlying.trim().toUpperCase().replace("/USDT", "").replace("-OPTIONS", "");
    const cached = await this.discoverAllOptionProducts(false);

    let expiries = cached.expiriesByUnderlying.get(cleanUnd);
    if (!expiries || expiries.length === 0) {
      // If underlying not found, try refreshing once
      const refreshed = await this.discoverAllOptionProducts(true);
      expiries = refreshed.expiriesByUnderlying.get(cleanUnd) || [];
    }

    return {
      underlying: cleanUnd,
      expiries: expiries || [],
      allUnderlyings: cached.underlyings,
      lastUpdated: cached.timestamp,
      source: "DELTA",
      status: "LIVE",
    };
  }

  /**
   * Fetches the full REST option chain snapshot for the given underlying and expiry.
   * Uses Delta's official GET /v2/tickers with DD-MM-YYYY format.
   */
  public async fetchOptionChainSnapshot(
    underlying: string = "BTC",
    expiryDateInput?: string
  ): Promise<DeltaChainSnapshot> {
    const cleanUnd = underlying.trim().toUpperCase().replace("/USDT", "").replace("-OPTIONS", "");
    const registry = await this.getExpiryRegistry(cleanUnd);

    if (registry.expiries.length === 0) {
      throw new Error(`NO_EXPIRIES_FOUND: Delta Exchange has no active option expiries for underlying '${cleanUnd}'.`);
    }

    // Resolve target expiry item
    let targetExpiryItem: DeltaExpiryItem | undefined;

    if (expiryDateInput) {
      const parsedTarget = parseDeltaDate(expiryDateInput);
      if (parsedTarget) {
        targetExpiryItem = registry.expiries.find(
          (e) =>
            e.expiryApiFormat === parsedTarget.apiDateFormat ||
            e.expiryIso === parsedTarget.isoDate ||
            e.expiryWsFormat === parsedTarget.wsDateFormat
        );
      }
    }

    // Default to nearest valid future expiry
    if (!targetExpiryItem) {
      targetExpiryItem = registry.expiries[0];
    }

    const apiExpiry = targetExpiryItem.expiryApiFormat; // e.g. "18-09-2026"
    const wsSymbol = toDeltaWsChainSymbol(cleanUnd, targetExpiryItem.expiryApiFormat); // e.g. "BTC-180926"
    const expectedWsSuffix = targetExpiryItem.expiryWsFormat; // e.g. "180926"

    const startTs = Date.now();
    const url = new URL(`${DELTA_REST_BASE}/tickers`);
    url.searchParams.set("contract_types", "call_options,put_options");
    url.searchParams.set("underlying_asset_symbols", cleanUnd);
    url.searchParams.set("expiry_date", apiExpiry);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "QuantOS/2.0",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`DELTA_REST_ERROR: Delta /tickers HTTP ${response.status} for ${cleanUnd} ${apiExpiry}`);
    }

    const data = await response.json();
    if (!data?.success || !Array.isArray(data?.result)) {
      throw new Error(`DELTA_RESPONSE_INVALID: Malformed tickers response from Delta Exchange.`);
    }

    const rawContracts: any[] = data.result;
    const rowsMap = new Map<number, { strike: number; call: DeltaOptionContract | null; put: DeltaOptionContract | null }>();

    let detectedSpot: number | null = null;
    let callCount = 0;
    let putCount = 0;

    for (const raw of rawContracts) {
      const symbol = String(raw?.symbol || "").trim();

      // Strict verification: Ensure the contract belongs to the selected expiry
      if (expectedWsSuffix && !symbol.endsWith(`-${expectedWsSuffix}`) && !symbol.includes(expectedWsSuffix)) {
        continue;
      }

      const strike = this.safeNum(raw?.strike_price);
      if (strike === null || strike <= 0) continue;

      if (detectedSpot === null) {
        detectedSpot = this.safeNum(raw?.spot_price);
      }

      const ctype = String(raw?.contract_type || "").toLowerCase();
      const isCall = ctype.includes("call") || symbol.startsWith("C-");
      const isPut = ctype.includes("put") || symbol.startsWith("P-");
      if (!isCall && !isPut) continue;

      const quotes = raw?.quotes || {};
      const greeks = raw?.greeks || {};

      const ltp = this.safeNum(raw?.mark_price) ?? this.safeNum(raw?.close) ?? this.safeNum(raw?.last_price);
      const markPrice = this.safeNum(raw?.mark_price);
      const bid = this.safeNum(quotes?.best_bid);
      const ask = this.safeNum(quotes?.best_ask);
      const bidSize = this.safeNum(quotes?.bid_size);
      const askSize = this.safeNum(quotes?.ask_size);

      // Safe IV calculation (Delta returns e.g. 0.52 for 52%)
      const rawMarkVol = this.safeNum(raw?.mark_vol) ?? this.safeNum(quotes?.mark_iv);
      const normIv = rawMarkVol !== null ? (rawMarkVol < 5.0 ? round(rawMarkVol * 100, 2) : round(rawMarkVol, 2)) : null;
      const rawBidIv = this.safeNum(quotes?.bid_iv);
      const normBidIv = rawBidIv !== null ? (rawBidIv < 5.0 ? round(rawBidIv * 100, 2) : round(rawBidIv, 2)) : null;
      const rawAskIv = this.safeNum(quotes?.ask_iv);
      const normAskIv = rawAskIv !== null ? (rawAskIv < 5.0 ? round(rawAskIv * 100, 2) : round(rawAskIv, 2)) : null;

      const contract: DeltaOptionContract = {
        productId: this.safeNum(raw?.product_id) ?? null,
        symbol: String(raw?.symbol || ""),
        underlying: cleanUnd,
        expiry: apiExpiry,
        strike,
        optionType: isCall ? "CALL" : "PUT",

        ltp,
        markPrice,
        spotPrice: this.safeNum(raw?.spot_price) ?? detectedSpot,

        bid,
        ask,
        bidSize,
        askSize,

        volume: this.safeNum(raw?.volume),
        openInterest: this.safeNum(raw?.oi) ?? this.safeNum(raw?.open_interest),

        iv: normIv,
        bidIv: normBidIv,
        askIv: normAskIv,

        delta: this.safeNum(greeks?.delta),
        gamma: this.safeNum(greeks?.gamma),
        theta: this.safeNum(greeks?.theta),
        vega: this.safeNum(greeks?.vega),
        rho: this.safeNum(greeks?.rho),

        high: this.safeNum(raw?.high),
        low: this.safeNum(raw?.low),
        close: this.safeNum(raw?.close),

        change24h: this.safeNum(raw?.mark_change_24h) ?? this.safeNum(raw?.change_24h),

        source: "DELTA",
        sourceTimestamp: this.safeNum(raw?.timestamp) ?? null,
        receivedAt: Date.now(),
        status: "LIVE",
      };

      if (!rowsMap.has(strike)) {
        rowsMap.set(strike, {
          strike,
          call: null,
          put: null,
        });
      }

      const row = rowsMap.get(strike)!;
      if (isCall) {
        row.call = contract;
        callCount++;
      } else {
        row.put = contract;
        putCount++;
      }
    }

    // Sort all strikes ascending (Full dataset preserved)
    const sortedStrikes = Array.from(rowsMap.keys()).sort((a, b) => a - b);

    // Dynamic ATM detection
    let atmStrike = detectedSpot;
    if (sortedStrikes.length > 0) {
      if (detectedSpot !== null && detectedSpot > 0) {
        atmStrike = sortedStrikes.reduce((closest, s) => {
          return Math.abs(s - detectedSpot!) < Math.abs(closest - detectedSpot!) ? s : closest;
        }, sortedStrikes[0]);
      } else {
        atmStrike = sortedStrikes[Math.floor(sortedStrikes.length / 2)];
      }
    }

    const rows: DeltaOptionChainRow[] = sortedStrikes.map((s) => {
      const r = rowsMap.get(s)!;
      const distPct = detectedSpot && detectedSpot > 0 ? round(((s - detectedSpot) / detectedSpot) * 100, 2) : 0;
      return {
        strike: s,
        call: r.call,
        put: r.put,
        isAtm: s === atmStrike,
        distancePct: distPct,
      };
    });

    const latencyMs = Date.now() - startTs;

    return {
      source: "DELTA_EXCHANGE",
      broker: "DELTA",
      underlying: cleanUnd,
      expiry: targetExpiryItem.expiryApiFormat,
      selectedExpiry: targetExpiryItem.expiryApiFormat,
      availableExpiries: registry.expiries,
      allUnderlyings: registry.allUnderlyings,

      spotPrice: detectedSpot,
      atmStrike,

      contractsCount: rawContracts.length,
      callsCount: callCount,
      putsCount: putCount,
      strikesCount: sortedStrikes.length,

      rows,
      strikes: rows,

      status: "LIVE",
      wsSubscriptionSymbol: wsSymbol,
      lastUpdated: Date.now(),
      latencyMs,
    };
  }
}

function round(num: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

export const deltaProductService = new DeltaProductService();
