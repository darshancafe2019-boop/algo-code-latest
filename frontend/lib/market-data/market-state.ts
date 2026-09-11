/**
 * Centralized Live Market Data Engine - Central Market State Store
 * Single authoritative in-memory state for all live market data.
 */

import { MarketDataNormalizer } from "./normalizer";
import {
  CandleTimeframe,
  MarketDepth,
  MarketTick,
  NormalizedQuote,
  OHLCVCandle,
  OptionChainSnapshot,
} from "./types";

export class CentralMarketState {
  private static instance: CentralMarketState | null = null;

  private ticks: Map<string, MarketTick> = new Map();
  private quotes: Map<string, NormalizedQuote> = new Map();
  private depths: Map<string, MarketDepth> = new Map();
  private candles: Map<string, OHLCVCandle[]> = new Map();
  private optionChains: Map<string, OptionChainSnapshot> = new Map();

  private symbolListeners: Map<string, Set<(tick: MarketTick) => void>> = new Map();
  private globalListeners: Set<(tick: MarketTick) => void> = new Set();
  private quoteListeners: Map<string, Set<(quote: NormalizedQuote) => void>> = new Map();

  private constructor() {}

  public static getInstance(): CentralMarketState {
    if (!CentralMarketState.instance) {
      CentralMarketState.instance = new CentralMarketState();
    }
    return CentralMarketState.instance;
  }

  /**
   * Updates central market state with a validated normalized tick.
   * Notifies all subscribers immediately.
   */
  public updateTick(tick: MarketTick): void {
    const symKey = tick.symbol.toUpperCase();
    this.ticks.set(symKey, tick);

    // Update quote
    const quote = MarketDataNormalizer.toNormalizedQuote(tick);
    this.quotes.set(symKey, quote);

    // Update depth if present
    if (tick.marketDepth) {
      this.depths.set(symKey, tick.marketDepth);
    }

    // 1. Notify symbol-specific tick listeners
    const listeners = this.symbolListeners.get(symKey);
    if (listeners) {
      listeners.forEach((cb) => {
        try {
          cb(tick);
        } catch (e) {
          console.error(`[MarketState] Error in tick listener for ${symKey}:`, e);
        }
      });
    }

    // 2. Notify symbol quote listeners
    const qListeners = this.quoteListeners.get(symKey);
    if (qListeners) {
      qListeners.forEach((cb) => {
        try {
          cb(quote);
        } catch (e) {
          console.error(`[MarketState] Error in quote listener for ${symKey}:`, e);
        }
      });
    }

    // 3. Notify global listeners
    this.globalListeners.forEach((cb) => {
      try {
        cb(tick);
      } catch (e) {
        console.error("[MarketState] Error in global listener:", e);
      }
    });
  }

  public ingestTick(tick: MarketTick): void {
    this.updateTick(tick);
  }

  public getTick(symbol: string): MarketTick | undefined {
    return this.ticks.get(symbol.toUpperCase());
  }

  public getQuote(symbol: string): NormalizedQuote | undefined {
    return this.quotes.get(symbol.toUpperCase());
  }

  public getAllQuotes(): NormalizedQuote[] {
    return Array.from(this.quotes.values());
  }

  public getDepth(symbol: string): MarketDepth | undefined {
    return this.depths.get(symbol.toUpperCase());
  }

  public setDepth(symbol: string, depth: MarketDepth): void {
    this.depths.set(symbol.toUpperCase(), depth);
  }

  public getCandles(symbol: string, timeframe: CandleTimeframe, limit?: number): OHLCVCandle[] {
    const key = `${symbol.toUpperCase()}:${timeframe}`;
    const list = this.candles.get(key) || [];
    return limit ? list.slice(-limit) : list;
  }

  public setCandles(symbol: string, timeframe: CandleTimeframe, candleList: OHLCVCandle[]): void {
    const key = `${symbol.toUpperCase()}:${timeframe}`;
    this.candles.set(key, candleList);
  }

  public getOptionChain(underlying: string): OptionChainSnapshot | undefined {
    return this.optionChains.get(underlying.toUpperCase());
  }

  public setOptionChain(underlying: string, chain: OptionChainSnapshot): void {
    this.optionChains.set(underlying.toUpperCase(), chain);
  }

  /**
   * Subscribe to ticks for a specific symbol.
   */
  public subscribeSymbol(symbol: string, callback: (tick: MarketTick) => void): () => void {
    const symKey = symbol.toUpperCase();
    if (!this.symbolListeners.has(symKey)) {
      this.symbolListeners.set(symKey, new Set());
    }
    this.symbolListeners.get(symKey)!.add(callback);

    // Immediately dispatch cached tick if available
    const cached = this.ticks.get(symKey);
    if (cached) {
      callback(cached);
    }

    return () => {
      const set = this.symbolListeners.get(symKey);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.symbolListeners.delete(symKey);
      }
    };
  }

  /**
   * Subscribe to quote updates for a specific symbol.
   */
  public subscribeQuote(symbol: string, callback: (quote: NormalizedQuote) => void): () => void {
    const symKey = symbol.toUpperCase();
    if (!this.quoteListeners.has(symKey)) {
      this.quoteListeners.set(symKey, new Set());
    }
    this.quoteListeners.get(symKey)!.add(callback);

    const cached = this.quotes.get(symKey);
    if (cached) {
      callback(cached);
    }

    return () => {
      const set = this.quoteListeners.get(symKey);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.quoteListeners.delete(symKey);
      }
    };
  }

  /**
   * Subscribe to all global market ticks across all instruments.
   */
  public subscribeGlobal(callback: (tick: MarketTick) => void): () => void {
    this.globalListeners.add(callback);
    return () => {
      this.globalListeners.delete(callback);
    };
  }

  public clear(): void {
    this.ticks.clear();
    this.quotes.clear();
    this.depths.clear();
    this.candles.clear();
    this.optionChains.clear();
  }
}

export const marketState = CentralMarketState.getInstance();
