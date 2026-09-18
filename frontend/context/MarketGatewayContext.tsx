"use client";
/**
 * MarketGatewayContext
 * ====================
 * Provides a single, resilient WebSocket connection per browser tab to the Market Data Gateway.
 * Features:
 * 1. Direct gateway WebSocket connection with exponential backoff & jitter.
 * 2. Automatic HTTP quote polling fallback during temporary WS reconnections (batching 50 symbols).
 * 3. Heartbeat watchdog detecting silent socket stalls.
 * 4. Automatic resubscription on reconnect without truncation.
 * 5. Out-of-order tick and REST rejection.
 * 6. Provider-segregated quote routing preventing cross-provider collisions.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { useMarketFeedStore } from "@/lib/market-data/market-feed-store";
import { getQuoteAliases } from "@/lib/market-data/canonical-symbol";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NormalizedQuote {
  symbol: string;
  exchange: string;
  provider: string;
  last_price: number;
  bid: number;
  ask: number;
  volume: number;
  high: number | null;
  low: number | null;
  open: number | null;
  close: number | null;
  change_pct: number | null;
  vwap: number | null;
  event_timestamp: string;
  received_timestamp: string;
  feed_latency_ms: number;
  data_mode: "REAL_TIME" | "DELAYED" | "EOD" | "CACHED";
  is_stale: boolean;
  age_seconds: number;
}

export type ConnectionStatus = "CONNECTING" | "CONNECTED" | "LIVE" | "RECONNECTING" | "STALE" | "DISCONNECTED";

export type SubscriptionReason =
  | "WATCHLIST"
  | "RUNNING_BOT"
  | "OPEN_POSITION"
  | "CHART_VIEW"
  | "BENCHMARK";

export interface ProviderHealthEntry {
  provider_id: string;
  provider_name: string;
  status: string;
  subscribed_symbols: number;
  asset_classes: string[];
  message?: string;
}

interface MarketGatewayContextValue {
  /** Map of symbol -> latest quote */
  quotes: Map<string, NormalizedQuote>;
  /** Subscribe to real-time quotes for a symbol. Call this on mount. */
  subscribe: (symbol: string, reason: SubscriptionReason) => void;
  /** Unsubscribe. Call this on unmount. */
  unsubscribe: (symbol: string, reason: SubscriptionReason) => void;
  /** Current WebSocket connection status */
  connectionStatus: ConnectionStatus;
  /** Provider health matrix (refreshed periodically) */
  providerHealth: ProviderHealthEntry[];
  /** True when any provider has a non-LIVE status */
  hasProviderWarning: boolean;
  /** Fast non-reactive quote getter */
  getQuote: (symbol: string, exchange?: string, provider?: string) => NormalizedQuote | null;
  /** Targeted single-symbol quote listener: triggers ONLY when this symbol updates */
  subscribeSymbolQuote: (symbol: string, callback: (quote: NormalizedQuote) => void) => () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const MarketGatewayContext = createContext<MarketGatewayContextValue | null>(null);

export function useMarketGatewayContext(): MarketGatewayContextValue {
  const ctx = useContext(MarketGatewayContext);
  if (!ctx) throw new Error("useMarketGatewayContext must be used inside <MarketGatewayProvider>");
  return ctx;
}

// ─── Configuration ────────────────────────────────────────────────────────────

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000]; // ms
const HEARTBEAT_STALE_MS = 20_000;
const HEALTH_POLL_MS = 30_000;
const FALLBACK_SNAPSHOT_POLL_MS = 10_000;

type SubRef = { reasons: Map<SubscriptionReason, number> };

export function MarketGatewayProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [quotes, setQuotes] = useState<Map<string, NormalizedQuote>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("CONNECTING");
  const [providerHealth, setProviderHealth] = useState<ProviderHealthEntry[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackPollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastHeartbeatRef = useRef<number>(Date.now());
  const heartbeatWatchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subRefsRef = useRef<Map<string, SubRef>>(new Map());
  const quotesRef = useRef<Map<string, NormalizedQuote>>(new Map());
  const symbolListenersRef = useRef<Map<string, Set<(quote: NormalizedQuote) => void>>>(new Map());
  const pendingQuotesRef = useRef<Map<string, NormalizedQuote>>(new Map());
  const batchFrameRef = useRef<number | null>(null);
  const lastQuotesStateUpdateRef = useRef<number>(0);
  const scheduleReconnectRef = useRef<() => void>(() => {});
  const connectWSRef = useRef<() => void>(() => {});

  // Resolve optimal gateway WebSocket URL
  const getGatewayWsUrl = useCallback((): string => {
    if (typeof window === "undefined") return "ws://127.0.0.1:5051/ws";

    if (process.env.NEXT_PUBLIC_MARKET_GATEWAY_WS_URL) {
      return process.env.NEXT_PUBLIC_MARKET_GATEWAY_WS_URL;
    }
    if (process.env.NEXT_PUBLIC_MARKET_WS_URL) {
      return process.env.NEXT_PUBLIC_MARKET_WS_URL;
    }

    let host = window.location.hostname || "127.0.0.1";
    if (host === "localhost") {
      host = "127.0.0.1";
    }
    const port = process.env.NEXT_PUBLIC_MARKET_GATEWAY_PORT || "5051";
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

    return `${protocol}//${host}:${port}/ws`;
  }, []);

  // ─── WebSocket connection ───────────────────────────────────────────────────

  const connectWS = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        return;
      }
    }

    if (reconnectAttemptRef.current > 0) {
      setConnectionStatus("RECONNECTING");
    } else {
      setConnectionStatus("CONNECTING");
    }

    const wsUrl = getGatewayWsUrl();
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
    } catch {
      scheduleReconnectRef.current();
      return;
    }

    const connectTimeout = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        try {
          (ws as any)._isClosing = true;
          ws.close();
        } catch {}
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        scheduleReconnectRef.current();
      }
    }, 5000);

    ws.onopen = () => {
      clearTimeout(connectTimeout);
      if (!mountedRef.current || wsRef.current !== ws || (ws as any)._isClosing) return;
      reconnectAttemptRef.current = 0;
      lastHeartbeatRef.current = Date.now();
      // Socket connected is CONNECTED, individual quotes determine LIVE
      setConnectionStatus("CONNECTED");
      useMarketFeedStore.getState().setConnectionStatus("CONNECTED");

      // Re-subscribe to ALL active symbols
      const allSubs: string[] = [];
      subRefsRef.current.forEach((ref, sym) => {
        const hasActive = Array.from(ref.reasons.values()).some((c) => c > 0);
        if (hasActive) allSubs.push(sym);
      });

      if (allSubs.length > 0 && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: "subscribe", symbols: allSubs, reason: "RESTORE_SUBSCRIPTIONS" }));
      }
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current || wsRef.current !== ws || (ws as any)._isClosing) return;
      lastHeartbeatRef.current = Date.now();
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "QUOTE" && msg.data) {
          const quote = msg.data as NormalizedQuote;
          const sym = quote.symbol.toUpperCase();
          const provider = (quote.provider || "UNKNOWN").toUpperCase();
          const incomingTs = new Date(quote.event_timestamp || quote.received_timestamp).getTime();

          // Check out-of-order arrival
          const existingKey = `${provider}:${sym}`;
          const existing = quotesRef.current.get(existingKey) || quotesRef.current.get(sym);
          if (existing) {
            const existingTs = new Date(existing.event_timestamp || existing.received_timestamp).getTime();
            if (existingTs > 0 && incomingTs < existingTs) {
              return; // Reject older tick
            }
          }

          // Provider-scoped storage
          quotesRef.current.set(existingKey, quote);
          pendingQuotesRef.current.set(existingKey, quote);

          const aliases = getQuoteAliases(quote.symbol, quote.exchange, quote.provider);
          aliases.forEach((alias) => {
            if (alias.startsWith("BINANCE:") && provider !== "BINANCE") return;
            if (alias.startsWith("DELTA:") && provider !== "DELTA") return;
            if (alias.startsWith("DHAN:") && provider !== "DHAN") return;
            if (alias.startsWith("UPSTOX:") && provider !== "UPSTOX") return;
            if (alias.startsWith("OANDA:") && provider !== "OANDA") return;

            quotesRef.current.set(alias, quote);
            pendingQuotesRef.current.set(alias, quote);
          });

          // Fast ingestion into central Zustand marketFeedStore
          useMarketFeedStore.getState().ingestTick({
            symbol: sym,
            exchange: quote.exchange,
            provider: quote.provider,
            lastPrice: quote.last_price,
            bid: quote.bid,
            ask: quote.ask,
            volume: quote.volume,
            open: quote.open,
            high: quote.high,
            low: quote.low,
            close: quote.close,
            changePercent: quote.change_pct ?? 0,
            eventTimestamp: quote.event_timestamp,
            feedLatencyMs: quote.feed_latency_ms,
            dataMode: quote.data_mode,
            isStale: quote.is_stale,
            ageMs: (quote.age_seconds || 0) * 1000,
          });

          // Targeted notification
          aliases.forEach((alias) => {
            const symListeners = symbolListenersRef.current.get(alias);
            if (symListeners && symListeners.size > 0) {
              symListeners.forEach((fn) => {
                try { fn(quote); } catch {}
              });
            }
          });

          if (batchFrameRef.current === null) {
            batchFrameRef.current = requestAnimationFrame(() => {
              batchFrameRef.current = null;
              if (!mountedRef.current || pendingQuotesRef.current.size === 0) return;
              const updates = new Map(pendingQuotesRef.current);
              pendingQuotesRef.current.clear();
              lastQuotesStateUpdateRef.current = Date.now();
              setQuotes((prev) => {
                const next = new Map(prev);
                updates.forEach((q, s) => next.set(s, q));
                return next;
              });
            });
          }
        } else if (msg.type === "SNAPSHOT" && msg.data) {
          const snapshotEntries = Object.entries(msg.data as Record<string, NormalizedQuote>);
          snapshotEntries.forEach(([rawSym, q]) => {
            const sym = rawSym.toUpperCase();
            const provider = (q.provider || "UNKNOWN").toUpperCase();
            const provKey = `${provider}:${sym}`;

            quotesRef.current.set(provKey, q);
            quotesRef.current.set(sym, q);
            pendingQuotesRef.current.set(provKey, q);
            pendingQuotesRef.current.set(sym, q);

            useMarketFeedStore.getState().ingestTick({
              symbol: sym,
              exchange: q.exchange,
              provider: q.provider,
              lastPrice: q.last_price,
              bid: q.bid,
              ask: q.ask,
              volume: q.volume,
              open: q.open,
              high: q.high,
              low: q.low,
              close: q.close,
              changePercent: q.change_pct ?? 0,
              eventTimestamp: q.event_timestamp,
              feedLatencyMs: q.feed_latency_ms,
              dataMode: q.data_mode,
              isStale: q.is_stale,
              ageMs: (q.age_seconds || 0) * 1000,
            });

            const symListeners = symbolListenersRef.current.get(sym);
            if (symListeners && symListeners.size > 0) {
              symListeners.forEach((fn) => {
                try { fn(q); } catch {}
              });
            }
          });

          if (batchFrameRef.current === null) {
            batchFrameRef.current = requestAnimationFrame(() => {
              batchFrameRef.current = null;
              if (!mountedRef.current || pendingQuotesRef.current.size === 0) return;
              const updates = new Map(pendingQuotesRef.current);
              pendingQuotesRef.current.clear();
              setQuotes((prev) => {
                const next = new Map(prev);
                updates.forEach((q, s) => next.set(s, q));
                return next;
              });
            });
          }
        } else if (msg.type === "GATEWAY_READY" || msg.type === "READY" || msg.type === "HEARTBEAT") {
          setConnectionStatus("CONNECTED");
          useMarketFeedStore.getState().setConnectionStatus("CONNECTED");
        }
      } catch {
        // Safe: ignore malformed frames
      }
    };

    ws.onerror = () => {
      clearTimeout(connectTimeout);
      if (!mountedRef.current || wsRef.current !== ws || (ws as any)._isClosing) return;
    };

    ws.onclose = () => {
      clearTimeout(connectTimeout);
      if (!mountedRef.current || (ws as any)._isClosing) return;
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      scheduleReconnectRef.current();
    };
  }, [getGatewayWsUrl]);

  connectWSRef.current = connectWS;

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return;
    setConnectionStatus("RECONNECTING");

    const attempt = reconnectAttemptRef.current;
    const delayIndex = Math.min(attempt, RECONNECT_DELAYS.length - 1);
    const baseDelay = RECONNECT_DELAYS[delayIndex];
    const jitter = Math.floor(Math.random() * 300);
    const delay = baseDelay + jitter;

    reconnectAttemptRef.current = Math.min(attempt + 1, RECONNECT_DELAYS.length);

    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        connectWSRef.current();
      }
    }, delay);
  }, []);

  scheduleReconnectRef.current = scheduleReconnect;

  // ─── HTTP Fallback Poller during WS Reconnection (Batched, NO 10-symbol limit) ───

  useEffect(() => {
    const pollFallbackSnapshots = async () => {
      if (!mountedRef.current) return;
      // Only poll REST if socket is not open
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const activeSymbols: string[] = [];
      subRefsRef.current.forEach((ref, sym) => {
        const hasActive = Array.from(ref.reasons.values()).some((c) => c > 0);
        if (hasActive) activeSymbols.push(sym);
      });

      if (activeSymbols.length === 0) return;

      // Recover ALL active subscriptions in safe batches of 50
      const batchSize = 50;
      for (let i = 0; i < activeSymbols.length; i += batchSize) {
        const batch = activeSymbols.slice(i, i + batchSize);
        try {
          const symbolsParam = encodeURIComponent(batch.join(","));
          const res = await apiClient.get<any>(`/api/market/snapshot?symbols=${symbolsParam}`, {
            timeoutMs: 4000,
            deduplicate: true,
          });

          if (res.ok && res.data?.quotes) {
            const incoming = res.data.quotes as Record<string, NormalizedQuote>;
            setQuotes((prev) => {
              const next = new Map(prev);
              Object.entries(incoming).forEach(([rawSym, q]) => {
                const sym = rawSym.toUpperCase();
                const provider = (q.provider || "UNKNOWN").toUpperCase();
                const incomingTs = new Date(q.event_timestamp || q.received_timestamp).getTime();
                const existing = quotesRef.current.get(`${provider}:${sym}`) || quotesRef.current.get(sym);

                if (existing) {
                  const existingTs = new Date(existing.event_timestamp || existing.received_timestamp).getTime();
                  if (existingTs > 0 && incomingTs < existingTs) {
                    return; // Reject older REST recovery
                  }
                }

                quotesRef.current.set(`${provider}:${sym}`, q);
                quotesRef.current.set(sym, q);
                next.set(`${provider}:${sym}`, q);
                next.set(sym, q);

                useMarketFeedStore.getState().ingestTick({
                  symbol: sym,
                  exchange: q.exchange,
                  provider: q.provider,
                  lastPrice: q.last_price,
                  bid: q.bid,
                  ask: q.ask,
                  volume: q.volume,
                  open: q.open,
                  high: q.high,
                  low: q.low,
                  close: q.close,
                  changePercent: q.change_pct ?? 0,
                  eventTimestamp: q.event_timestamp,
                  feedLatencyMs: q.feed_latency_ms,
                  dataMode: q.data_mode,
                  isStale: q.is_stale,
                  ageMs: (q.age_seconds || 0) * 1000,
                });
              });
              return next;
            });
          }
        } catch {
          // Ignore individual batch failure
        }
      }
    };

    fallbackPollTimerRef.current = setInterval(pollFallbackSnapshots, FALLBACK_SNAPSHOT_POLL_MS);
    return () => {
      if (fallbackPollTimerRef.current) clearInterval(fallbackPollTimerRef.current);
    };
  }, [connectionStatus]);

  // ─── Heartbeat Watchdog ──────────────────────────────────────────────────────

  useEffect(() => {
    heartbeatWatchdogRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      const age = Date.now() - lastHeartbeatRef.current;
      if (age > HEARTBEAT_STALE_MS && (connectionStatus === "CONNECTED" || connectionStatus === "LIVE")) {
        setConnectionStatus("STALE");
      }
    }, 5000);

    return () => {
      if (heartbeatWatchdogRef.current) clearInterval(heartbeatWatchdogRef.current);
    };
  }, [connectionStatus]);

  // ─── Provider Health Polling ─────────────────────────────────────────────────

  useEffect(() => {
    let isCancelled = false;

    const fetchHealth = async () => {
      try {
        const res = await apiClient.get<any>("/api/market/providers/health", {
          timeoutMs: 4000,
          deduplicate: true,
        });
        if (res.ok && res.data && !isCancelled) {
          setProviderHealth(res.data.providers ?? []);
        }
      } catch {
        // Silent
      }
    };

    fetchHealth();
    const timer = setInterval(fetchHealth, HEALTH_POLL_MS);

    return () => {
      isCancelled = true;
      clearInterval(timer);
    };
  }, []);

  // ─── Initial Connection & Cleanup ────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    connectWS();

    return () => {
      mountedRef.current = false;
      if (batchFrameRef.current !== null) {
        cancelAnimationFrame(batchFrameRef.current);
        batchFrameRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (fallbackPollTimerRef.current) {
        clearInterval(fallbackPollTimerRef.current);
        fallbackPollTimerRef.current = null;
      }
      if (heartbeatWatchdogRef.current) {
        clearInterval(heartbeatWatchdogRef.current);
        heartbeatWatchdogRef.current = null;
      }
      if (wsRef.current) {
        (wsRef.current as any)._isClosing = true;
        try {
          wsRef.current.close(1000, "Component unmounted");
        } catch {}
        wsRef.current = null;
      }
    };
  }, [connectWS]);

  // ─── Public API ─────────────────────────────────────────────────────────────

  const subscribe = useCallback((symbol: string, reason: SubscriptionReason) => {
    if (!symbol) return;
    const sym = symbol.toUpperCase().trim();

    let ref = subRefsRef.current.get(sym);
    if (!ref) {
      ref = { reasons: new Map() };
      subRefsRef.current.set(sym, ref);
    }
    const currentCount = ref.reasons.get(reason) ?? 0;
    ref.reasons.set(reason, currentCount + 1);

    if (currentCount === 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ action: "subscribe", symbols: [sym], reason }));
      } catch {
        // Ignore
      }
    }
  }, []);

  const unsubscribe = useCallback((symbol: string, reason: SubscriptionReason) => {
    if (!symbol) return;
    const sym = symbol.toUpperCase().trim();
    const ref = subRefsRef.current.get(sym);
    if (!ref) return;

    const cur = ref.reasons.get(reason) ?? 0;
    if (cur <= 1) {
      ref.reasons.delete(reason);
    } else {
      ref.reasons.set(reason, cur - 1);
    }

    const anyRemaining = Array.from(ref.reasons.values()).some((c) => c > 0);
    if (!anyRemaining) {
      subRefsRef.current.delete(sym);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ action: "unsubscribe", symbols: [sym], reason }));
        } catch {
          // Ignore
        }
      }
    }
  }, []);

  const getQuote = useCallback((symbol: string, exchange?: string, provider?: string): NormalizedQuote | null => {
    if (!symbol) return null;
    const sym = symbol.toUpperCase().trim();
    const prov = (provider || "").toUpperCase();
    const ex = (exchange || "").toUpperCase();

    // 1. Direct provider-scoped key
    if (prov) {
      const provKey = `${prov}:${sym}`;
      if (quotesRef.current.has(provKey)) return quotesRef.current.get(provKey)!;
      if (ex) {
        const provExKey = `${prov}:${ex}:${sym}`;
        if (quotesRef.current.has(provExKey)) return quotesRef.current.get(provExKey)!;
      }
    }
    if (ex) {
      const exKey = `${ex}:${sym}`;
      if (quotesRef.current.has(exKey)) return quotesRef.current.get(exKey)!;
    }

    // 2. Direct symbol match
    const direct = quotesRef.current.get(sym);
    if (direct) {
      if (prov && direct.provider && direct.provider.toUpperCase() !== prov) {
        const provDirect = quotesRef.current.get(`${prov}:${sym}`);
        if (provDirect) return provDirect;
      }
      return direct;
    }

    const aliases = getQuoteAliases(symbol, exchange, provider);
    for (const a of aliases) {
      const q = quotesRef.current.get(a);
      if (q) return q;
    }
    return null;
  }, []);

  const subscribeSymbolQuote = useCallback((symbol: string, callback: (quote: NormalizedQuote) => void) => {
    if (!symbol) return () => {};
    const sym = symbol.toUpperCase().trim();
    if (!symbolListenersRef.current.has(sym)) {
      symbolListenersRef.current.set(sym, new Set());
    }
    const set = symbolListenersRef.current.get(sym)!;
    set.add(callback);
    return () => {
      set.delete(callback);
      if (set.size === 0) {
        symbolListenersRef.current.delete(sym);
      }
    };
  }, []);

  const hasProviderWarning = providerHealth.some(
    (p) => p.status !== "LIVE" && p.status !== "OK" && p.status !== "NOT_CONFIGURED"
  );

  return (
    <MarketGatewayContext.Provider
      value={{
        quotes,
        subscribe,
        unsubscribe,
        connectionStatus,
        providerHealth,
        hasProviderWarning,
        getQuote,
        subscribeSymbolQuote,
      }}
    >
      {children}
    </MarketGatewayContext.Provider>
  );
}
