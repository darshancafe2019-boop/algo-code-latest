/**
 * Centralized Live Market Data Engine - Master Core Coordinator
 * Connects and orchestrates multi-broker providers (Dhan primary, Upstox secondary, Delta crypto),
 * normalizes feeds into unified MarketTick packets, and broadcasts updates via MarketEventBus.
 */

import {
  BrokerProvider,
  ConnectionState,
  ExchangeSegment,
  MarketDepth,
  MarketTick,
  NormalizedQuote,
  OHLCVCandle,
  OptionChainSnapshot,
  ProviderHealthEntry,
  CandleTimeframe,
} from "../types";
import { marketEventBus } from "./event-bus";
import { marketState } from "../market-state";
import { MarketFreshnessEngine } from "../freshness";
import { MarketDataValidator } from "../validator";
import { marketHealthMonitor } from "../health";
import { instrumentMaster } from "../instrument-master";

export interface MarketDataProvider {
  readonly providerId: BrokerProvider;
  readonly name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(symbols: string[], reason?: string): Promise<void>;
  unsubscribe(symbols: string[], reason?: string): Promise<void>;
  getQuote(symbol: string): Promise<NormalizedQuote | null>;
  getCandles(symbol: string, timeframe: CandleTimeframe, limit?: number): Promise<OHLCVCandle[]>;
  getOrderBook(symbol: string): Promise<MarketDepth | null>;
  getHealth(): ProviderHealthEntry;
}

export class CentralMarketDataEngine {
  private static instance: CentralMarketDataEngine | null = null;
  private providers: Map<BrokerProvider, MarketDataProvider> = new Map();
  private primaryIndianProvider: BrokerProvider = "dhan";
  private secondaryIndianProvider: BrokerProvider = "upstox";
  private cryptoProvider: BrokerProvider = "delta";
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): CentralMarketDataEngine {
    if (!CentralMarketDataEngine.instance) {
      CentralMarketDataEngine.instance = new CentralMarketDataEngine();
    }
    return CentralMarketDataEngine.instance;
  }

  public registerProvider(provider: MarketDataProvider): void {
    this.providers.set(provider.providerId, provider);
  }

  public getProvider(id: BrokerProvider): MarketDataProvider | undefined {
    return this.providers.get(id);
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    for (const [id, provider] of this.providers.entries()) {
      try {
        await provider.connect();
      } catch (err) {
        console.warn(`[MarketEngine] Provider ${id} initial connect warning:`, err);
      }
    }
  }

  /**
   * Ingest a normalized MarketTick into the engine.
   * Performs validation, freshness tagging, state updating, and event broadcasting.
   */
  public ingestTick(tick: MarketTick): boolean {
    // 1. Validation & Anomaly Detection
    const validation = MarketDataValidator.validateTick(tick);
    if (!validation.isValid) {
      tick.isValid = false;
      tick.status = "ANOMALY";
      return false;
    }

    // 2. Freshness tagging
    const freshness = MarketFreshnessEngine.evaluateTick(tick);
    tick.freshness = freshness.status;
    tick.ageMs = freshness.ageMs;
    tick.isValid = true;
    tick.status = "VALID";

    // 3. Update central MarketState
    marketState.ingestTick(tick);

    // 4. Emit to MarketEventBus
    marketEventBus.emit("TICK", { symbol: tick.symbol, tick });
    marketEventBus.emitSymbolTick(tick.symbol, tick);

    // 5. Update quote and emit if quote changed
    const quote = marketState.getQuote(tick.symbol);
    if (quote) {
      marketEventBus.emit("QUOTE", { symbol: tick.symbol, quote });
    }

    // 6. Record metrics in health monitor
    marketHealthMonitor.recordTick(tick.provider, tick.symbol);

    return true;
  }

  /**
   * Universal dynamic subscribe routing to the appropriate provider
   */
  public async subscribe(symbols: string[], reason: string = "TERMINAL_VIEW"): Promise<void> {
    const dhanSymbols: string[] = [];
    const upstoxSymbols: string[] = [];
    const deltaSymbols: string[] = [];

    for (const sym of symbols) {
      const res = instrumentMaster.resolve(sym);
      if (res?.provider === "delta" || res?.exchange === "DELTA_PERP") {
        deltaSymbols.push(sym);
      } else if (res?.provider === "upstox") {
        upstoxSymbols.push(sym);
      } else {
        dhanSymbols.push(sym);
      }
    }

    if (dhanSymbols.length > 0 && this.providers.has("dhan")) {
      await this.providers.get("dhan")!.subscribe(dhanSymbols, reason);
    }
    if (upstoxSymbols.length > 0 && this.providers.has("upstox")) {
      await this.providers.get("upstox")!.subscribe(upstoxSymbols, reason);
    }
    if (deltaSymbols.length > 0 && this.providers.has("delta")) {
      await this.providers.get("delta")!.subscribe(deltaSymbols, reason);
    }
  }

  /**
   * Universal unsubscribe
   */
  public async unsubscribe(symbols: string[], reason: string = "TERMINAL_VIEW"): Promise<void> {
    for (const provider of this.providers.values()) {
      await provider.unsubscribe(symbols, reason);
    }
  }

  /**
   * Cross-broker price validation for critical Indian instruments
   */
  public validateCrossBrokerLTP(symbol: string, thresholdPct: number = 0.5): {
    hasConflict: boolean;
    dhanLtp?: number;
    upstoxLtp?: number;
    deviationPct?: number;
  } {
    const dhanQuote = marketState.getQuote(symbol);
    const upstoxTick = marketState.getTick(`${symbol}_UPSTOX`);

    if (!dhanQuote || !upstoxTick || dhanQuote.last_price <= 0 || upstoxTick.ltp <= 0) {
      return { hasConflict: false };
    }

    const diff = Math.abs(dhanQuote.last_price - upstoxTick.ltp);
    const deviationPct = (diff / dhanQuote.last_price) * 100;

    return {
      hasConflict: deviationPct > thresholdPct,
      dhanLtp: dhanQuote.last_price,
      upstoxLtp: upstoxTick.ltp,
      deviationPct: Number(deviationPct.toFixed(3)),
    };
  }
}

export const centralMarketEngine = CentralMarketDataEngine.getInstance();
