/**
 * Normalized Real-Time Market Store
 * =================================
 * In-memory store for normalized market quotes, latencies, and data staleness.
 * Never fabricates values or recalculates fake volume/LTP.
 */

import { NormalizedQuote, UpstoxFeedStatus } from "./types";
import { isIndianMarketOpen } from "./market-status";

class UpstoxMarketStore {
  private quotes: Map<string, NormalizedQuote> = new Map();
  private lastUpdateTs: number = Date.now();

  /**
   * Sets or updates a normalized market quote in the store.
   */
  public updateQuote(quote: NormalizedQuote): void {
    if (!quote || !quote.instrumentKey) return;
    this.quotes.set(quote.instrumentKey, quote);
    this.lastUpdateTs = Date.now();
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

    const now = Date.now();
    const lastTrade = cached.lastTradeTime ? new Date(cached.lastTradeTime).getTime() : now;
    const ageMs = Math.max(0, now - lastTrade);
    const isOpen = isIndianMarketOpen();

    let status: UpstoxFeedStatus = "LIVE";
    if (!isOpen) {
      status = "MARKET_CLOSED";
    } else if (ageMs > 30000) {
      status = "STALE";
    } else if (ageMs > 5000) {
      status = "DELAYED";
    }

    return {
      ...cached,
      ageMs,
      stale: isOpen && ageMs > 30000,
      status,
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
   * Gets the total count of active cached instruments.
   */
  public getCount(): number {
    return this.quotes.size;
  }

  /**
   * Gets the timestamp of the most recent market update.
   */
  public getLastUpdateTimestamp(): number {
    return this.lastUpdateTs;
  }

  /**
   * Clears the store.
   */
  public clear(): void {
    this.quotes.clear();
  }
}

export const globalMarketStore = new UpstoxMarketStore();
