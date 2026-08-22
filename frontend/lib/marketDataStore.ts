"use client";

import { useState, useEffect, useCallback } from "react";

export interface MarketQuote {
  symbol: string;
  exchange: string;
  provider: string;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  timestamp: string;
  status: string;
  data_quality: string;
  provenance: string;
  vwap?: number;
  high?: number;
  low?: number;
  open?: number;
  close?: number;
  change_pct?: number;
  sequence?: number;
}

export interface OptionStrikeRow {
  strike: number;
  is_atm: boolean;
  distance_pct: number;
  ce: any;
  pe: any;
}

export interface OptionChainData {
  status: string;
  underlying: string;
  spot_price: number;
  selected_expiry: string;
  available_expiries: string[];
  strike_count: number;
  max_pain: number;
  pcr: {
    pcr_oi: number;
    pcr_volume: number;
    total_call_oi: number;
    total_put_oi: number;
    total_call_volume: number;
    total_put_volume: number;
  };
  strikes: OptionStrikeRow[];
}

export interface FuturesContract {
  underlying: string;
  contract: string;
  exchange: string;
  provider: string;
  expiry: string;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  OI: number;
  OIChange: number;
  basis: number;
  annualized_basis: number;
  markPrice?: number;
  indexPrice?: number;
  fundingRate?: number;
  nextFundingTime?: string;
  timestamp: string;
  status: string;
}

// In-Memory Global Store State
class GlobalMarketDataStore {
  private quotes: Record<string, MarketQuote> = {};
  private listeners: Set<() => void> = new Set();
  private activeSymbol = "BTC/USDT";
  private activeTimeframe = "5m";
  private isFeedLive = true;
  private isStale = false;
  private feedLatencyMs = 14.5;
  private lastTickTimestamp = new Date().toISOString();

  public getQuotes() {
    return this.quotes;
  }

  public getActiveSymbol() {
    return this.activeSymbol;
  }

  public getActiveTimeframe() {
    return this.activeTimeframe;
  }

  public getFeedStatus() {
    return {
      isLive: this.isFeedLive,
      isStale: this.isStale,
      latencyMs: this.feedLatencyMs,
      lastTick: this.lastTickTimestamp,
    };
  }

  public setActiveSymbol(symbol: string) {
    this.activeSymbol = symbol;
    this.notify();
  }

  public setActiveTimeframe(timeframe: string) {
    this.activeTimeframe = timeframe;
    this.notify();
  }

  public updateQuote(quote: MarketQuote) {
    this.quotes[quote.symbol.toUpperCase()] = quote;
    this.lastTickTimestamp = quote.timestamp;
    this.notify();
  }

  public setFeedStatus(isLive: boolean, isStale: boolean, latencyMs: number) {
    this.isFeedLive = isLive;
    this.isStale = isStale;
    this.feedLatencyMs = latencyMs;
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch {}
    });
  }
}

export const marketStoreSingleton = new GlobalMarketDataStore();

export function useMarketDataStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = marketStoreSingleton.subscribe(() => setTick((t) => t + 1));
    return () => {
      unsub();
    };
  }, []);

  return {
    quotes: marketStoreSingleton.getQuotes(),
    activeSymbol: marketStoreSingleton.getActiveSymbol(),
    activeTimeframe: marketStoreSingleton.getActiveTimeframe(),
    feedStatus: marketStoreSingleton.getFeedStatus(),
    setActiveSymbol: useCallback((s: string) => marketStoreSingleton.setActiveSymbol(s), []),
    setActiveTimeframe: useCallback((tf: string) => marketStoreSingleton.setActiveTimeframe(tf), []),
    updateQuote: useCallback((q: MarketQuote) => marketStoreSingleton.updateQuote(q), []),
    setFeedStatus: useCallback(
      (isLive: boolean, isStale: boolean, latencyMs: number) =>
        marketStoreSingleton.setFeedStatus(isLive, isStale, latencyMs),
      []
    ),
  };
}
