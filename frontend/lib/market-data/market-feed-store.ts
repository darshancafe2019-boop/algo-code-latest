"use client";

import { create } from "zustand";
import { getQuoteAliases } from "./canonical-symbol";

export interface NormalizedMarketTick {
  symbol: string;
  tradingSymbol?: string;
  securityId?: string;
  exchangeSegment?: string;
  exchange: string;
  provider: string;
  lastPrice: number;
  bid: number;
  ask: number;
  bidQty?: number;
  askQty?: number;
  volume: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  previousClose?: number | null;
  change: number;
  changePercent: number;
  averagePrice?: number | null;
  oi?: number | null;
  previousOi?: number | null;
  oiChange?: number | null;
  eventTimestamp: string;
  receivedTimestamp: string;
  feedLatencyMs: number;
  dataMode: "REAL_TIME" | "DELAYED" | "EOD" | "CACHED";
  status: "LIVE" | "STALE" | "MARKET_CLOSED" | "UNKNOWN";
  isStale: boolean;
  ageMs: number;
  flashDirection: "up" | "down" | null;
  depth?: any;
}

export interface MarketFeedHealthState {
  connectionStatus: "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "LIVE" | "RECONNECTING" | "STALE" | "ERROR";
  marketStatus: "OPEN" | "CLOSED" | "PRE_OPEN" | "UNKNOWN";
  ticksPerSec: number;
  latencyMs: number;
  activeSubscriptions: number;
  lastTickTime: string | null;
  lastTickAgeMs: number;
  reconnectCount: number;
  parserErrors: number;
  droppedPackets: number;
  primaryProvider: string;
}

interface MarketFeedStore {
  quotesBySymbol: Record<string, NormalizedMarketTick>;
  quotesBySecurityId: Record<string, NormalizedMarketTick>;
  health: MarketFeedHealthState;
  
  // Actions
  ingestTick: (tick: Partial<NormalizedMarketTick> & { symbol: string; lastPrice: number }) => void;
  ingestBatch: (ticks: Array<Partial<NormalizedMarketTick> & { symbol: string; lastPrice: number }>) => void;
  setConnectionStatus: (status: MarketFeedHealthState["connectionStatus"]) => void;
  setMarketStatus: (status: MarketFeedHealthState["marketStatus"]) => void;
  setHealthMetrics: (metrics: Partial<MarketFeedHealthState>) => void;
  clearFlash: (symbol: string) => void;
  getQuote: (symbol: string) => NormalizedMarketTick | undefined;
}

// Micro-batching queues
let pendingTicks: Record<string, Partial<NormalizedMarketTick> & { symbol: string; lastPrice: number }> = {};
let batchRafId: number | null = null;
let tickCounter = 0;
let lastTickRateTime = Date.now();
const flashTimers = new Map<string, NodeJS.Timeout>();

export const useMarketFeedStore = create<MarketFeedStore>((set, get) => ({
  quotesBySymbol: {},
  quotesBySecurityId: {},
  health: {
    connectionStatus: "CONNECTING",
    marketStatus: "UNKNOWN",
    ticksPerSec: 0,
    latencyMs: 0,
    activeSubscriptions: 0,
    lastTickTime: null,
    lastTickAgeMs: 0,
    reconnectCount: 0,
    parserErrors: 0,
    droppedPackets: 0,
    primaryProvider: "DHAN",
  },

  ingestTick: (tick) => {
    const sym = tick.symbol.toUpperCase();
    pendingTicks[sym] = tick;
    tickCounter++;

    if (!batchRafId && typeof window !== "undefined") {
      batchRafId = window.requestAnimationFrame(() => {
        batchRafId = null;
        const currentPending = pendingTicks;
        pendingTicks = {};
        get().ingestBatch(Object.values(currentPending));
      });
    }
  },

  ingestBatch: (ticks) => {
    const now = Date.now();
    const nowIso = new Date().toISOString();

    set((state) => {
      const updatedQuotes = { ...state.quotesBySymbol };
      const updatedSecQuotes = { ...state.quotesBySecurityId };
      let lastLatency = state.health.latencyMs;

      for (const tick of ticks) {
        const sym = tick.symbol.toUpperCase();
        const existing = updatedQuotes[sym];
        const newLtp = tick.lastPrice;
        let flashDir: "up" | "down" | null = null;

        if (existing && existing.lastPrice > 0 && newLtp !== existing.lastPrice) {
          flashDir = newLtp > existing.lastPrice ? "up" : "down";
        }

        const prevClose = tick.previousClose ?? existing?.previousClose ?? tick.close ?? newLtp;
        const rawChange = tick.change ?? (prevClose > 0 ? newLtp - prevClose : 0);
        const rawChangePct = tick.changePercent ?? (prevClose > 0 ? (rawChange / prevClose) * 100 : 0);
        const latency = tick.feedLatencyMs ?? existing?.feedLatencyMs ?? 0;
        if (latency > 0) lastLatency = latency;

        const normalized: NormalizedMarketTick = {
          symbol: sym,
          tradingSymbol: tick.tradingSymbol || existing?.tradingSymbol || sym,
          securityId: tick.securityId || existing?.securityId,
          exchangeSegment: tick.exchangeSegment || existing?.exchangeSegment || "NSE_EQ",
          exchange: tick.exchange || existing?.exchange || "NSE",
          provider: tick.provider || existing?.provider || "DHAN",
          lastPrice: newLtp,
          bid: tick.bid ?? existing?.bid ?? newLtp,
          ask: tick.ask ?? existing?.ask ?? newLtp,
          bidQty: tick.bidQty ?? existing?.bidQty,
          askQty: tick.askQty ?? existing?.askQty,
          volume: tick.volume ?? existing?.volume ?? 0,
          open: tick.open ?? existing?.open ?? null,
          high: tick.high ?? existing?.high ?? null,
          low: tick.low ?? existing?.low ?? null,
          close: tick.close ?? existing?.close ?? null,
          previousClose: prevClose,
          change: Math.round(rawChange * 100) / 100,
          changePercent: Math.round(rawChangePct * 100) / 100,
          averagePrice: tick.averagePrice ?? existing?.averagePrice ?? null,
          oi: tick.oi ?? existing?.oi ?? null,
          previousOi: tick.previousOi ?? existing?.previousOi ?? null,
          oiChange: tick.oiChange ?? existing?.oiChange ?? null,
          eventTimestamp: tick.eventTimestamp || existing?.eventTimestamp || nowIso,
          receivedTimestamp: nowIso,
          feedLatencyMs: latency,
          dataMode: tick.dataMode || "REAL_TIME",
          status: tick.status || (tick.isStale ? "STALE" : "LIVE"),
          isStale: tick.isStale ?? false,
          ageMs: tick.ageMs ?? 0,
          flashDirection: flashDir,
          depth: tick.depth || existing?.depth,
        };

        updatedQuotes[sym] = normalized;
        const aliases = getQuoteAliases(tick.symbol, tick.exchange, tick.provider);
        aliases.forEach((alias) => {
          updatedQuotes[alias] = normalized;
        });

        if (normalized.securityId) {
          updatedSecQuotes[normalized.securityId] = normalized;
        }

        // Set auto-clearing timer for price flash (200ms)
        if (flashDir) {
          if (flashTimers.has(sym)) {
            clearTimeout(flashTimers.get(sym)!);
          }
          const t = setTimeout(() => {
            get().clearFlash(sym);
            flashTimers.delete(sym);
          }, 200);
          flashTimers.set(sym, t);
        }
      }

      // Calculate rolling tick rate per second
      let currentTicksPerSec = state.health.ticksPerSec;
      const elapsedRateMs = now - lastTickRateTime;
      if (elapsedRateMs >= 1000) {
        currentTicksPerSec = Math.round((tickCounter * 1000) / elapsedRateMs);
        tickCounter = 0;
        lastTickRateTime = now;
      }

      return {
        quotesBySymbol: updatedQuotes,
        quotesBySecurityId: updatedSecQuotes,
        health: {
          ...state.health,
          ticksPerSec: currentTicksPerSec,
          latencyMs: lastLatency,
          lastTickTime: nowIso,
          lastTickAgeMs: 0,
          connectionStatus: state.health.connectionStatus === "CONNECTING" ? "LIVE" : state.health.connectionStatus,
        },
      };
    });
  },

  clearFlash: (symbol) => {
    const sym = symbol.toUpperCase();
    set((state) => {
      const q = state.quotesBySymbol[sym];
      if (!q || !q.flashDirection) return state;
      return {
        quotesBySymbol: {
          ...state.quotesBySymbol,
          [sym]: { ...q, flashDirection: null },
        },
      };
    });
  },

  setConnectionStatus: (status) => {
    set((state) => ({
      health: { ...state.health, connectionStatus: status },
    }));
  },

  setMarketStatus: (status) => {
    set((state) => ({
      health: { ...state.health, marketStatus: status },
    }));
  },

  setHealthMetrics: (metrics) => {
    set((state) => ({
      health: { ...state.health, ...metrics },
    }));
  },

  getQuote: (symbol) => {
    const sym = symbol.toUpperCase();
    const quotes = get().quotesBySymbol;
    return (
      quotes[sym] ||
      quotes[sym.replace(" 50", "")] ||
      quotes[sym.replace(" ", "")] ||
      quotes[sym.replace("/", "")] ||
      quotes[`NSE:${sym}`] ||
      quotes[`BSE:${sym}`] ||
      quotes[`NSE:${sym.replace(" 50", "")}`] ||
      quotes[`BSE:${sym.replace(" ", "")}`]
    );
  },
}));

// ─── Selector Hooks ──────────────────────────────────────────────────────────

export function useSymbolQuote(symbol?: string | null): NormalizedMarketTick | undefined {
  return useMarketFeedStore((state) => {
    if (!symbol) return undefined;
    const sym = symbol.toUpperCase();
    const quotes = state.quotesBySymbol;
    return (
      quotes[sym] ||
      quotes[sym.replace(" 50", "")] ||
      quotes[sym.replace(" ", "")] ||
      quotes[sym.replace("/", "")] ||
      quotes[`NSE:${sym}`] ||
      quotes[`BSE:${sym}`] ||
      quotes[`NSE:${sym.replace(" 50", "")}`] ||
      quotes[`BSE:${sym.replace(" ", "")}`]
    );
  });
}

export function useFeedHealth(): MarketFeedHealthState {
  return useMarketFeedStore((state) => state.health);
}

export function useMarketIndicesQuotes(symbols: string[] = ["NIFTY 50", "BANKNIFTY", "FINNIFTY", "SENSEX", "MIDCPNIFTY"]) {
  return useMarketFeedStore((state) => {
    return symbols.map((sym) => {
      const upper = sym.toUpperCase();
      const quote = state.quotesBySymbol[upper] || state.quotesBySymbol[upper.replace(" 50", "")];
      return {
        symbol: sym,
        quote,
      };
    });
  });
}
