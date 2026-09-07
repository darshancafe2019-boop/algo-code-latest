/**
 * Centralized Market Data Manager & Subscription Hub
 */
import { BrokerName, Instrument, MarketDataCallback, NormalizedTick } from "../brokers/types";
import { brokerManager } from "../brokers/broker-manager";
import { instrumentRegistry } from "./instrument-registry";

export interface ConnectionHealth {
  broker: BrokerName;
  status: "CONNECTED" | "CONNECTING" | "DISCONNECTED" | "STALE" | "ERROR";
  lastTickTimestamp: number;
  isStale: boolean;
}

export class MarketDataManager {
  private static instance: MarketDataManager | null = null;
  private subscribers: Map<string, Set<MarketDataCallback>> = new Map();
  private cache: Map<string, NormalizedTick> = new Map();
  private healthState: Map<BrokerName, ConnectionHealth> = new Map();

  private constructor() {
    this.healthState.set("dhan", { broker: "dhan", status: "DISCONNECTED", lastTickTimestamp: 0, isStale: false });
    this.healthState.set("upstox", { broker: "upstox", status: "DISCONNECTED", lastTickTimestamp: 0, isStale: false });
    this.healthState.set("delta", { broker: "delta", status: "DISCONNECTED", lastTickTimestamp: 0, isStale: false });
  }

  public static getInstance(): MarketDataManager {
    if (!MarketDataManager.instance) {
      MarketDataManager.instance = new MarketDataManager();
    }
    return MarketDataManager.instance;
  }

  public subscribe(symbol: string, broker: BrokerName, callback: MarketDataCallback): () => void {
    const inst = instrumentRegistry.resolve(symbol, broker);
    const key = `${broker}:${inst.instrumentId}`;

    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
      const adapter = brokerManager.getAdapter(broker);
      adapter.subscribeMarketData([inst], (tick) => this.handleIncomingTick(tick));
    }

    this.subscribers.get(key)!.add(callback);

    // Send cached tick if available
    const cached = this.cache.get(key);
    if (cached) {
      callback(cached);
    }

    return () => {
      const set = this.subscribers.get(key);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.subscribers.delete(key);
          try {
            const adapter = brokerManager.getAdapter(broker);
            adapter.unsubscribeMarketData([inst]);
          } catch {}
        }
      }
    };
  }

  public getCachedTick(symbol: string, broker: BrokerName): NormalizedTick | undefined {
    const inst = instrumentRegistry.resolve(symbol, broker);
    return this.cache.get(`${broker}:${inst.instrumentId}`);
  }

  public getHealth(broker: BrokerName): ConnectionHealth {
    const h = this.healthState.get(broker) || {
      broker,
      status: "DISCONNECTED",
      lastTickTimestamp: 0,
      isStale: false,
    };
    if (h.lastTickTimestamp > 0 && Date.now() - h.lastTickTimestamp > 30000) {
      h.isStale = true;
      h.status = "STALE";
    }
    return h;
  }

  private handleIncomingTick(tick: NormalizedTick): void {
    const key = `${tick.broker}:${tick.instrumentId}`;
    this.cache.set(key, tick);

    const h = this.healthState.get(tick.broker);
    if (h) {
      h.lastTickTimestamp = Date.now();
      h.status = "CONNECTED";
      h.isStale = false;
    }

    const listeners = this.subscribers.get(key);
    if (listeners) {
      listeners.forEach((cb) => {
        try {
          cb(tick);
        } catch {}
      });
    }
  }
}

export const marketDataManager = MarketDataManager.getInstance();
