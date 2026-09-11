/**
 * Centralized Live Market Data Engine - Delta Exchange India Provider Adapter
 * Implements the MarketDataProvider interface for Delta India Crypto Derivatives (BTC, ETH, SOL, XRP).
 */

import {
  BrokerProvider,
  CandleTimeframe,
  MarketDepth,
  MarketTick,
  NormalizedQuote,
  OHLCVCandle,
  ProviderHealthEntry,
} from "../../types";
import { MarketDataProvider } from "../../core/market-data-engine";
import { marketState } from "../../market-state";
import { marketHealthMonitor } from "../../health";

export class DeltaProvider implements MarketDataProvider {
  public readonly providerId: BrokerProvider = "delta";
  public readonly name: string = "Delta India Crypto Feed";
  private subscriptions: Set<string> = new Set();
  private isConnected = false;

  public async connect(): Promise<void> {
    this.isConnected = true;
  }

  public async disconnect(): Promise<void> {
    this.isConnected = false;
    this.subscriptions.clear();
  }

  public async subscribe(symbols: string[], reason: string = "TERMINAL"): Promise<void> {
    for (const sym of symbols) {
      this.subscriptions.add(sym.toUpperCase());
    }
  }

  public async unsubscribe(symbols: string[], reason: string = "TERMINAL"): Promise<void> {
    for (const sym of symbols) {
      this.subscriptions.delete(sym.toUpperCase());
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
    return marketHealthMonitor.getProviderHealth("delta");
  }

  /**
   * Normalizes Delta Exchange India public WebSocket packet into unified MarketTick
   */
  public normalizeDeltaTick(raw: {
    symbol: string;
    mark_price?: number | string;
    spot_price?: number | string;
    close?: number | string;
    open?: number | string;
    high?: number | string;
    low?: number | string;
    volume?: number | string;
    oi?: number | string;
    funding_rate?: number | string;
    quotes?: {
      best_bid?: number | string;
      best_ask?: number | string;
      bid_size?: number | string;
      ask_size?: number | string;
    };
    timestamp?: number;
  }): MarketTick {
    const now = Date.now();
    const ltp = Number(raw.mark_price ?? raw.close ?? raw.spot_price ?? 0);
    const open = Number(raw.open ?? ltp);
    const change = ltp - open;
    const changePct = open > 0 ? (change / open) * 100 : 0;

    return {
      provider: "delta",
      exchange: "DELTA_PERP",
      securityId: raw.symbol,
      symbol: raw.symbol.toUpperCase(),
      timestamp: raw.timestamp ? Math.floor(raw.timestamp / 1000) : now,
      exchangeTimestamp: raw.timestamp ? Math.floor(raw.timestamp / 1000) : now,
      receivedTimestamp: now,
      ltp,
      open,
      high: Number(raw.high ?? ltp),
      low: Number(raw.low ?? ltp),
      close: ltp,
      previousClose: open,
      change,
      changePct,
      volume: Number(raw.volume ?? 0),
      bid: Number(raw.quotes?.best_bid ?? 0),
      ask: Number(raw.quotes?.best_ask ?? 0),
      bidQuantity: Number(raw.quotes?.bid_size ?? 0),
      askQuantity: Number(raw.quotes?.ask_size ?? 0),
      openInterest: Number(raw.oi ?? 0),
      source: "WEBSOCKET",
      freshness: "LIVE",
      ageMs: 0,
      isValid: true,
      status: "VALID",
    };
  }
}

export const deltaProvider = new DeltaProvider();
