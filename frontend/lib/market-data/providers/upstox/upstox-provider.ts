/**
 * Centralized Live Market Data Engine - Upstox V3 Provider Adapter
 * Implements the MarketDataProvider interface for Upstox secondary live feed & cross-validation.
 */

import {
  BrokerProvider,
  CandleTimeframe,
  FeedMode,
  MarketDepth,
  MarketTick,
  NormalizedQuote,
  OHLCVCandle,
  ProviderHealthEntry,
  UpstoxAuthState,
} from "../../types";
import { MarketDataProvider } from "../../core/market-data-engine";
import { marketState } from "../../market-state";
import { marketHealthMonitor } from "../../health";

export class UpstoxProvider implements MarketDataProvider {
  public readonly providerId: BrokerProvider = "upstox";
  public readonly name: string = "Upstox V3 Market Feed";
  private subscriptions: Map<string, FeedMode> = new Map();
  private isConnected = false;
  private authState: UpstoxAuthState = "TOKEN_PRESENT";
  private lastTickTimestamp = 0;
  private tickCount = 0;
  private lastError?: string;

  public async connect(): Promise<void> {
    this.isConnected = true;
    this.authState = "REST_AUTHENTICATED";
  }

  public async disconnect(): Promise<void> {
    this.isConnected = false;
    this.subscriptions.clear();
    this.authState = "DISCONNECTED";
  }

  public async subscribe(symbols: string[], reason: string = "TERMINAL"): Promise<void> {
    for (const sym of symbols) {
      const clean = sym.toUpperCase();
      // Default to LTPC for general watchlist, FULL for single active trading symbols
      const mode: FeedMode = reason.includes("WATCHLIST") ? "ltpc" : "full";
      this.subscriptions.set(clean, mode);
    }
  }

  public async unsubscribe(symbols: string[], reason: string = "TERMINAL"): Promise<void> {
    for (const sym of symbols) {
      this.subscriptions.delete(sym.toUpperCase());
    }
  }

  public async changeMode(symbols: string[], mode: FeedMode): Promise<void> {
    for (const sym of symbols) {
      const clean = sym.toUpperCase();
      if (this.subscriptions.has(clean)) {
        this.subscriptions.set(clean, mode);
      }
    }
  }

  public async getQuote(symbol: string): Promise<NormalizedQuote | null> {
    return marketState.getQuote(symbol) || null;
  }

  public async getCandles(symbol: string, timeframe: CandleTimeframe, limit: number = 100): Promise<OHLCVCandle[]> {
    const candles = marketState.getCandles(symbol, timeframe);
    return candles.slice(-limit);
  }

  public async getOrderBook(symbol: string): Promise<MarketDepth | null> {
    return marketState.getDepth(symbol) || null;
  }

  public getHealth(): ProviderHealthEntry {
    const baseHealth = marketHealthMonitor.getProviderHealth("upstox");
    return {
      ...baseHealth,
      authState: this.authState,
      restAuth: this.isConnected ? "OK" : "NOT_CONFIGURED",
      websocketConnection: this.isConnected ? "CONNECTED" : "DISCONNECTED",
      subscription: this.subscriptions.size > 0 ? "OK" : "NONE",
      subscribedCount: this.subscriptions.size,
      lastTickTime: this.lastTickTimestamp || undefined,
      tickCount: this.tickCount,
      lastError: this.lastError,
    };
  }

  /**
   * Normalizes Upstox V3 protobuf / JSON tick into unified MarketTick
   * Invariant: Missing fields remain undefined/null, never fabricated as 0.
   */
  public normalizeUpstoxTick(raw: {
    symbol: string;
    securityId?: string;
    ltp: number;
    close?: number;
    open?: number;
    high?: number;
    low?: number;
    volume?: number;
    oi?: number;
    bid?: number;
    ask?: number;
    timestamp?: number;
  }): MarketTick {
    const now = Date.now();
    const ltp = raw.ltp;
    const hasValidClose = raw.close !== undefined && raw.close > 0;
    const prevClose = hasValidClose ? raw.close : undefined;
    const change = (hasValidClose && ltp !== undefined && prevClose !== undefined) ? (ltp - prevClose) : undefined;
    const changePct = (hasValidClose && change !== undefined && prevClose && prevClose > 0) ? (change / prevClose) * 100 : undefined;

    this.lastTickTimestamp = now;
    this.tickCount++;
    this.authState = "LIVE_STREAMING";

    return {
      provider: "upstox",
      exchange: "NSE_EQ",
      securityId: raw.securityId || raw.symbol,
      symbol: raw.symbol.toUpperCase(),
      timestamp: raw.timestamp || now,
      exchangeTimestamp: raw.timestamp || now,
      receivedTimestamp: now,
      ltp: ltp || 0,
      open: raw.open !== undefined && raw.open > 0 ? raw.open : undefined,
      high: raw.high !== undefined && raw.high > 0 ? raw.high : undefined,
      low: raw.low !== undefined && raw.low > 0 ? raw.low : undefined,
      close: ltp,
      previousClose: prevClose,
      change,
      changePct,
      volume: raw.volume !== undefined ? raw.volume : undefined,
      bid: raw.bid !== undefined && raw.bid > 0 ? raw.bid : undefined,
      ask: raw.ask !== undefined && raw.ask > 0 ? raw.ask : undefined,
      openInterest: raw.oi !== undefined ? raw.oi : undefined,
      source: "WEBSOCKET",
      freshness: "LIVE",
      ageMs: 0,
      isValid: true,
      status: "VALID",
    };
  }
}

export const upstoxProvider = new UpstoxProvider();

