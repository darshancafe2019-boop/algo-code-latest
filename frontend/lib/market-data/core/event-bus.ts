/**
 * Centralized Live Market Data Engine - Market Event Bus
 * Zero-allocation, high-performance typed event bus for market data streams.
 */

import {
  MarketTick,
  NormalizedQuote,
  OHLCVCandle,
  MarketDepth,
  OptionChainSnapshot,
  ProviderHealthEntry,
  ConnectionState,
} from "../types";

export type MarketEventType =
  | "TICK"
  | "QUOTE"
  | "CANDLE_UPDATE"
  | "CANDLE_CLOSE"
  | "ORDERBOOK_UPDATE"
  | "OPTION_UPDATE"
  | "OI_UPDATE"
  | "MARKET_STATUS"
  | "PROVIDER_STATUS";

export interface MarketEventMap {
  TICK: { symbol: string; tick: MarketTick };
  QUOTE: { symbol: string; quote: NormalizedQuote };
  CANDLE_UPDATE: { symbol: string; candle: OHLCVCandle };
  CANDLE_CLOSE: { symbol: string; candle: OHLCVCandle };
  ORDERBOOK_UPDATE: { symbol: string; depth: MarketDepth };
  OPTION_UPDATE: { underlying: string; chain: OptionChainSnapshot };
  OI_UPDATE: { symbol: string; openInterest: number; oiChange: number };
  MARKET_STATUS: { exchange: string; status: "OPEN" | "PRE-OPEN" | "CLOSED" | "POST-MARKET" | "HALTED" };
  PROVIDER_STATUS: { provider: string; state: ConnectionState; health: ProviderHealthEntry };
}

export type MarketEventListener<K extends MarketEventType> = (data: MarketEventMap[K]) => void;

export class MarketEventBus {
  private static instance: MarketEventBus | null = null;
  private listeners: Map<MarketEventType, Set<MarketEventListener<any>>> = new Map();
  private symbolListeners: Map<string, Set<(tick: MarketTick) => void>> = new Map();

  private constructor() {}

  public static getInstance(): MarketEventBus {
    if (!MarketEventBus.instance) {
      MarketEventBus.instance = new MarketEventBus();
    }
    return MarketEventBus.instance;
  }

  public on<K extends MarketEventType>(event: K, listener: MarketEventListener<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    return () => {
      this.off(event, listener);
    };
  }

  public off<K extends MarketEventType>(event: K, listener: MarketEventListener<K>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
    }
  }

  public emit<K extends MarketEventType>(event: K, data: MarketEventMap[K]): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const listener of set) {
        try {
          listener(data);
        } catch (err) {
          console.error(`[MarketEventBus] Error in listener for ${event}:`, err);
        }
      }
    }
  }

  /**
   * Symbol-specific listener for high-frequency micro-subscriptions
   */
  public onSymbolTick(symbol: string, callback: (tick: MarketTick) => void): () => void {
    const sym = symbol.toUpperCase();
    if (!this.symbolListeners.has(sym)) {
      this.symbolListeners.set(sym, new Set());
    }
    this.symbolListeners.get(sym)!.add(callback);

    return () => {
      const set = this.symbolListeners.get(sym);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.symbolListeners.delete(sym);
        }
      }
    };
  }

  public emitSymbolTick(symbol: string, tick: MarketTick): void {
    const sym = symbol.toUpperCase();
    const set = this.symbolListeners.get(sym);
    if (set) {
      for (const cb of set) {
        try {
          cb(tick);
        } catch (err) {
          console.error(`[MarketEventBus] Error in symbol tick listener for ${sym}:`, err);
        }
      }
    }
  }

  public clear(): void {
    this.listeners.clear();
    this.symbolListeners.clear();
  }
}

export const marketEventBus = MarketEventBus.getInstance();
