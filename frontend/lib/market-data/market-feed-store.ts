"use client";

import { create } from "zustand";
import { getQuoteAliases, getInstrumentIdentity } from "./canonical-symbol";

export interface NormalizedMarketTick {
  symbol: string;
  tradingSymbol?: string;
  securityId?: string;
  exchangeSegment?: string;
  exchange: string;
  provider: string;
  lastPrice: number | null;
  bid: number | null;
  ask: number | null;
  bidQty?: number;
  askQty?: number;
  volume: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  previousClose?: number | null;
  change: number | null;
  changePercent: number | null;
  averagePrice?: number | null;
  oi?: number | null;
  previousOi?: number | null;
  oiChange?: number | null;
  eventTimestamp: string;
  receivedTimestamp: string;
  feedLatencyMs: number;
  dataMode: "REAL_TIME" | "DELAYED" | "EOD" | "CACHED";
  status: "LIVE" | "DELAYED" | "STALE" | "MARKET_CLOSED" | "UNAVAILABLE" | "UNKNOWN";
  isStale: boolean;
  ageMs: number;
  flashDirection: "up" | "down" | null;
  depth?: any;
}

export interface StreamEvent {
  id: string;
  receivedTime: string;
  exchangeTime: string;
  provider: string;
  symbol: string;
  eventType: string;
  ltp: number | null;
  bid: number | null;
  ask: number | null;
  quantity: number | null;
  oi: number | null;
  sequence: number | null;
  latency: number;
  rawPayload?: any;
}

export interface ProviderStat {
  provider: string;
  status: "CONNECTED" | "DEGRADED" | "RECONNECTING" | "STALE" | "OFFLINE" | "AUTH_REQUIRED";
  latencyMs: number;
  lastTickAgeMs: number;
  subCount: number;
  msgPerSec: number;
  errorCount: number;
  lastMessageAt: string | null;
}

export interface MarketFeedHealthState {
  connectionStatus: "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "LIVE" | "RECONNECTING" | "STALE" | "ERROR";
  marketStatus: "OPEN" | "CLOSED" | "PRE_OPEN" | "UNKNOWN";
  ticksPerSec: number;
  latencyMs: number;
  p95LatencyMs: number;
  activeSubscriptions: number;
  lastTickTime: string | null;
  lastTickAgeMs: number;
  reconnectCount: number;
  parserErrors: number;
  droppedPackets: number;
  sequenceGaps: number;
  staleCount: number;
  totalMessages: number;
  primaryProvider: string;
  providers: Record<string, ProviderStat>;
}

interface MarketFeedStore {
  quotesBySymbol: Record<string, NormalizedMarketTick>;
  quotesBySecurityId: Record<string, NormalizedMarketTick>;
  health: MarketFeedHealthState;
  streamEvents: StreamEvent[];
  isStreamPaused: boolean;
  
  // Actions
  ingestTick: (tick: Partial<NormalizedMarketTick> & { symbol: string; lastPrice?: number | null; rawPayload?: any }) => void;
  ingestBatch: (ticks: Array<Partial<NormalizedMarketTick> & { symbol: string; lastPrice?: number | null; rawPayload?: any }>) => void;
  appendStreamEvent: (event: StreamEvent) => void;
  clearStreamEvents: () => void;
  setStreamPaused: (paused: boolean) => void;
  recalculateFreshness: () => void;
  setConnectionStatus: (status: MarketFeedHealthState["connectionStatus"]) => void;
  setMarketStatus: (status: MarketFeedHealthState["marketStatus"]) => void;
  setHealthMetrics: (metrics: Partial<MarketFeedHealthState>) => void;
  updateProviderStat: (provider: string, stat: Partial<ProviderStat>) => void;
  clearFlash: (symbol: string) => void;
  getQuote: (symbol: string, exchange?: string, provider?: string) => NormalizedMarketTick | undefined;
}

// Micro-batching queues keyed by immutable instrument identity
let pendingTicks: Record<string, Partial<NormalizedMarketTick> & { symbol: string; lastPrice?: number | null; rawPayload?: any }> = {};
let batchRafId: number | null = null;
let tickCounter = 0;
let lastTickRateTime = Date.now();
const latencyWindow: number[] = [];
const flashTimers = new Map<string, NodeJS.Timeout>();

const INITIAL_PROVIDERS: Record<string, ProviderStat> = {
  DHAN: { provider: "DHAN", status: "OFFLINE", latencyMs: 0, lastTickAgeMs: 0, subCount: 0, msgPerSec: 0, errorCount: 0, lastMessageAt: null },
  UPSTOX: { provider: "UPSTOX", status: "OFFLINE", latencyMs: 0, lastTickAgeMs: 0, subCount: 0, msgPerSec: 0, errorCount: 0, lastMessageAt: null },
  DELTA: { provider: "DELTA", status: "OFFLINE", latencyMs: 0, lastTickAgeMs: 0, subCount: 0, msgPerSec: 0, errorCount: 0, lastMessageAt: null },
  PAPER: { provider: "PAPER", status: "CONNECTED", latencyMs: 0, lastTickAgeMs: 0, subCount: 0, msgPerSec: 0, errorCount: 0, lastMessageAt: null },
};

export const useMarketFeedStore = create<MarketFeedStore>((set, get) => ({
  quotesBySymbol: {},
  quotesBySecurityId: {},
  streamEvents: [],
  isStreamPaused: false,
  health: {
    connectionStatus: "CONNECTING",
    marketStatus: "UNKNOWN",
    ticksPerSec: 0,
    latencyMs: 0,
    p95LatencyMs: 0,
    activeSubscriptions: 0,
    lastTickTime: null,
    lastTickAgeMs: 0,
    reconnectCount: 0,
    parserErrors: 0,
    droppedPackets: 0,
    sequenceGaps: 0,
    staleCount: 0,
    totalMessages: 0,
    primaryProvider: "DHAN",
    providers: INITIAL_PROVIDERS,
  },

  appendStreamEvent: (event) => {
    if (get().isStreamPaused) return;
    set((state) => ({
      streamEvents: [event, ...state.streamEvents].slice(0, 3000),
    }));
  },

  clearStreamEvents: () => {
    set({ streamEvents: [] });
  },

  setStreamPaused: (paused) => {
    set({ isStreamPaused: paused });
  },

  updateProviderStat: (provider, stat) => {
    const provKey = provider.toUpperCase();
    set((state) => {
      const current = state.health.providers[provKey] || {
        provider: provKey,
        status: "OFFLINE",
        latencyMs: 0,
        lastTickAgeMs: 0,
        subCount: 0,
        msgPerSec: 0,
        errorCount: 0,
        lastMessageAt: null,
      };
      return {
        health: {
          ...state.health,
          providers: {
            ...state.health.providers,
            [provKey]: { ...current, ...stat },
          },
        },
      };
    });
  },

  ingestTick: (tick) => {
    const sym = tick.symbol.toUpperCase();
    const prov = (tick.provider || "").toUpperCase();
    const ex = (tick.exchange || "").toUpperCase();
    const key = `${prov}:${ex}:${sym}`;
    pendingTicks[key] = tick;
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
      const newEvents: StreamEvent[] = [];
      const updatedProviders = { ...state.health.providers };

      for (const tick of ticks) {
        const sym = (tick.symbol || "UNKNOWN").toUpperCase();
        const provider = (tick.provider || "UNKNOWN").toUpperCase();
        const exchange = (tick.exchange || "UNKNOWN").toUpperCase();
        const primaryKey = `${provider}:${sym}`;

        // Compute latency
        const incomingTime = tick.eventTimestamp ? new Date(tick.eventTimestamp).getTime() : now;
        const latency = tick.feedLatencyMs ?? (Math.max(0, now - incomingTime));
        if (latency >= 0) {
          lastLatency = latency;
          latencyWindow.push(latency);
          if (latencyWindow.length > 200) latencyWindow.shift();
        }

        // Add to Stream Events buffer
        newEvents.push({
          id: `${provider}_${sym}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          receivedTime: tick.receivedTimestamp || nowIso,
          exchangeTime: tick.eventTimestamp || nowIso,
          provider,
          symbol: sym,
          eventType: tick.status || "TICK",
          ltp: tick.lastPrice ?? null,
          bid: tick.bid ?? null,
          ask: tick.ask ?? null,
          quantity: tick.bidQty ?? tick.askQty ?? null,
          oi: tick.oi ?? null,
          sequence: null,
          latency,
          rawPayload: tick.rawPayload,
        });

        // Update provider telemetry
        const prevProvStat = updatedProviders[provider] || {
          provider,
          status: "CONNECTED",
          latencyMs: latency,
          lastTickAgeMs: 0,
          subCount: 1,
          msgPerSec: 1,
          errorCount: 0,
          lastMessageAt: nowIso,
        };
        updatedProviders[provider] = {
          ...prevProvStat,
          status: "CONNECTED",
          latencyMs: latency,
          lastTickAgeMs: 0,
          lastMessageAt: nowIso,
        };

        // Reject out-of-order updates
        const existing = updatedQuotes[primaryKey] || updatedQuotes[sym];
        const existingTime = existing?.eventTimestamp ? new Date(existing.eventTimestamp).getTime() : 0;
        if (existing && existingTime > 0 && incomingTime < existingTime) {
          continue;
        }

        const newLtp = tick.lastPrice ?? existing?.lastPrice ?? null;
        let flashDir: "up" | "down" | null = null;

        if (existing && existing.lastPrice != null && newLtp != null && newLtp !== existing.lastPrice) {
          flashDir = newLtp > existing.lastPrice ? "up" : "down";
        }

        const prevClose = tick.previousClose ?? existing?.previousClose ?? tick.close ?? newLtp;
        const rawChange = tick.change ?? (prevClose != null && newLtp != null && prevClose > 0 ? newLtp - prevClose : null);
        const rawChangePct = tick.changePercent ?? (prevClose != null && rawChange != null && prevClose > 0 ? (rawChange / prevClose) * 100 : null);

        const ageMs = Math.max(0, now - incomingTime);
        const isStale = ageMs > 5000;
        let status: NormalizedMarketTick["status"] = "LIVE";
        if (newLtp == null || newLtp <= 0) {
          status = "UNAVAILABLE";
        } else if (ageMs <= 5000) {
          status = "LIVE";
        } else if (ageMs <= 15000) {
          status = "DELAYED";
        } else {
          status = "STALE";
        }

        const normalized: NormalizedMarketTick = {
          symbol: sym,
          tradingSymbol: tick.tradingSymbol || existing?.tradingSymbol || sym,
          securityId: tick.securityId || existing?.securityId,
          exchangeSegment: tick.exchangeSegment || existing?.exchangeSegment || "NSE_EQ",
          exchange: exchange !== "UNKNOWN" ? exchange : (existing?.exchange || "NSE"),
          provider: provider !== "UNKNOWN" ? provider : (existing?.provider || "UNKNOWN"),
          lastPrice: newLtp,
          bid: tick.bid ?? existing?.bid ?? null,
          ask: tick.ask ?? existing?.ask ?? null,
          bidQty: tick.bidQty ?? existing?.bidQty,
          askQty: tick.askQty ?? existing?.askQty,
          volume: tick.volume ?? existing?.volume ?? null,
          open: tick.open ?? existing?.open ?? null,
          high: tick.high ?? existing?.high ?? null,
          low: tick.low ?? existing?.low ?? null,
          close: tick.close ?? existing?.close ?? null,
          previousClose: prevClose,
          change: rawChange != null ? Math.round(rawChange * 100) / 100 : null,
          changePercent: rawChangePct != null ? Math.round(rawChangePct * 100) / 100 : null,
          averagePrice: tick.averagePrice ?? existing?.averagePrice ?? null,
          oi: tick.oi ?? existing?.oi ?? null,
          previousOi: tick.previousOi ?? existing?.previousOi ?? null,
          oiChange: tick.oiChange ?? existing?.oiChange ?? null,
          eventTimestamp: tick.eventTimestamp || existing?.eventTimestamp || nowIso,
          receivedTimestamp: tick.receivedTimestamp || nowIso,
          feedLatencyMs: latency,
          dataMode: tick.dataMode || "REAL_TIME",
          status: tick.status && tick.status !== "UNKNOWN" ? tick.status : status,
          isStale,
          ageMs,
          flashDirection: flashDir,
          depth: tick.depth || existing?.depth,
        };

        // Strict provider-scoped storage:
        // Always store under provider-qualified keys:
        updatedQuotes[`${provider}:${sym}`] = normalized;
        updatedQuotes[`${provider}:${exchange}:${sym}`] = normalized;

        const aliases = getQuoteAliases(sym, exchange, provider);
        aliases.forEach((alias) => {
          // If alias has a provider prefix, only set if it matches this quote's provider
          if (alias.startsWith("BINANCE:") && provider !== "BINANCE") return;
          if (alias.startsWith("DELTA:") && provider !== "DELTA") return;
          if (alias.startsWith("DHAN:") && provider !== "DHAN") return;
          if (alias.startsWith("UPSTOX:") && provider !== "UPSTOX") return;
          if (alias.startsWith("OANDA:") && provider !== "OANDA") return;

          // For bare symbols (e.g. "BTC/USDT" or "BTCUSDT"):
          // Allow bare symbol storage ONLY if there is no conflicting provider or if provider is canonical
          if (!alias.includes(":")) {
            const currentBare = updatedQuotes[alias];
            if (!currentBare || currentBare.provider === provider || provider === "BINANCE" || provider === "DHAN") {
              updatedQuotes[alias] = normalized;
            }
          } else {
            updatedQuotes[alias] = normalized;
          }
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

      // Calculate rolling tick rate per second and p95 latency
      let currentTicksPerSec = state.health.ticksPerSec;
      const elapsedRateMs = now - lastTickRateTime;
      if (elapsedRateMs >= 1000) {
        currentTicksPerSec = Math.round((tickCounter * 1000) / elapsedRateMs);
        tickCounter = 0;
        lastTickRateTime = now;
      }

      let p95 = lastLatency;
      if (latencyWindow.length > 0) {
        const sorted = [...latencyWindow].sort((a, b) => a - b);
        const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
        p95 = sorted[idx];
      }

      const mergedStreamEvents = state.isStreamPaused
        ? state.streamEvents
        : [...newEvents, ...state.streamEvents].slice(0, 3000);

      return {
        quotesBySymbol: updatedQuotes,
        quotesBySecurityId: updatedSecQuotes,
        streamEvents: mergedStreamEvents,
        health: {
          ...state.health,
          ticksPerSec: currentTicksPerSec,
          latencyMs: lastLatency,
          p95LatencyMs: p95,
          lastTickTime: nowIso,
          lastTickAgeMs: 0,
          totalMessages: state.health.totalMessages + ticks.length,
          providers: updatedProviders,
        },
      };
    });
  },

  recalculateFreshness: () => {
    const now = Date.now();
    set((state) => {
      let hasChanges = false;
      const updated = { ...state.quotesBySymbol };

      for (const [key, q] of Object.entries(updated)) {
        const tickTime = q.receivedTimestamp || q.eventTimestamp;
        if (!tickTime) continue;
        const ms = new Date(tickTime).getTime();
        if (isNaN(ms) || ms <= 0) continue;

        const ageMs = Math.max(0, now - ms);
        const isStale = ageMs > 5000;
        let nextStatus = q.status;

        if (q.lastPrice == null || q.lastPrice <= 0) {
          nextStatus = "UNAVAILABLE";
        } else if (q.status === "MARKET_CLOSED") {
          nextStatus = "MARKET_CLOSED";
        } else if (ageMs <= 5000) {
          nextStatus = "LIVE";
        } else if (ageMs <= 15000) {
          nextStatus = "DELAYED";
        } else {
          nextStatus = "STALE";
        }

        if (q.ageMs !== ageMs || q.isStale !== isStale || q.status !== nextStatus) {
          hasChanges = true;
          updated[key] = {
            ...q,
            ageMs,
            isStale,
            status: nextStatus,
          };
        }
      }

      if (!hasChanges) return state;
      return { quotesBySymbol: updated };
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

  getQuote: (symbol, exchange, provider) => {
    const sym = symbol.toUpperCase();
    const quotes = get().quotesBySymbol;
    const prov = (provider || "").toUpperCase();
    const ex = (exchange || "").toUpperCase();

    // 1. Direct provider-scoped key
    if (prov) {
      if (quotes[`${prov}:${sym}`]) return quotes[`${prov}:${sym}`];
      if (ex && quotes[`${prov}:${ex}:${sym}`]) return quotes[`${prov}:${ex}:${sym}`];
    }
    if (ex) {
      if (quotes[`${ex}:${sym}`]) return quotes[`${ex}:${sym}`];
    }

    // 2. Direct symbol match
    if (quotes[sym]) {
      // If caller requested a specific provider, make sure it matches
      if (prov && quotes[sym].provider && quotes[sym].provider.toUpperCase() !== prov) {
        // Mismatch — look for provider-prefixed quote
        return quotes[`${prov}:${sym}`];
      }
      return quotes[sym];
    }

    return (
      quotes[sym.replace(" 50", "")] ||
      quotes[sym.replace(" ", "")] ||
      quotes[sym.replace("/", "")] ||
      quotes[`NSE:${sym}`] ||
      quotes[`BSE:${sym}`] ||
      quotes[`BINANCE:${sym}`] ||
      quotes[`DELTA:${sym}`]
    );
  },
}));

// Setup periodic client-side freshness invalidation timer
if (typeof window !== "undefined") {
  setInterval(() => {
    useMarketFeedStore.getState().recalculateFreshness();
  }, 1000);
}

// ─── Selector Hooks ──────────────────────────────────────────────────────────

export function useSymbolQuote(
  symbol?: string | null,
  exchange?: string | null,
  provider?: string | null
): NormalizedMarketTick | undefined {
  return useMarketFeedStore((state) => {
    if (!symbol) return undefined;
    const sym = symbol.toUpperCase();
    const quotes = state.quotesBySymbol;
    const prov = (provider || "").toUpperCase();
    const ex = (exchange || "").toUpperCase();

    if (prov) {
      if (quotes[`${prov}:${sym}`]) return quotes[`${prov}:${sym}`];
      if (ex && quotes[`${prov}:${ex}:${sym}`]) return quotes[`${prov}:${ex}:${sym}`];
    }
    if (ex) {
      if (quotes[`${ex}:${sym}`]) return quotes[`${ex}:${sym}`];
    }

    if (quotes[sym]) {
      if (prov && quotes[sym].provider && quotes[sym].provider.toUpperCase() !== prov) {
        return quotes[`${prov}:${sym}`];
      }
      return quotes[sym];
    }

    return (
      quotes[sym.replace(" 50", "")] ||
      quotes[sym.replace(" ", "")] ||
      quotes[sym.replace("/", "")] ||
      quotes[`NSE:${sym}`] ||
      quotes[`BSE:${sym}`] ||
      quotes[`BINANCE:${sym}`] ||
      quotes[`DELTA:${sym}`]
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
