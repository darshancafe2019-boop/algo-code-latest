/**
 * Centralized Live Market Data Engine - Subscription Manager
 * Handles reference counting, batching, and multi-socket distribution.
 */

import { DHAN_WS_LIMITS } from "./constants";
import { instrumentMaster } from "./instrument-master";
import { BrokerProvider, InstrumentMasterRecord } from "./types";

export interface ActiveSubscription {
  symbol: string;
  instrument: InstrumentMasterRecord;
  reasons: Set<string>;
  feedMode: number; // 15=Depth, 17=Ticker, 18=Quote, 19=Full
  connectionId: number;
  subscribedAt: number;
}

export class SubscriptionManager {
  private static instance: SubscriptionManager | null = null;
  private subscriptions: Map<string, ActiveSubscription> = new Map();
  private connectionAllocations: Map<number, Set<string>> = new Map();

  private onSendSubscribeBatch?: (
    provider: BrokerProvider,
    connectionId: number,
    records: InstrumentMasterRecord[],
    feedMode: number
  ) => void;

  private onSendUnsubscribeBatch?: (
    provider: BrokerProvider,
    connectionId: number,
    records: InstrumentMasterRecord[]
  ) => void;

  private constructor() {
    for (let i = 0; i < DHAN_WS_LIMITS.MAX_CONNECTIONS; i++) {
      this.connectionAllocations.set(i, new Set());
    }
  }

  public static getInstance(): SubscriptionManager {
    if (!SubscriptionManager.instance) {
      SubscriptionManager.instance = new SubscriptionManager();
    }
    return SubscriptionManager.instance;
  }

  public setTransportCallbacks(
    onSubscribe: (
      provider: BrokerProvider,
      connectionId: number,
      records: InstrumentMasterRecord[],
      feedMode: number
    ) => void,
    onUnsubscribe: (
      provider: BrokerProvider,
      connectionId: number,
      records: InstrumentMasterRecord[]
    ) => void
  ) {
    this.onSendSubscribeBatch = onSubscribe;
    this.onSendUnsubscribeBatch = onUnsubscribe;
  }

  /**
   * Subscribe an instrument with reference counting.
   */
  public subscribe(
    symbol: string,
    reason: string = "CHART_VIEW",
    feedMode: number = 19
  ): InstrumentMasterRecord | undefined {
    const symKey = symbol.toUpperCase();
    const inst = instrumentMaster.resolve(symKey);
    if (!inst) {
      console.warn(`[SubscriptionManager] Unknown instrument: ${symbol}`);
      return undefined;
    }

    let sub = this.subscriptions.get(symKey);
    if (!sub) {
      // Allocate to socket connection with fewest subscriptions
      const connId = this.findLeastLoadedConnection();
      sub = {
        symbol: symKey,
        instrument: inst,
        reasons: new Set([reason]),
        feedMode,
        connectionId: connId,
        subscribedAt: Date.now(),
      };
      this.subscriptions.set(symKey, sub);
      this.connectionAllocations.get(connId)?.add(symKey);

      // Trigger wire subscription
      if (this.onSendSubscribeBatch) {
        this.onSendSubscribeBatch(inst.provider, connId, [inst], feedMode);
      }
    } else {
      sub.reasons.add(reason);
    }

    return inst;
  }

  /**
   * Unsubscribe with reference counting. Only drops from socket when reason count reaches 0.
   */
  public unsubscribe(symbol: string, reason: string = "CHART_VIEW"): void {
    const symKey = symbol.toUpperCase();
    const sub = this.subscriptions.get(symKey);
    if (!sub) return;

    sub.reasons.delete(reason);
    if (sub.reasons.size === 0) {
      this.subscriptions.delete(symKey);
      this.connectionAllocations.get(sub.connectionId)?.delete(symKey);

      if (this.onSendUnsubscribeBatch) {
        this.onSendUnsubscribeBatch(sub.instrument.provider, sub.connectionId, [sub.instrument]);
      }
    }
  }

  /**
   * Batch subscribe multiple symbols.
   */
  public subscribeMany(symbols: string[], reason: string = "WATCHLIST", feedMode: number = 18): void {
    const byConnAndProvider = new Map<string, InstrumentMasterRecord[]>();

    for (const sym of symbols) {
      const symKey = sym.toUpperCase();
      const inst = instrumentMaster.resolve(symKey);
      if (!inst) continue;

      let sub = this.subscriptions.get(symKey);
      if (!sub) {
        const connId = this.findLeastLoadedConnection();
        sub = {
          symbol: symKey,
          instrument: inst,
          reasons: new Set([reason]),
          feedMode,
          connectionId: connId,
          subscribedAt: Date.now(),
        };
        this.subscriptions.set(symKey, sub);
        this.connectionAllocations.get(connId)?.add(symKey);

        const key = `${inst.provider}:${connId}`;
        if (!byConnAndProvider.has(key)) {
          byConnAndProvider.set(key, []);
        }
        byConnAndProvider.get(key)!.push(inst);
      } else {
        sub.reasons.add(reason);
      }
    }

    // Send batched subscriptions respecting max packet chunk limits
    if (this.onSendSubscribeBatch) {
      byConnAndProvider.forEach((records, key) => {
        const [prov, connIdStr] = key.split(":");
        const connId = parseInt(connIdStr);
        const chunkSize = DHAN_WS_LIMITS.MAX_INSTRUMENTS_PER_SUBSCRIBE_PACKET;
        for (let i = 0; i < records.length; i += chunkSize) {
          const chunk = records.slice(i, i + chunkSize);
          this.onSendSubscribeBatch(prov as BrokerProvider, connId, chunk, feedMode);
        }
      });
    }
  }

  /**
   * Restores all active subscriptions on connection reconnect.
   */
  public restoreSubscriptionsForConnection(connectionId: number): void {
    const syms = this.connectionAllocations.get(connectionId);
    if (!syms || syms.size === 0 || !this.onSendSubscribeBatch) return;

    const records: InstrumentMasterRecord[] = [];
    let provider: BrokerProvider = "dhan";
    let feedMode = 19;

    syms.forEach((sym) => {
      const sub = this.subscriptions.get(sym);
      if (sub) {
        records.push(sub.instrument);
        provider = sub.instrument.provider;
        feedMode = sub.feedMode;
      }
    });

    if (records.length > 0) {
      const chunkSize = DHAN_WS_LIMITS.MAX_INSTRUMENTS_PER_SUBSCRIBE_PACKET;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        this.onSendSubscribeBatch(provider, connectionId, chunk, feedMode);
      }
    }
  }

  private findLeastLoadedConnection(): number {
    let minConn = 0;
    let minCount = Infinity;
    this.connectionAllocations.forEach((set, id) => {
      if (set.size < minCount) {
        minCount = set.size;
        minConn = id;
      }
    });
    return minConn;
  }

  public getSubscribedSymbols(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  public getActiveSymbols(): string[] {
    return this.getSubscribedSymbols();
  }

  public getSubscribedCount(): number {
    return this.subscriptions.size;
  }
}

export const subscriptionManager = SubscriptionManager.getInstance();

