/**
 * Centralized Live Market Data Engine - DhanHQ V2 Provider Adapter
 * Implements the MarketDataProvider interface for Dhan Live WebSocket & REST APIs.
 */

import {
  BrokerProvider,
  CandleTimeframe,
  MarketDepth,
  NormalizedQuote,
  OHLCVCandle,
  ProviderHealthEntry,
} from "../../types";
import { MarketDataProvider } from "../../core/market-data-engine";
import { DhanLiveFeed } from "../../dhan-feed";
import { marketState } from "../../market-state";
import { marketHealthMonitor } from "../../health";
import { subscriptionManager } from "../../subscription-manager";
import { hasDhanCredentials } from "../../config";

export class DhanProvider implements MarketDataProvider {
  public readonly providerId: BrokerProvider = "dhan";
  public readonly name: string = "DhanHQ V2 Live Feed";
  private feed: DhanLiveFeed;

  constructor() {
    this.feed = DhanLiveFeed.getInstance();
  }

  public async connect(): Promise<void> {
    if (hasDhanCredentials()) {
      this.feed.connect();
    }
  }

  public async disconnect(): Promise<void> {
    this.feed.disconnect();
  }

  public async subscribe(symbols: string[], reason: string = "TERMINAL"): Promise<void> {
    for (const sym of symbols) {
      subscriptionManager.subscribe(sym, reason);
    }
  }

  public async unsubscribe(symbols: string[], reason: string = "TERMINAL"): Promise<void> {
    for (const sym of symbols) {
      subscriptionManager.unsubscribe(sym, reason);
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
    return marketHealthMonitor.getProviderHealth("dhan");
  }
}

export const dhanProvider = new DhanProvider();
