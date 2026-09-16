import {
  NormalizedQuote,
  UpstoxFeedStatus,
  UpstoxConnectionState,
  UpstoxMarketPhase,
  UpstoxPriceState,
} from "./types";
import { getIndianMarketPhase, isIndianMarketOpen } from "./market-status";

class UpstoxMarketStore {
  private quotes: Map<string, NormalizedQuote> = new Map();
  private lastUpdateTs: number = Date.now();
  private connectionState: UpstoxConnectionState = "CONNECTED";

  public setConnectionState(state: UpstoxConnectionState): void {
    this.connectionState = state;
  }

  public getConnectionState(): UpstoxConnectionState {
    return this.connectionState;
  }

  /**
   * Sets or updates a normalized market quote in the store.
   * Evaluates incoming trade timestamp (ltt) against previousLtt to verify if a new trade occurred.
   */
  public updateQuote(incoming: Partial<NormalizedQuote> & { instrumentKey: string; ltp: number }): void {
    if (!incoming || !incoming.instrumentKey) return;

    const existing = this.quotes.get(incoming.instrumentKey);
    const nowMs = Date.now();

    // Extract incoming LTT (Epoch ms or ISO timestamp)
    let incomingLttMs = nowMs;
    if (incoming.lastTradeTime) {
      const parsed = typeof incoming.lastTradeTime === "number" ? incoming.lastTradeTime : new Date(incoming.lastTradeTime).getTime();
      if (!isNaN(parsed) && parsed > 0) {
        incomingLttMs = parsed;
      }
    }

    const previousLttMs = existing?.previousLtt || (existing?.lastTradeTime ? new Date(existing.lastTradeTime).getTime() : 0);
    const isNewTrade = incomingLttMs > previousLttMs;

    const marketPhase = getIndianMarketPhase(incoming.marketPhase);
    const isOpen = marketPhase === "NORMAL_OPEN";

    // Determine Price State (LIVE_TRADE, LAST_TRADED, INDICATIVE, STALE, NO_DATA)
    let priceState: UpstoxPriceState = "LAST_TRADED";
    if (marketPhase === "CLOSING_AUCTION" && incoming.indicativePrice != null) {
      priceState = "INDICATIVE";
    } else if (isOpen && isNewTrade) {
      priceState = "LIVE_TRADE";
    } else if (!isOpen) {
      priceState = "LAST_TRADED";
    } else if (isOpen && nowMs - incomingLttMs > 30000) {
      priceState = "STALE";
    } else {
      priceState = existing?.priceState || "LAST_TRADED";
    }

    // Determine Feed Status
    let status: UpstoxFeedStatus = "LIVE";
    if (!isOpen) {
      status = "MARKET_CLOSED";
    } else if (nowMs - incomingLttMs > 30000) {
      status = "STALE";
    } else if (nowMs - incomingLttMs > 5000) {
      status = "DELAYED";
    }

    const normalized: NormalizedQuote = {
      provider: incoming.provider || existing?.provider || "UPSTOX",
      instrumentKey: incoming.instrumentKey,
      symbol: incoming.symbol || existing?.symbol || incoming.instrumentKey,
      exchange: incoming.exchange || existing?.exchange || "NSE_EQ",
      segment: incoming.segment || existing?.segment || "CASH",
      ltp: incoming.ltp,
      ltq: incoming.ltq ?? existing?.ltq ?? 0,
      lastTradeTime: new Date(incomingLttMs).toISOString(),
      previousLtt: previousLttMs > 0 ? previousLttMs : null,
      previousClose: incoming.previousClose ?? existing?.previousClose ?? incoming.ltp,
      open: incoming.open ?? existing?.open ?? incoming.ltp,
      high: incoming.high ?? existing?.high ?? incoming.ltp,
      low: incoming.low ?? existing?.low ?? incoming.ltp,
      close: incoming.close ?? existing?.close ?? incoming.ltp,
      indicativePrice: incoming.indicativePrice ?? existing?.indicativePrice ?? null,
      volume: incoming.volume ?? existing?.volume ?? 0,
      oi: incoming.oi ?? existing?.oi ?? 0,
      iv: incoming.iv ?? existing?.iv ?? null,
      bid: incoming.bid ?? existing?.bid ?? incoming.ltp,
      bidQty: incoming.bidQty ?? existing?.bidQty ?? 0,
      ask: incoming.ask ?? existing?.ask ?? incoming.ltp,
      askQty: incoming.askQty ?? existing?.askQty ?? 0,
      marketDepth: incoming.marketDepth || existing?.marketDepth || [],
      greeks: incoming.greeks || existing?.greeks || { delta: null, gamma: null, theta: null, vega: null, rho: null },
      exchangeTimestamp: incoming.exchangeTimestamp || existing?.exchangeTimestamp || new Date(incomingLttMs).toISOString(),
      receivedAt: incoming.receivedAt || new Date(nowMs).toISOString(),
      ageMs: Math.max(0, nowMs - incomingLttMs),
      stale: isOpen && nowMs - incomingLttMs > 30000,
      status,
      connectionState: this.connectionState,
      marketPhase,
      priceState,
      isTradable: isOpen && priceState === "LIVE_TRADE",
    };

    this.quotes.set(incoming.instrumentKey, normalized);
    this.lastUpdateTs = nowMs;
  }

  /**
   * Updates multiple quotes in batch.
   */
  public updateQuotes(quotesMap: Record<string, NormalizedQuote>): void {
    Object.values(quotesMap).forEach((q) => this.updateQuote(q));
  }

  /**
   * Gets a normalized quote with freshly computed staleness and age.
   */
  public getQuote(instrumentKey: string): NormalizedQuote | null {
    const cached = this.quotes.get(instrumentKey);
    if (!cached) return null;

    const nowMs = Date.now();
    const lttMs = cached.lastTradeTime ? new Date(cached.lastTradeTime).getTime() : nowMs;
    const ageMs = Math.max(0, nowMs - lttMs);
    const marketPhase = getIndianMarketPhase(cached.marketPhase);
    const isOpen = marketPhase === "NORMAL_OPEN";

    let priceState = cached.priceState;
    if (!isOpen) {
      priceState = "LAST_TRADED";
    } else if (ageMs > 30000) {
      priceState = "STALE";
    }

    return {
      ...cached,
      ageMs,
      stale: isOpen && ageMs > 30000,
      marketPhase,
      priceState,
      isTradable: isOpen && priceState === "LIVE_TRADE",
      connectionState: this.connectionState,
    };
  }

  /**
   * Gets all currently tracked normalized quotes.
   */
  public getAllQuotes(): NormalizedQuote[] {
    return Array.from(this.quotes.keys())
      .map((k) => this.getQuote(k))
      .filter((q): q is NormalizedQuote => q !== null);
  }

  /**
   * Generates a truthful per-instrument health breakdown summary.
   */
  public getHealthSummary() {
    const quotes = this.getAllQuotes();
    let liveTradeCount = 0;
    let closingAuctionCount = 0;
    let lastTradedCount = 0;
    let staleCount = 0;

    quotes.forEach((q) => {
      if (q.priceState === "LIVE_TRADE") liveTradeCount++;
      else if (q.priceState === "INDICATIVE") closingAuctionCount++;
      else if (q.priceState === "STALE") staleCount++;
      else lastTradedCount++;
    });

    const marketPhase = getIndianMarketPhase();
    return {
      total: quotes.length,
      connectionState: this.connectionState,
      marketPhase,
      marketStatus: marketPhase === "NORMAL_OPEN" ? "OPEN" : "CLOSED",
      liveTradeCount,
      closingAuctionCount,
      lastTradedCount,
      staleCount,
      lastUpdateTs: this.lastUpdateTs,
    };
  }

  public getCount(): number {
    return this.quotes.size;
  }

  public getLastUpdateTimestamp(): number {
    return this.lastUpdateTs;
  }

  public clear(): void {
    this.quotes.clear();
  }
}

export const globalMarketStore = new UpstoxMarketStore();
