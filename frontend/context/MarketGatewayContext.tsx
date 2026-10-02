"use client";

/**
 * MarketGatewayContext
 * ====================
 * Provides a single, resilient WebSocket connection per browser tab
 * to the Market Data Gateway.
 *
 * Features:
 * 1. Direct gateway WebSocket connection with exponential backoff & jitter.
 * 2. Automatic HTTP quote polling fallback during temporary WS reconnections.
 * 3. Heartbeat watchdog detecting silent socket stalls.
 * 4. Automatic resubscription on reconnect.
 * 5. Out-of-order tick and REST rejection.
 * 6. Provider-segregated quote routing.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { useMarketFeedStore } from "@/lib/market-data/market-feed-store";
import { getQuoteAliases } from "@/lib/market-data/canonical-symbol";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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

export type NormalizedMarketEvent = NormalizedQuote;

export type ConnectionStatus =
  | "CONNECTING"
  | "CONNECTED"
  | "LIVE"
  | "RECONNECTING"
  | "STALE"
  | "DISCONNECTED";

export type SubscriptionReason =
  | "WATCHLIST"
  | "RUNNING_BOT"
  | "OPEN_POSITION"
  | "CHART_VIEW"
  | "BENCHMARK"
  | "COMMAND_CENTER"
  | "OPTION_CHAIN"
  | "DEPTH_VIEW"
  | "DETAIL_VIEW"
  | "SSE_CLIENT_STREAM";

export interface ProviderHealthEntry {
  provider_id: string;
  provider_name: string;
  status: string;
  subscribed_symbols: number;
  asset_classes: string[];
  message?: string;
}

interface MarketGatewayContextValue {
  quotes: Map<string, NormalizedQuote>;
  subscribe: (symbol: string, reason: SubscriptionReason) => void;
  unsubscribe: (symbol: string, reason: SubscriptionReason) => void;
  connectionStatus: ConnectionStatus;
  providerHealth: ProviderHealthEntry[];
  hasProviderWarning: boolean;
  getQuote: (symbol: string, exchange?: string, provider?: string) => NormalizedQuote | null;
  subscribeSymbolQuote: (symbol: string, callback: (quote: NormalizedQuote) => void) => () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context & Hooks
// ─────────────────────────────────────────────────────────────────────────────

const MarketGatewayContext = createContext<MarketGatewayContextValue | null>(null);

export function useMarketGatewayContext(): MarketGatewayContextValue {
  const ctx = useContext(MarketGatewayContext);
  if (!ctx) {
    throw new Error("useMarketGatewayContext must be used inside <MarketGatewayProvider>");
  }
  return ctx;
}

export function useMarketGateway() {
  const ctx = useContext(MarketGatewayContext);
  if (!ctx) {
    return {
      isConnected: false,
      connectionStatus: "DISCONNECTED" as ConnectionStatus,
      activeFeedsCount: 0,
      subscriptionsCount: 0,
      quotes: new Map<string, NormalizedQuote>(),
      providerHealth: [] as ProviderHealthEntry[],
      hasProviderWarning: false,
      getQuote: () => null,
      subscribe: () => {},
      unsubscribe: () => {},
      subscribeSymbolQuote: () => () => {},
      lastQuote: null as any,
    };
  }
  const quotesList = Array.from(ctx.quotes.values());
  return {
    ...ctx,
    isConnected: ctx.connectionStatus === "CONNECTED" || ctx.connectionStatus === "LIVE",
    activeFeedsCount: (Array.isArray(ctx.providerHealth) ? ctx.providerHealth : []).filter((p) => p.status === "LIVE" || p.status === "OK").length,
    subscriptionsCount: ctx.quotes.size,
    lastQuote: quotesList.length > 0 ? quotesList[quotesList.length - 1] : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];
const HEARTBEAT_STALE_MS = 20_000;
const HEALTH_POLL_MS = 30_000;
const FALLBACK_SNAPSHOT_POLL_MS = 10_000;

type SubRef = {
  reasons: Map<SubscriptionReason, number>;
};

type ManagedWebSocket = WebSocket & {
  _suppressReconnect?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Provider Component
// ─────────────────────────────────────────────────────────────────────────────

export function MarketGatewayProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  void isAuthenticated;

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("CONNECTING");
  const [providerHealth, setProviderHealth] = useState<ProviderHealthEntry[]>([]);

  // ───────────────────────────────────────────────────────────────────────────
  // Refs
  // ───────────────────────────────────────────────────────────────────────────

  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackPollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastHeartbeatRef = useRef<number>(Date.now());
  const heartbeatWatchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subRefsRef = useRef<Map<string, SubRef>>(new Map());
  const quotesRef = useRef<Map<string, NormalizedQuote>>(new Map());
  const symbolListenersRef = useRef<Map<string, Set<(quote: NormalizedQuote) => void>>>(new Map());
  const pendingQuotesRef = useRef<Map<string, NormalizedQuote>>(new Map());
  const batchFrameRef = useRef<number | null>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // WebSocket URL Generator
  // ───────────────────────────────────────────────────────────────────────────

  const getGatewayWsUrl = useCallback((): string => {
    const envWsUrl =
      process.env.NEXT_PUBLIC_MARKET_GATEWAY_WS ||
      process.env.NEXT_PUBLIC_MARKET_GATEWAY_WS_URL ||
      process.env.NEXT_PUBLIC_MARKET_WS_URL;

    if (envWsUrl) {
      if (envWsUrl.startsWith("/")) {
        if (typeof window !== "undefined") {
          const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
          return `${proto}//${window.location.host}${envWsUrl}`;
        }
        return `ws://127.0.0.1:5051${envWsUrl}`;
      }
      if (envWsUrl.startsWith("http://")) return envWsUrl.replace("http://", "ws://");
      if (envWsUrl.startsWith("https://")) return envWsUrl.replace("https://", "wss://");
      return envWsUrl;
    }

    if (typeof window === "undefined") {
      return "ws://127.0.0.1:5051/ws";
    }

    const host = window.location.hostname || "127.0.0.1";
    const port = process.env.NEXT_PUBLIC_MARKET_GATEWAY_PORT || "5051";
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

    return `${protocol}//${host}:${port}/ws`;
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Safe WebSocket Teardown
  // ───────────────────────────────────────────────────────────────────────────

  const safeCloseSocket = useCallback(
    (targetWs: WebSocket | null, code: number = 1000, reason: string = "Normal Closure") => {
      if (!targetWs) return;
      const managedWs = targetWs as ManagedWebSocket;
      managedWs._suppressReconnect = true;

      targetWs.onmessage = null;
      targetWs.onerror = null;

      if (targetWs.readyState === WebSocket.OPEN) {
        try {
          targetWs.close(code, reason);
        } catch {
          // ignore
        }
      } else if (targetWs.readyState === WebSocket.CONNECTING) {
        targetWs.onopen = () => {
          try {
            targetWs.close(code, reason);
          } catch {
            // ignore
          }
        };
        targetWs.onclose = null;
      }
    },
    []
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Reconnect Scheduler
  // ───────────────────────────────────────────────────────────────────────────

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return;

    setConnectionStatus("RECONNECTING");
    useMarketFeedStore.getState().setConnectionStatus("RECONNECTING");

    const attempt = reconnectAttemptRef.current;
    const delayIndex = Math.min(attempt, RECONNECT_DELAYS.length - 1);
    const baseDelay = RECONNECT_DELAYS[delayIndex];
    const jitter = Math.floor(Math.random() * 300);
    const delay = baseDelay + jitter;

    reconnectAttemptRef.current = Math.min(attempt + 1, RECONNECT_DELAYS.length);

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      if (mountedRef.current) {
        connectWS();
      }
    }, delay);
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // WebSocket Connection
  // ───────────────────────────────────────────────────────────────────────────

  const connectWS = useCallback(() => {
    if (!mountedRef.current) return;

    if (wsRef.current) {
      if (
        wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING
      ) {
        return;
      }
    }

    const nextStatus = reconnectAttemptRef.current > 0 ? "RECONNECTING" : "CONNECTING";
    setConnectionStatus(nextStatus);
    useMarketFeedStore.getState().setConnectionStatus(nextStatus);

    const wsUrl = getGatewayWsUrl();
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
    } catch {
      scheduleReconnect();
      return;
    }

    const connectTimeout = setTimeout(() => {
      if (ws.readyState !== WebSocket.CONNECTING) return;
      if (wsRef.current === ws) wsRef.current = null;
      safeCloseSocket(ws, 4000, "Connection timeout");
      scheduleReconnect();
    }, 8000);

    connectTimeoutRef.current = connectTimeout;

    ws.onopen = () => {
      clearTimeout(connectTimeout);
      if (connectTimeoutRef.current === connectTimeout) {
        connectTimeoutRef.current = null;
      }

      if (!mountedRef.current || wsRef.current !== ws || (ws as ManagedWebSocket)._suppressReconnect) {
        return;
      }

      reconnectAttemptRef.current = 0;
      lastHeartbeatRef.current = Date.now();

      setConnectionStatus("CONNECTED");
      useMarketFeedStore.getState().setConnectionStatus("CONNECTED");

      // Restore active subscriptions
      const allSubs: string[] = [];
      subRefsRef.current.forEach((ref, sym) => {
        const hasActive = Array.from(ref.reasons.values()).some((count) => count > 0);
        if (hasActive) allSubs.push(sym);
      });

      if (allSubs.length > 0 && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(
            JSON.stringify({
              action: "subscribe",
              symbols: allSubs,
              reason: "RESTORE_SUBSCRIPTIONS",
            })
          );
        } catch {
          // ignore
        }
      }
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current || wsRef.current !== ws || (ws as ManagedWebSocket)._suppressReconnect) {
        return;
      }

      lastHeartbeatRef.current = Date.now();

      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "QUOTE" && msg.data) {
          const quote = msg.data as NormalizedQuote;
          const sym = quote.symbol.toUpperCase();
          const provider = (quote.provider || "UNKNOWN").toUpperCase();
          const exchange = (quote.exchange || "").toUpperCase();

          const incomingTs = new Date(quote.event_timestamp || quote.received_timestamp).getTime();
          const existing = quotesRef.current.get(`${provider}:${sym}`) || quotesRef.current.get(sym);
          if (existing) {
            const existingTs = new Date(existing.event_timestamp || existing.received_timestamp).getTime();
            if (existingTs > 0 && incomingTs < existingTs) return;
          }

          const aliases = getQuoteAliases(sym, exchange, provider);
          aliases.forEach((alias) => {
            quotesRef.current.set(alias, quote);
            pendingQuotesRef.current.set(alias, quote);
          });

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

          aliases.forEach((alias) => {
            const listeners = symbolListenersRef.current.get(alias);
            if (listeners && listeners.size > 0) {
              listeners.forEach((fn) => {
                try {
                  fn(quote);
                } catch {
                  // ignore
                }
              });
            }
          });
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

            const listeners = symbolListenersRef.current.get(sym);
            if (listeners && listeners.size > 0) {
              listeners.forEach((fn) => {
                try {
                  fn(q);
                } catch {
                  // ignore
                }
              });
            }
          });
        } else if ((msg.type === "FUTURES_TICK" || msg.type === "TICK") && msg.data) {
          const rawTick = msg.data;
          const sym = (rawTick.symbol || rawTick.instrument_id || "").toUpperCase();
          const provider = (rawTick.provider || "UNKNOWN").toUpperCase();
          const exchange = (rawTick.exchange || provider).toUpperCase();
          const lastPrice = rawTick.last_price ?? rawTick.lastPrice ?? rawTick.price ?? null;

          if (sym && lastPrice !== null) {
            const quote: NormalizedQuote = {
              symbol: sym,
              exchange: exchange,
              provider: provider,
              last_price: Number(lastPrice),
              bid: Number(rawTick.bid ?? lastPrice),
              ask: Number(rawTick.ask ?? lastPrice),
              volume: Number(rawTick.volume ?? rawTick.volume_24h ?? 0),
              high: rawTick.high ? Number(rawTick.high) : null,
              low: rawTick.low ? Number(rawTick.low) : null,
              open: rawTick.open ? Number(rawTick.open) : null,
              close: rawTick.close ? Number(rawTick.close) : null,
              change_pct: rawTick.change_pct ?? rawTick.changePercent ?? rawTick.change_24h_pct ?? null,
              vwap: rawTick.vwap ?? null,
              event_timestamp: rawTick.timestamp || rawTick.event_timestamp || new Date().toISOString(),
              received_timestamp: new Date().toISOString(),
              feed_latency_ms: rawTick.latency_ms ?? 0,
              data_mode: "REAL_TIME",
              is_stale: false,
              age_seconds: 0,
            };

            const existingKey = `${provider}:${sym}`;
            quotesRef.current.set(existingKey, quote);
            quotesRef.current.set(sym, quote);
            pendingQuotesRef.current.set(existingKey, quote);
            pendingQuotesRef.current.set(sym, quote);

            useMarketFeedStore.getState().ingestTick({
              symbol: sym,
              exchange: exchange,
              provider: provider,
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
              isStale: false,
              ageMs: 0,
              rawPayload: rawTick,
            });
          }
        } else if (msg.type === "PROVIDER_HEALTH" && msg.data) {
          const h = msg.data;
          const pName = (h.provider || "").toUpperCase();
          if (pName) {
            useMarketFeedStore.getState().updateProviderStat(pName, {
              status: h.connected ? "CONNECTED" : "OFFLINE",
              latencyMs: h.latency_ms ?? 0,
              lastMessageAt: h.last_message_ms ? new Date(h.last_message_ms).toISOString() : new Date().toISOString(),
              lastTickAgeMs: h.last_message_ms ? Math.max(0, Date.now() - h.last_message_ms) : 0,
              errorCount: h.error ? 1 : 0,
            });
          }
        } else if (msg.type === "GATEWAY_READY" || msg.type === "READY" || msg.type === "HEARTBEAT") {
          setConnectionStatus("CONNECTED");
          useMarketFeedStore.getState().setConnectionStatus("CONNECTED");
        }
      } catch {
        // ignore frame parse errors
      }
    };

    ws.onerror = () => {
      clearTimeout(connectTimeout);
      if (connectTimeoutRef.current === connectTimeout) connectTimeoutRef.current = null;
      if (!mountedRef.current || wsRef.current !== ws) return;

      if (wsRef.current === ws) wsRef.current = null;
      safeCloseSocket(ws, 1000, "Socket error");
      scheduleReconnect();
    };

    ws.onclose = () => {
      clearTimeout(connectTimeout);
      if (connectTimeoutRef.current === connectTimeout) connectTimeoutRef.current = null;
      if (!mountedRef.current) return;

      const managedWs = ws as ManagedWebSocket;
      if (managedWs._suppressReconnect) return;
      if (wsRef.current !== ws) return;

      wsRef.current = null;
      scheduleReconnect();
    };
  }, [getGatewayWsUrl, safeCloseSocket, scheduleReconnect]);

  // ───────────────────────────────────────────────────────────────────────────
  // Initial Connection Lifecycle
  // ───────────────────────────────────────────────────────────────────────────

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
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
      if (fallbackPollTimerRef.current) {
        clearInterval(fallbackPollTimerRef.current);
        fallbackPollTimerRef.current = null;
      }
      if (heartbeatWatchdogRef.current) {
        clearInterval(heartbeatWatchdogRef.current);
        heartbeatWatchdogRef.current = null;
      }

      const ws = wsRef.current as ManagedWebSocket | null;
      wsRef.current = null;
      if (ws) safeCloseSocket(ws, 1000, "Component unmounted");
    };
  }, [connectWS, safeCloseSocket]);

  // ───────────────────────────────────────────────────────────────────────────
  // Heartbeat Watchdog
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    heartbeatWatchdogRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      const age = Date.now() - lastHeartbeatRef.current;
      if (age <= HEARTBEAT_STALE_MS) return;
      if (connectionStatus !== "CONNECTED" && connectionStatus !== "LIVE") return;

      setConnectionStatus("STALE");
      useMarketFeedStore.getState().setConnectionStatus("STALE");

      const staleWs = wsRef.current as ManagedWebSocket | null;
      if (staleWs) {
        if (wsRef.current === staleWs) wsRef.current = null;
        safeCloseSocket(staleWs, 4001, "Heartbeat stale");
      }
      scheduleReconnect();
    }, 5000);

    return () => {
      if (heartbeatWatchdogRef.current) {
        clearInterval(heartbeatWatchdogRef.current);
        heartbeatWatchdogRef.current = null;
      }
    };
  }, [connectionStatus, safeCloseSocket, scheduleReconnect]);

  // ───────────────────────────────────────────────────────────────────────────
  // HTTP Fallback Polling (When Disconnected / Reconnecting)
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const pollFallbackSnapshots = async () => {
      if (!mountedRef.current) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const activeSymbols: string[] = [];
      subRefsRef.current.forEach((ref, sym) => {
        const hasActive = Array.from(ref.reasons.values()).some((count) => count > 0);
        if (hasActive) activeSymbols.push(sym);
      });

      if (activeSymbols.length === 0) return;

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
            Object.entries(incoming).forEach(([rawSym, q]) => {
              const sym = rawSym.toUpperCase();
              const provider = (q.provider || "UNKNOWN").toUpperCase();
              const incomingTs = new Date(q.event_timestamp || q.received_timestamp).getTime();

              const existing = quotesRef.current.get(`${provider}:${sym}`) || quotesRef.current.get(sym);
              if (existing) {
                const existingTs = new Date(existing.event_timestamp || existing.received_timestamp).getTime();
                if (existingTs > 0 && incomingTs < existingTs) return;
              }

              quotesRef.current.set(`${provider}:${sym}`, q);
              quotesRef.current.set(sym, q);

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

              const listeners = symbolListenersRef.current.get(sym);
              if (listeners && listeners.size > 0) {
                listeners.forEach((fn) => {
                  try {
                    fn(q);
                  } catch {
                    // ignore
                  }
                });
              }
            });
          }
        } catch {
          // ignore fallback batch failure
        }
      }
    };

    fallbackPollTimerRef.current = setInterval(pollFallbackSnapshots, FALLBACK_SNAPSHOT_POLL_MS);
    return () => {
      if (fallbackPollTimerRef.current) {
        clearInterval(fallbackPollTimerRef.current);
        fallbackPollTimerRef.current = null;
      }
    };
  }, [connectionStatus]);

  // ───────────────────────────────────────────────────────────────────────────
  // Provider Health Polling
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    let isCancelled = false;
    const fetchHealth = async () => {
      try {
        const res = await apiClient.get<any>("/api/market/providers/health", {
          timeoutMs: 4000,
          deduplicate: true,
        });
        if (res.ok && res.data && !isCancelled) {
          const raw = res.data.providerList || res.data.providers;
          if (Array.isArray(raw)) {
            const list: ProviderHealthEntry[] = raw.map((item: any) => ({
              provider_id: item.provider_id || item.provider?.toLowerCase() || item.name?.toLowerCase() || "unknown",
              provider_name: item.provider_name || item.name || item.provider || "Unknown",
              status: item.status || "OK",
              subscribed_symbols: item.subscribed_symbols ?? item.activeSubscriptions ?? item.subscriptions ?? 0,
              asset_classes: Array.isArray(item.asset_classes) ? item.asset_classes : (typeof item.feeds === "string" ? item.feeds.split(",").map((s: string) => s.trim()) : ["EQUITY"]),
              message: item.message,
            }));
            setProviderHealth(list);
          } else if (raw && typeof raw === "object") {
            const list: ProviderHealthEntry[] = Object.entries(raw).map(([k, v]: [string, any]) => ({
              provider_id: k.toLowerCase(),
              provider_name: k,
              status: v.status === "CONNECTED" || v.status === "LIVE" ? "LIVE" : v.status === "NOT CONFIGURED" || v.status === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : "OK",
              subscribed_symbols: v.subscriptions || 0,
              asset_classes: typeof v.feeds === "string" ? v.feeds.split(",").map((s: string) => s.trim()) : ["EQUITY"],
              message: v.lastMessage,
            }));
            setProviderHealth(list);
          } else {
            setProviderHealth([]);
          }
        }
      } catch {
        // non-fatal
      }
    };

    fetchHealth();
    const timer = setInterval(fetchHealth, HEALTH_POLL_MS);
    return () => {
      isCancelled = true;
      clearInterval(timer);
    };
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Subscribe & Unsubscribe Actions
  // ───────────────────────────────────────────────────────────────────────────

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
        wsRef.current.send(
          JSON.stringify({
            action: "subscribe",
            symbols: [sym],
            reason,
          })
        );
      } catch {
        // ignore
      }
    }
  }, []);

  const unsubscribe = useCallback((symbol: string, reason: SubscriptionReason) => {
    if (!symbol) return;
    const sym = symbol.toUpperCase().trim();
    const ref = subRefsRef.current.get(sym);
    if (!ref) return;

    const currentCount = ref.reasons.get(reason) ?? 0;
    if (currentCount <= 1) {
      ref.reasons.delete(reason);
    } else {
      ref.reasons.set(reason, currentCount - 1);
    }

    const anyRemaining = Array.from(ref.reasons.values()).some((count) => count > 0);
    if (!anyRemaining) {
      subRefsRef.current.delete(sym);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(
            JSON.stringify({
              action: "unsubscribe",
              symbols: [sym],
              reason,
            })
          );
        } catch {
          // ignore
        }
      }
    }
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Quote Getter
  // ───────────────────────────────────────────────────────────────────────────

  const getQuote = useCallback((symbol: string, exchange?: string, provider?: string): NormalizedQuote | null => {
    if (!symbol) return null;
    const sym = symbol.toUpperCase().trim();
    const prov = (provider || "").toUpperCase();
    const ex = (exchange || "").toUpperCase();

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

    const direct = quotesRef.current.get(sym);
    if (direct) {
      if (prov && direct.provider && direct.provider.toUpperCase() !== prov) {
        const providerDirect = quotesRef.current.get(`${prov}:${sym}`);
        if (providerDirect) return providerDirect;
      }
      return direct;
    }

    const aliases = getQuoteAliases(symbol, exchange, provider);
    for (const alias of aliases) {
      const quote = quotesRef.current.get(alias);
      if (quote) return quote;
    }

    return null;
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Direct Symbol Listener
  // ───────────────────────────────────────────────────────────────────────────

  const subscribeSymbolQuote = useCallback(
    (symbol: string, callback: (quote: NormalizedQuote) => void) => {
      if (!symbol) return () => {};
      const sym = symbol.toUpperCase().trim();

      if (!symbolListenersRef.current.has(sym)) {
        symbolListenersRef.current.set(sym, new Set());
      }

      const listeners = symbolListenersRef.current.get(sym)!;
      listeners.add(callback);

      return () => {
        listeners.delete(callback);
        if (listeners.size === 0) {
          symbolListenersRef.current.delete(sym);
        }
      };
    },
    []
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Computed State & Context Value
  // ───────────────────────────────────────────────────────────────────────────

  const healthList = Array.isArray(providerHealth) ? providerHealth : [];
  const hasProviderWarning = healthList.some(
    (provider) =>
      provider.status !== "LIVE" &&
      provider.status !== "OK" &&
      provider.status !== "NOT_CONFIGURED"
  );

  const value: MarketGatewayContextValue = useMemo(
    () => ({
      quotes: quotesRef.current,
      subscribe,
      unsubscribe,
      connectionStatus,
      providerHealth,
      hasProviderWarning,
      getQuote,
      subscribeSymbolQuote,
    }),
    [
      subscribe,
      unsubscribe,
      connectionStatus,
      providerHealth,
      hasProviderWarning,
      getQuote,
      subscribeSymbolQuote,
    ]
  );

  return (
    <MarketGatewayContext.Provider value={value}>
      {children}
    </MarketGatewayContext.Provider>
  );
}