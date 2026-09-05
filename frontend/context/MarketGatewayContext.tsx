"use client";
/**
 * MarketGatewayContext
 * ====================
 * Provides a single, resilient WebSocket connection per browser tab to the Market Data Gateway.
 * Features:
 * 1. Direct gateway WebSocket connection with exponential backoff & jitter.
 * 2. Automatic HTTP quote polling fallback during temporary WS reconnections.
 * 3. Heartbeat watchdog detecting silent socket stalls.
 * 4. Automatic resubscription on reconnect.
 * 5. Clean teardown with zero leaked timers or duplicate connections.
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

export type ConnectionStatus = "CONNECTING" | "LIVE" | "RECONNECTING" | "STALE" | "DISCONNECTED";

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
  getQuote: (symbol: string) => NormalizedQuote | null;
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

  // Resolve optimal gateway WebSocket URL
  const getGatewayWsUrl = useCallback((): string => {
    if (typeof window === "undefined") return "ws://127.0.0.1:5051/ws";

    if (process.env.NEXT_PUBLIC_MARKET_WS_URL) {
      return process.env.NEXT_PUBLIC_MARKET_WS_URL;
    }
    if (process.env.NEXT_PUBLIC_MARKET_GATEWAY_WS_URL) {
      return process.env.NEXT_PUBLIC_MARKET_GATEWAY_WS_URL;
    }

    const host = window.location.hostname || "127.0.0.1";
    const port = process.env.NEXT_PUBLIC_MARKET_GATEWAY_PORT || "5051";
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

    return `${protocol}//${host}:${port}/ws`;
  }, []);

  // ─── WebSocket connection ───────────────────────────────────────────────────

  const connectWS = useCallback(() => {
    if (!mountedRef.current || !isAuthenticated) return;
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
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      if (!mountedRef.current || wsRef.current !== ws || (ws as any)._isClosing) return;
      reconnectAttemptRef.current = 0;
      lastHeartbeatRef.current = Date.now();
      setConnectionStatus("LIVE");

      // Re-subscribe to all active symbols
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
          quotesRef.current.set(sym, quote);
          pendingQuotesRef.current.set(sym, quote);

          // Fast targeted notification to components listening specifically to this symbol
          const symListeners = symbolListenersRef.current.get(sym);
          if (symListeners && symListeners.size > 0) {
            symListeners.forEach((fn) => {
              try {
                fn(quote);
              } catch {}
            });
          }

          if (batchFrameRef.current === null) {
            batchFrameRef.current = requestAnimationFrame(() => {
              batchFrameRef.current = null;
              if (!mountedRef.current || pendingQuotesRef.current.size === 0) return;
              const now = Date.now();
              // Throttle full Map state recreation to ~150ms to keep table views smooth without React thrashing
              if (now - lastQuotesStateUpdateRef.current > 150) {
                lastQuotesStateUpdateRef.current = now;
                const updates = new Map(pendingQuotesRef.current);
                pendingQuotesRef.current.clear();
                setQuotes((prev) => {
                  const next = new Map(prev);
                  updates.forEach((q, s) => next.set(s, q));
                  return next;
                });
              }
              setConnectionStatus((prev) => (prev !== "LIVE" ? "LIVE" : prev));
            });
          }
        } else if (msg.type === "SNAPSHOT" && msg.data) {
          const snapshotEntries = Object.entries(msg.data as Record<string, NormalizedQuote>);
          snapshotEntries.forEach(([rawSym, q]) => {
            const sym = rawSym.toUpperCase();
            quotesRef.current.set(sym, q);
            pendingQuotesRef.current.set(sym, q);
            const symListeners = symbolListenersRef.current.get(sym);
            if (symListeners && symListeners.size > 0) {
              symListeners.forEach((fn) => {
                try {
                  fn(q);
                } catch {}
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
                updates.forEach((q, sym) => next.set(sym, q));
                return next;
              });
            });
          }
        } else if (msg.type === "HEARTBEAT") {
          setConnectionStatus((prev) => (prev !== "LIVE" ? "LIVE" : prev));
        }
      } catch {
        // Safe: ignore malformed frames
      }
    };

    ws.onerror = () => {
      if (!mountedRef.current || wsRef.current !== ws || (ws as any)._isClosing) return;
      // Do not log noisy console errors; state will transition cleanly onclose
    };

    ws.onclose = () => {
      if (!mountedRef.current || (ws as any)._isClosing) return;
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      scheduleReconnect();
    };
  }, [getGatewayWsUrl]); // eslint-disable-line react-hooks/exhaustive-deps

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
        connectWS();
      }
    }, delay);
  }, [connectWS]);

  // ─── HTTP Fallback Poller during WS Reconnection ─────────────────────────────

  useEffect(() => {
    const pollFallbackSnapshots = async () => {
      if (!mountedRef.current) return;
      if (connectionStatus === "LIVE") return; // WS is live, no fallback needed

      const activeSymbols: string[] = [];
      subRefsRef.current.forEach((ref, sym) => {
        const hasActive = Array.from(ref.reasons.values()).some((c) => c > 0);
        if (hasActive) activeSymbols.push(sym);
      });

      if (activeSymbols.length === 0) return;

      try {
        const symbolsParam = encodeURIComponent(activeSymbols.slice(0, 10).join(","));
        const res = await apiClient.get<any>(`/api/market/snapshot?symbols=${symbolsParam}`, {
          timeoutMs: 4000,
          deduplicate: true,
        });

        if (res.ok && res.data?.quotes) {
          setQuotes((prev) => {
            const next = new Map(prev);
            Object.entries(res.data.quotes as Record<string, NormalizedQuote>).forEach(([sym, q]) => {
              next.set(sym.toUpperCase(), q);
            });
            return next;
          });
        }
      } catch {
        // Silent fallback
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
      if (age > HEARTBEAT_STALE_MS && connectionStatus === "LIVE") {
        setConnectionStatus("STALE");
      }
    }, 5000);

    return () => {
      if (heartbeatWatchdogRef.current) clearInterval(heartbeatWatchdogRef.current);
    };
  }, [connectionStatus]);

  // ─── Provider Health Polling ─────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated) return;
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
  }, [isAuthenticated]);

  // ─── Initial Connection & Cleanup ────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated) {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }
      setConnectionStatus("DISCONNECTED");
      return;
    }

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
        const socket = wsRef.current;
        (socket as any)._isClosing = true;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        if (socket.readyState === WebSocket.CONNECTING) {
          socket.onopen = () => {
            try {
              socket.close(1000, "Component unmounted");
            } catch {}
          };
        } else if (socket.readyState === WebSocket.OPEN) {
          try {
            socket.close(1000, "Component unmounted");
          } catch {}
        }
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, connectWS]);

  // ─── Subscribe / Unsubscribe API ─────────────────────────────────────────────

  const subscribe = useCallback((symbol: string, reason: SubscriptionReason) => {
    if (!symbol) return;
    const sym = symbol.toUpperCase().trim();
    const refs = subRefsRef.current;
    if (!refs.has(sym)) refs.set(sym, { reasons: new Map() });
    const ref = refs.get(sym)!;
    ref.reasons.set(reason, (ref.reasons.get(reason) ?? 0) + 1);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ action: "subscribe", symbols: [sym], reason }));
      } catch {
        // Ignore send errors; reconnect will sync subscriptions
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

  const getQuote = useCallback((symbol: string): NormalizedQuote | null => {
    if (!symbol) return null;
    return quotesRef.current.get(symbol.toUpperCase().trim()) || null;
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
