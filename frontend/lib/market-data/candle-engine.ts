/**
 * Centralized Live Market Data Engine - Multi-Timeframe Candle Engine
 * Builds real-time OHLCV candles from ticks with strict CLOSED_CANDLE confirmation.
 */

import { TIMEFRAME_TO_MS } from "./constants";
import { marketState } from "./market-state";
import { CandleTimeframe, MarketTick, OHLCVCandle } from "./types";

export type CandleCloseListener = (candle: OHLCVCandle) => void;

export class LiveCandleEngine {
  private static instance: LiveCandleEngine | null = null;
  private formingCandles: Map<string, OHLCVCandle> = new Map();
  private closeListeners: Map<string, Set<CandleCloseListener>> = new Map();

  private constructor() {
    this.bindMarketState();
  }

  public static getInstance(): LiveCandleEngine {
    if (!LiveCandleEngine.instance) {
      LiveCandleEngine.instance = new LiveCandleEngine();
    }
    return LiveCandleEngine.instance;
  }

  private bindMarketState() {
    marketState.subscribeGlobal((tick) => {
      this.processTick(tick);
    });
  }

  /**
   * Ingests a market tick and updates forming candles across all supported timeframes.
   */
  public processTick(tick: MarketTick): void {
    const isValid = tick.status === "VALID" || (tick as any).isValid !== false;
    if (!isValid || tick.ltp <= 0) return;

    const timeframes: CandleTimeframe[] = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1D"];
    for (const tf of timeframes) {
      this.updateTimeframeCandle(tick, tf);
    }
  }

  private updateTimeframeCandle(tick: MarketTick, timeframe: CandleTimeframe): void {
    const symbol = tick.symbol.toUpperCase();
    const intervalMs = TIMEFRAME_TO_MS[timeframe];
    const tickTime = tick.exchangeTimestamp || tick.timestamp;
    const bucketTimestamp = Math.floor(tickTime / intervalMs) * intervalMs;
    const key = `${symbol}:${timeframe}`;

    let forming = this.formingCandles.get(key);

    if (!forming) {
      // Initialize new forming candle
      forming = {
        symbol,
        timeframe,
        timestamp: bucketTimestamp,
        open: tick.ltp,
        high: tick.ltp,
        low: tick.ltp,
        close: tick.ltp,
        volume: tick.volume || 0,
        tradesCount: 1,
        isClosed: false,
      };
      this.formingCandles.set(key, forming);
    } else if (bucketTimestamp > forming.timestamp) {
      // Previous candle CLOSED!
      forming.isClosed = true;

      // 1. Append closed candle to market state
      const historical = marketState.getCandles(symbol, timeframe);
      const updated = [...historical, { ...forming }];
      if (updated.length > 500) updated.shift();
      marketState.setCandles(symbol, timeframe, updated);

      // 2. Notify closed candle listeners (for strategies & indicators)
      this.emitClosedCandle(symbol, timeframe, forming);

      // 3. Start new forming candle
      forming = {
        symbol,
        timeframe,
        timestamp: bucketTimestamp,
        open: tick.ltp,
        high: tick.ltp,
        low: tick.ltp,
        close: tick.ltp,
        volume: tick.volume || 0,
        tradesCount: 1,
        isClosed: false,
      };
      this.formingCandles.set(key, forming);
    } else {
      // Update existing forming candle
      forming.close = tick.ltp;
      if (tick.ltp > forming.high) forming.high = tick.ltp;
      if (tick.ltp < forming.low) forming.low = tick.ltp;
      if (tick.volume > 0) forming.volume += tick.volume;
      forming.tradesCount = (forming.tradesCount || 0) + 1;
    }
  }

  private emitClosedCandle(symbol: string, timeframe: CandleTimeframe, candle: OHLCVCandle) {
    const key = `${symbol}:${timeframe}`;
    const listeners = this.closeListeners.get(key);
    if (listeners) {
      listeners.forEach((cb) => {
        try {
          cb(candle);
        } catch (e) {
          console.error(`[LiveCandleEngine] Error in closed candle listener for ${key}:`, e);
        }
      });
    }
  }

  /**
   * Subscribe to closed candle events (strictly completed closed candles, zero lookahead).
   */
  public onCandleClose(
    symbol: string,
    timeframe: CandleTimeframe,
    callback: CandleCloseListener
  ): () => void {
    const key = `${symbol.toUpperCase()}:${timeframe}`;
    if (!this.closeListeners.has(key)) {
      this.closeListeners.set(key, new Set());
    }
    this.closeListeners.get(key)!.add(callback);

    return () => {
      const set = this.closeListeners.get(key);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.closeListeners.delete(key);
      }
    };
  }

  public getFormingCandle(symbol: string, timeframe: CandleTimeframe): OHLCVCandle | undefined {
    return this.formingCandles.get(`${symbol.toUpperCase()}:${timeframe}`);
  }

  public ingestTick(tick: MarketTick): void {
    this.processTick(tick);
  }

  public getCandles(symbol: string, timeframe: CandleTimeframe, limit: number = 100): OHLCVCandle[] {
    return marketState.getCandles(symbol, timeframe, limit);
  }
}

export const liveCandleEngine = LiveCandleEngine.getInstance();
export const candleEngine = liveCandleEngine;

