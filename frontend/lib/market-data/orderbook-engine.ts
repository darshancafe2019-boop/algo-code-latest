/**
 * Centralized Live Market Data Engine - Order Book Depth Engine
 * Manages 5-level and 20-level market depth, spread, and order flow imbalance.
 */

import { marketState } from "./market-state";
import { DepthLevel, MarketDepth } from "./types";

export class LiveOrderBookEngine {
  private static instance: LiveOrderBookEngine | null = null;
  private orderBooks: Map<string, MarketDepth> = new Map();

  private constructor() {}

  public static getInstance(): LiveOrderBookEngine {
    if (!LiveOrderBookEngine.instance) {
      LiveOrderBookEngine.instance = new LiveOrderBookEngine();
    }
    return LiveOrderBookEngine.instance;
  }

  public updateDepth(
    symbol: string,
    bids: DepthLevel[],
    asks: DepthLevel[],
    timestamp: number = Date.now()
  ): MarketDepth {
    const symKey = symbol.toUpperCase();

    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 0;
    const spread = bestAsk > 0 && bestBid > 0 ? parseFloat((bestAsk - bestBid).toFixed(2)) : 0;
    const spreadPct = bestBid > 0 ? parseFloat(((spread / bestBid) * 100).toFixed(4)) : 0;

    const totalBidQty = bids.reduce((acc, b) => acc + b.quantity, 0);
    const totalAskQty = asks.reduce((acc, a) => acc + a.quantity, 0);
    const totalQty = totalBidQty + totalAskQty;
    const imbalanceRatio = totalQty > 0 ? parseFloat(((totalBidQty - totalAskQty) / totalQty).toFixed(4)) : 0;

    const depth: MarketDepth = {
      bids,
      asks,
      spread,
      spreadPct,
      totalBidQty,
      totalAskQty,
      imbalanceRatio,
      timestamp,
    };

    this.orderBooks.set(symKey, depth);
    marketState.setDepth(symKey, depth);

    return depth;
  }

  public getDepth(symbol: string): MarketDepth | undefined {
    return this.orderBooks.get(symbol.toUpperCase()) || marketState.getDepth(symbol);
  }

  public getOrderBook(symbol: string): MarketDepth | undefined {
    return this.getDepth(symbol);
  }
}

export const liveOrderBookEngine = LiveOrderBookEngine.getInstance();
export const orderBookEngine = liveOrderBookEngine;

