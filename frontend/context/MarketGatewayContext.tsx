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

  data_mode:
  | "REAL_TIME"
  | "DELAYED"
  | "EOD"
  | "CACHED";

  is_stale: boolean;
  age_seconds: number;
}

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
  quotes: Map<string, NormalizedQuote>;

  subscribe: (
    symbol: string,
    reason: SubscriptionReason
  ) => void;

  unsubscribe: (
    symbol: string,
    reason: SubscriptionReason
  ) => void;

  connectionStatus: ConnectionStatus;

  providerHealth: ProviderHealthEntry[];

  hasProviderWarning: boolean;

  getQuote: (
    symbol: string,
    exchange?: string,
    provider?: string
  ) => NormalizedQuote | null;

  subscribeSymbolQuote: (
    symbol: string,
    callback: (quote: NormalizedQuote) => void
  ) => () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const MarketGatewayContext =
  createContext<MarketGatewayContextValue | null>(null);

export function useMarketGatewayContext():
  MarketGatewayContextValue {
  const ctx = useContext(MarketGatewayContext);

  if (!ctx) {
    throw new Error(
      "useMarketGatewayContext must be used inside <MarketGatewayProvider>"
    );
  }

  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const RECONNECT_DELAYS = [
  1000,
  2000,
  4000,
  8000,
  16000,
  30000,
];

const HEARTBEAT_STALE_MS = 20_000;
const HEALTH_POLL_MS = 30_000;
const FALLBACK_SNAPSHOT_POLL_MS = 10_000;

type SubRef = {
  reasons: Map<SubscriptionReason, number>;
};

/**
 * Local metadata placed on each browser WebSocket.
 *
 * _suppressReconnect = true means:
 * this socket is being closed intentionally and its
 * onclose handler must NOT create another reconnect.
 */
type ManagedWebSocket = WebSocket & {
  _suppressReconnect?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function MarketGatewayProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useAuth();



  const [
    connectionStatus,
    setConnectionStatus,
  ] = useState<ConnectionStatus>(
    "CONNECTING"
  );

  const [
    providerHealth,
    setProviderHealth,
  ] = useState<ProviderHealthEntry[]>([]);

  // ───────────────────────────────────────────────────────────────────────────
  // Refs
  // ───────────────────────────────────────────────────────────────────────────

  const wsRef =
    useRef<WebSocket | null>(null);

  const mountedRef =
    useRef(true);

  const reconnectAttemptRef =
    useRef(0);

  const reconnectTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  /**
   * IMPORTANT:
   * Connection timeout must also be tracked globally
   * so component cleanup can cancel it.
   */
  const connectTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  const fallbackPollTimerRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null
    );

  const lastHeartbeatRef =
    useRef<number>(
      Date.now()
    );

  const heartbeatWatchdogRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null
    );

  const subRefsRef =
    useRef<Map<string, SubRef>>(
      new Map()
    );

  const quotesRef =
    useRef<Map<string, NormalizedQuote>>(
      new Map()
    );

  const symbolListenersRef =
    useRef<
      Map<
        string,
        Set<(quote: NormalizedQuote) => void>
      >
    >(
      new Map()
    );

  const pendingQuotesRef =
    useRef<Map<string, NormalizedQuote>>(
      new Map()
    );

  const batchFrameRef =
    useRef<number | null>(
      null
    );

  const lastQuotesStateUpdateRef =
    useRef<number>(
      0
    );

  const scheduleReconnectRef =
    useRef<() => void>(
      () => { }
    );

  const connectWSRef =
    useRef<() => void>(
      () => { }
    );

  // Avoid TS/noUnusedLocals issue if auth is currently
  // intentionally not used to gate the gateway.
  void isAuthenticated;

  // ───────────────────────────────────────────────────────────────────────────
  // WebSocket URL
  // ───────────────────────────────────────────────────────────────────────────

  const getGatewayWsUrl =
    useCallback((): string => {
      if (
        typeof window === "undefined"
      ) {
        return "ws://127.0.0.1:5051/ws";
      }

      if (
        process.env
          .NEXT_PUBLIC_MARKET_GATEWAY_WS_URL
      ) {
        return process.env
          .NEXT_PUBLIC_MARKET_GATEWAY_WS_URL;
      }

      if (
        process.env
          .NEXT_PUBLIC_MARKET_WS_URL
      ) {
        return process.env
          .NEXT_PUBLIC_MARKET_WS_URL;
      }

      let host =
        window.location.hostname ||
        "127.0.0.1";

      if (host === "localhost") {
        host = "127.0.0.1";
      }

      const port =
        process.env
          .NEXT_PUBLIC_MARKET_GATEWAY_PORT ||
        "5051";

      const protocol =
        window.location.protocol ===
          "https:"
          ? "wss:"
          : "ws:";

      return `${protocol}//${host}:${port}/ws`;
    }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // WebSocket Connection
  // ───────────────────────────────────────────────────────────────────────────

  const connectWS =
    useCallback(() => {
      if (!mountedRef.current) {
        return;
      }

      /**
       * Don't create duplicate connections.
       */
      if (wsRef.current) {
        if (
          wsRef.current.readyState ===
          WebSocket.OPEN ||
          wsRef.current.readyState ===
          WebSocket.CONNECTING
        ) {
          return;
        }
      }

      if (
        reconnectAttemptRef.current > 0
      ) {
        setConnectionStatus(
          "RECONNECTING"
        );
      } else {
        setConnectionStatus(
          "CONNECTING"
        );
      }

      const wsUrl =
        getGatewayWsUrl();

      let ws: WebSocket;

      try {
        ws = new WebSocket(
          wsUrl
        );

        wsRef.current = ws;
      } catch {
        scheduleReconnectRef.current();
        return;
      }

      // ─────────────────────────────────────────────────────────────────────
      // Connection timeout
      // ─────────────────────────────────────────────────────────────────────

      const connectTimeout =
        setTimeout(() => {
          if (
            ws.readyState !==
            WebSocket.CONNECTING
          ) {
            return;
          }

          const managedWs =
            ws as ManagedWebSocket;

          /**
           * We manually schedule reconnect below.
           * Therefore onclose must not schedule
           * another one.
           */
          managedWs._suppressReconnect =
            true;

          if (
            wsRef.current === ws
          ) {
            wsRef.current = null;
          }

          try {
            ws.close(
              4000,
              "Connection timeout"
            );
          } catch {
            // Socket may already be unusable.
          }

          scheduleReconnectRef.current();
        }, 5000);

      connectTimeoutRef.current =
        connectTimeout;

      // ─────────────────────────────────────────────────────────────────────
      // OPEN
      // ─────────────────────────────────────────────────────────────────────

      ws.onopen = () => {
        clearTimeout(
          connectTimeout
        );

        if (
          connectTimeoutRef.current ===
          connectTimeout
        ) {
          connectTimeoutRef.current =
            null;
        }

        if (
          !mountedRef.current ||
          wsRef.current !== ws ||
          (
            ws as ManagedWebSocket
          )._suppressReconnect
        ) {
          return;
        }

        reconnectAttemptRef.current =
          0;

        lastHeartbeatRef.current =
          Date.now();

        setConnectionStatus(
          "CONNECTED"
        );

        useMarketFeedStore
          .getState()
          .setConnectionStatus(
            "CONNECTED"
          );

        // ─────────────────────────────────────────────────────────────────
        // Restore active subscriptions
        // ─────────────────────────────────────────────────────────────────

        const allSubs: string[] =
          [];

        subRefsRef.current.forEach(
          (
            ref,
            sym
          ) => {
            const hasActive =
              Array.from(
                ref.reasons.values()
              ).some(
                (count) =>
                  count > 0
              );

            if (hasActive) {
              allSubs.push(sym);
            }
          }
        );

        if (
          allSubs.length > 0 &&
          ws.readyState ===
          WebSocket.OPEN
        ) {
          try {
            ws.send(
              JSON.stringify({
                action:
                  "subscribe",
                symbols:
                  allSubs,
                reason:
                  "RESTORE_SUBSCRIPTIONS",
              })
            );
          } catch {
            // Ignore send failure.
          }
        }
      };

      // ─────────────────────────────────────────────────────────────────────
      // MESSAGE
      // ─────────────────────────────────────────────────────────────────────

      ws.onmessage = (
        event
      ) => {
        if (
          !mountedRef.current ||
          wsRef.current !== ws ||
          (
            ws as ManagedWebSocket
          )._suppressReconnect
        ) {
          return;
        }

        /**
         * Any valid incoming WS frame
         * proves that the socket is alive.
         */
        lastHeartbeatRef.current =
          Date.now();

        try {
          const msg =
            JSON.parse(
              event.data
            );

          // ───────────────────────────────────────────────────────────────
          // Quote
          // ───────────────────────────────────────────────────────────────

          if (
            msg.type ===
            "QUOTE" &&
            msg.data
          ) {
            const quote =
              msg.data as NormalizedQuote;

            const sym =
              quote.symbol.toUpperCase();

            const provider =
              (
                quote.provider ||
                "UNKNOWN"
              ).toUpperCase();

            const incomingTs =
              new Date(
                quote.event_timestamp ||
                quote.received_timestamp
              ).getTime();

            const existingKey =
              `${provider}:${sym}`;

            const existing =
              quotesRef.current.get(
                existingKey
              ) ||
              quotesRef.current.get(
                sym
              );

            /**
             * Reject old/out-of-order ticks.
             */
            if (existing) {
              const existingTs =
                new Date(
                  existing.event_timestamp ||
                  existing.received_timestamp
                ).getTime();

              if (
                existingTs > 0 &&
                incomingTs <
                existingTs
              ) {
                return;
              }
            }

            // ─────────────────────────────────────────────────────────────
            // Provider scoped storage
            // ─────────────────────────────────────────────────────────────

            quotesRef.current.set(
              existingKey,
              quote
            );

            pendingQuotesRef.current.set(
              existingKey,
              quote
            );

            const aliases =
              getQuoteAliases(
                quote.symbol,
                quote.exchange,
                quote.provider
              );

            aliases.forEach(
              (alias) => {
                if (
                  alias.startsWith(
                    "BINANCE:"
                  ) &&
                  provider !==
                  "BINANCE"
                ) {
                  return;
                }

                if (
                  alias.startsWith(
                    "DELTA:"
                  ) &&
                  provider !==
                  "DELTA"
                ) {
                  return;
                }

                if (
                  alias.startsWith(
                    "DHAN:"
                  ) &&
                  provider !==
                  "DHAN"
                ) {
                  return;
                }

                if (
                  alias.startsWith(
                    "UPSTOX:"
                  ) &&
                  provider !==
                  "UPSTOX"
                ) {
                  return;
                }

                if (
                  alias.startsWith(
                    "OANDA:"
                  ) &&
                  provider !==
                  "OANDA"
                ) {
                  return;
                }

                quotesRef.current.set(
                  alias,
                  quote
                );

                pendingQuotesRef.current.set(
                  alias,
                  quote
                );
              }
            );

            // ─────────────────────────────────────────────────────────────
            // Zustand ingestion
            // ─────────────────────────────────────────────────────────────

            useMarketFeedStore
              .getState()
              .ingestTick({
                symbol:
                  sym,

                exchange:
                  quote.exchange,

                provider:
                  quote.provider,

                lastPrice:
                  quote.last_price,

                bid:
                  quote.bid,

                ask:
                  quote.ask,

                volume:
                  quote.volume,

                open:
                  quote.open,

                high:
                  quote.high,

                low:
                  quote.low,

                close:
                  quote.close,

                changePercent:
                  quote.change_pct ??
                  0,

                eventTimestamp:
                  quote.event_timestamp,

                feedLatencyMs:
                  quote.feed_latency_ms,

                dataMode:
                  quote.data_mode,

                isStale:
                  quote.is_stale,

                ageMs:
                  (
                    quote.age_seconds ||
                    0
                  ) *
                  1000,
              });

            // ─────────────────────────────────────────────────────────────
            // Symbol listeners
            // ─────────────────────────────────────────────────────────────

            aliases.forEach(
              (alias) => {
                const listeners =
                  symbolListenersRef.current.get(
                    alias
                  );

                if (
                  listeners &&
                  listeners.size >
                  0
                ) {
                  listeners.forEach(
                    (fn) => {
                      try {
                        fn(
                          quote
                        );
                      } catch {
                        // Listener failure should not break stream.
                      }
                    }
                  );
                }
              }
            );


          }

          // ───────────────────────────────────────────────────────────────
          // Snapshot
          // ───────────────────────────────────────────────────────────────
          else if (
            msg.type ===
            "SNAPSHOT" &&
            msg.data
          ) {
            const snapshotEntries =
              Object.entries(
                msg.data as Record<
                  string,
                  NormalizedQuote
                >
              );

            snapshotEntries.forEach(
              (
                [
                  rawSym,
                  q,
                ]
              ) => {
                const sym =
                  rawSym.toUpperCase();

                const provider =
                  (
                    q.provider ||
                    "UNKNOWN"
                  ).toUpperCase();

                const provKey =
                  `${provider}:${sym}`;

                quotesRef.current.set(
                  provKey,
                  q
                );

                quotesRef.current.set(
                  sym,
                  q
                );

                pendingQuotesRef.current.set(
                  provKey,
                  q
                );

                pendingQuotesRef.current.set(
                  sym,
                  q
                );

                useMarketFeedStore
                  .getState()
                  .ingestTick({
                    symbol:
                      sym,

                    exchange:
                      q.exchange,

                    provider:
                      q.provider,

                    lastPrice:
                      q.last_price,

                    bid:
                      q.bid,

                    ask:
                      q.ask,

                    volume:
                      q.volume,

                    open:
                      q.open,

                    high:
                      q.high,

                    low:
                      q.low,

                    close:
                      q.close,

                    changePercent:
                      q.change_pct ??
                      0,

                    eventTimestamp:
                      q.event_timestamp,

                    feedLatencyMs:
                      q.feed_latency_ms,

                    dataMode:
                      q.data_mode,

                    isStale:
                      q.is_stale,

                    ageMs:
                      (
                        q.age_seconds ||
                        0
                      ) *
                      1000,
                  });

                const listeners =
                  symbolListenersRef.current.get(
                    sym
                  );

                if (
                  listeners &&
                  listeners.size >
                  0
                ) {
                  listeners.forEach(
                    (fn) => {
                      try {
                        fn(q);
                      } catch {
                        // Ignore listener failure.
                      }
                    }
                  );
                }
              }
            );


          }

          // ───────────────────────────────────────────────────────────────
          // Gateway ready / heartbeat
          // ───────────────────────────────────────────────────────────────
          else if (
            msg.type ===
            "GATEWAY_READY" ||
            msg.type ===
            "READY" ||
            msg.type ===
            "HEARTBEAT"
          ) {
            setConnectionStatus(
              "CONNECTED"
            );

            useMarketFeedStore
              .getState()
              .setConnectionStatus(
                "CONNECTED"
              );
          }
        } catch {
          /**
           * Malformed individual frames should
           * never destroy the whole WebSocket.
           */
        }
      };

      // ─────────────────────────────────────────────────────────────────────
      // ERROR
      // ─────────────────────────────────────────────────────────────────────

      ws.onerror = () => {
        clearTimeout(
          connectTimeout
        );

        if (
          connectTimeoutRef.current ===
          connectTimeout
        ) {
          connectTimeoutRef.current =
            null;
        }

        if (
          !mountedRef.current ||
          wsRef.current !== ws
        ) {
          return;
        }

        const managedWs =
          ws as ManagedWebSocket;

        /**
         * We will manually reconnect,
         * therefore onclose must not
         * schedule a duplicate reconnect.
         */
        managedWs._suppressReconnect =
          true;

        wsRef.current =
          null;

        try {
          ws.close();
        } catch {
          // Ignore.
        }

        scheduleReconnectRef.current();
      };

      // ─────────────────────────────────────────────────────────────────────
      // CLOSE
      // ─────────────────────────────────────────────────────────────────────

      ws.onclose = () => {
        clearTimeout(
          connectTimeout
        );

        if (
          connectTimeoutRef.current ===
          connectTimeout
        ) {
          connectTimeoutRef.current =
            null;
        }

        if (
          !mountedRef.current
        ) {
          return;
        }

        const managedWs =
          ws as ManagedWebSocket;

        /**
         * Timeout/error/stale/unmount already
         * handled the reconnect decision.
         */
        if (
          managedWs._suppressReconnect
        ) {
          return;
        }

        /**
         * Ignore close events from an OLD socket.
         *
         * This prevents an old socket from
         * killing/restarting a newly connected socket.
         */
        if (
          wsRef.current !== ws
        ) {
          return;
        }

        wsRef.current =
          null;

        scheduleReconnectRef.current();
      };
    }, [
      getGatewayWsUrl,
    ]);

  /**
   * Always expose the latest connectWS
   * function to reconnect timers.
   */
  connectWSRef.current =
    connectWS;

  // ───────────────────────────────────────────────────────────────────────────
  // Reconnect scheduler
  // ───────────────────────────────────────────────────────────────────────────

  const scheduleReconnect =
    useCallback(() => {
      if (
        !mountedRef.current
      ) {
        return;
      }

      setConnectionStatus(
        "RECONNECTING"
      );

      const attempt =
        reconnectAttemptRef.current;

      const delayIndex =
        Math.min(
          attempt,
          RECONNECT_DELAYS.length -
          1
        );

      const baseDelay =
        RECONNECT_DELAYS[
        delayIndex
        ];

      const jitter =
        Math.floor(
          Math.random() *
          300
        );

      const delay =
        baseDelay +
        jitter;

      reconnectAttemptRef.current =
        Math.min(
          attempt + 1,
          RECONNECT_DELAYS.length
        );

      /**
       * Only ONE reconnect timer is allowed.
       */
      if (
        reconnectTimerRef.current
      ) {
        clearTimeout(
          reconnectTimerRef.current
        );
      }

      reconnectTimerRef.current =
        setTimeout(() => {
          reconnectTimerRef.current =
            null;

          if (
            mountedRef.current
          ) {
            connectWSRef.current();
          }
        }, delay);
    }, []);

  scheduleReconnectRef.current =
    scheduleReconnect;

  // ───────────────────────────────────────────────────────────────────────────
  // HTTP fallback polling
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const pollFallbackSnapshots =
      async () => {
        if (
          !mountedRef.current
        ) {
          return;
        }

        /**
         * Don't use REST fallback while WS
         * is healthy/open.
         */
        if (
          wsRef.current
            ?.readyState ===
          WebSocket.OPEN
        ) {
          return;
        }

        const activeSymbols: string[] =
          [];

        subRefsRef.current.forEach(
          (
            ref,
            sym
          ) => {
            const hasActive =
              Array.from(
                ref.reasons.values()
              ).some(
                (count) =>
                  count > 0
              );

            if (hasActive) {
              activeSymbols.push(
                sym
              );
            }
          }
        );

        if (
          activeSymbols.length ===
          0
        ) {
          return;
        }

        const batchSize =
          50;

        for (
          let i = 0;
          i <
          activeSymbols.length;
          i += batchSize
        ) {
          const batch =
            activeSymbols.slice(
              i,
              i + batchSize
            );

          try {
            const symbolsParam =
              encodeURIComponent(
                batch.join(",")
              );

            const res =
              await apiClient.get<any>(
                `/api/market/snapshot?symbols=${symbolsParam}`,
                {
                  timeoutMs:
                    4000,

                  deduplicate:
                    true,
                }
              );

            if (
              res.ok &&
              res.data?.quotes
            ) {
              const incoming =
                res.data
                  .quotes as Record<
                    string,
                    NormalizedQuote
                  >;

              Object.entries(
                incoming
              ).forEach(
                (
                  [
                    rawSym,
                    q,
                  ]
                ) => {
                  const sym =
                    rawSym.toUpperCase();

                  const provider =
                    (
                      q.provider ||
                      "UNKNOWN"
                    ).toUpperCase();

                  const incomingTs =
                    new Date(
                      q.event_timestamp ||
                      q.received_timestamp
                    ).getTime();

                  const existing =
                    quotesRef.current.get(
                      `${provider}:${sym}`
                    ) ||
                    quotesRef.current.get(
                      sym
                    );

                  if (
                    existing
                  ) {
                    const existingTs =
                      new Date(
                        existing.event_timestamp ||
                        existing.received_timestamp
                      ).getTime();

                    if (
                      existingTs >
                      0 &&
                      incomingTs <
                      existingTs
                    ) {
                      return;
                    }
                  }

                  quotesRef.current.set(
                    `${provider}:${sym}`,
                    q
                  );

                  quotesRef.current.set(
                    sym,
                    q
                  );

                  useMarketFeedStore
                    .getState()
                    .ingestTick({
                      symbol:
                        sym,

                      exchange:
                        q.exchange,

                      provider:
                        q.provider,

                      lastPrice:
                        q.last_price,

                      bid:
                        q.bid,

                      ask:
                        q.ask,

                      volume:
                        q.volume,

                      open:
                        q.open,

                      high:
                        q.high,

                      low:
                        q.low,

                      close:
                        q.close,

                      changePercent:
                        q.change_pct ??
                        0,

                      eventTimestamp:
                        q.event_timestamp,

                      feedLatencyMs:
                        q.feed_latency_ms,

                      dataMode:
                        q.data_mode,

                      isStale:
                        q.is_stale,

                      ageMs:
                        (
                          q.age_seconds ||
                          0
                        ) *
                        1000,
                    });

                  const listeners =
                    symbolListenersRef.current.get(
                      sym
                    );

                  if (
                    listeners &&
                    listeners.size >
                    0
                  ) {
                    listeners.forEach(
                      (fn) => {
                        try {
                          fn(q);
                        } catch {
                          // Ignore listener failure.
                        }
                      }
                    );
                  }
                }
              );
            }
          } catch {
            /**
             * Failure of one REST batch should
             * not break remaining batches.
             */
          }
        }
      };

    fallbackPollTimerRef.current =
      setInterval(
        pollFallbackSnapshots,
        FALLBACK_SNAPSHOT_POLL_MS
      );

    return () => {
      if (
        fallbackPollTimerRef.current
      ) {
        clearInterval(
          fallbackPollTimerRef.current
        );

        fallbackPollTimerRef.current =
          null;
      }
    };
  }, [
    connectionStatus,
  ]);

  // ───────────────────────────────────────────────────────────────────────────
  // Heartbeat Watchdog
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    heartbeatWatchdogRef.current =
      setInterval(() => {
        if (
          !mountedRef.current
        ) {
          return;
        }

        const age =
          Date.now() -
          lastHeartbeatRef.current;

        if (
          age <=
          HEARTBEAT_STALE_MS
        ) {
          return;
        }

        if (
          connectionStatus !==
          "CONNECTED" &&
          connectionStatus !==
          "LIVE"
        ) {
          return;
        }

        /**
         * Socket has stopped producing messages.
         */
        setConnectionStatus(
          "STALE"
        );

        useMarketFeedStore
          .getState()
          .setConnectionStatus(
            "STALE"
          );

        const staleWs =
          wsRef.current as ManagedWebSocket | null;

        if (staleWs) {
          /**
           * Reconnect is manually scheduled below.
           */
          staleWs._suppressReconnect =
            true;

          /**
           * Detach stale socket BEFORE closing it.
           */
          if (
            wsRef.current ===
            staleWs
          ) {
            wsRef.current =
              null;
          }

          try {
            if (
              staleWs.readyState ===
              WebSocket.OPEN ||
              staleWs.readyState ===
              WebSocket.CONNECTING
            ) {
              staleWs.close(
                4001,
                "Heartbeat stale"
              );
            }
          } catch {
            // Ignore stale-socket close failure.
          }
        }

        /**
         * This was missing in the old behavior.
         *
         * STALE now actually causes a new connection.
         */
        scheduleReconnectRef.current();
      }, 5000);

    return () => {
      if (
        heartbeatWatchdogRef.current
      ) {
        clearInterval(
          heartbeatWatchdogRef.current
        );

        heartbeatWatchdogRef.current =
          null;
      }
    };
  }, [
    connectionStatus,
  ]);

  // ───────────────────────────────────────────────────────────────────────────
  // Provider Health Polling
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    let isCancelled =
      false;

    const fetchHealth =
      async () => {
        try {
          const res =
            await apiClient.get<any>(
              "/api/market/providers/health",
              {
                timeoutMs:
                  4000,

                deduplicate:
                  true,
              }
            );

          if (
            res.ok &&
            res.data &&
            !isCancelled
          ) {
            setProviderHealth(
              res.data
                .providers ??
              []
            );
          }
        } catch {
          // Health endpoint failure is non-fatal.
        }
      };

    fetchHealth();

    const timer =
      setInterval(
        fetchHealth,
        HEALTH_POLL_MS
      );

    return () => {
      isCancelled =
        true;

      clearInterval(
        timer
      );
    };
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Initial Connection + FULL cleanup
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current =
      true;

    connectWS();

    return () => {
      /**
       * FIRST:
       * mark provider as unmounted.
       *
       * All asynchronous callbacks now refuse
       * to reconnect.
       */
      mountedRef.current =
        false;

      // ─────────────────────────────────────────────────────────────────────
      // Animation frame
      // ─────────────────────────────────────────────────────────────────────

      if (
        batchFrameRef.current !==
        null
      ) {
        cancelAnimationFrame(
          batchFrameRef.current
        );

        batchFrameRef.current =
          null;
      }

      // ─────────────────────────────────────────────────────────────────────
      // Reconnect timer
      // ─────────────────────────────────────────────────────────────────────

      if (
        reconnectTimerRef.current
      ) {
        clearTimeout(
          reconnectTimerRef.current
        );

        reconnectTimerRef.current =
          null;
      }

      // ─────────────────────────────────────────────────────────────────────
      // Connection timeout
      // ─────────────────────────────────────────────────────────────────────

      if (
        connectTimeoutRef.current
      ) {
        clearTimeout(
          connectTimeoutRef.current
        );

        connectTimeoutRef.current =
          null;
      }

      // ─────────────────────────────────────────────────────────────────────
      // REST fallback timer
      // ─────────────────────────────────────────────────────────────────────

      if (
        fallbackPollTimerRef.current
      ) {
        clearInterval(
          fallbackPollTimerRef.current
        );

        fallbackPollTimerRef.current =
          null;
      }

      // ─────────────────────────────────────────────────────────────────────
      // Heartbeat timer
      // ─────────────────────────────────────────────────────────────────────

      if (
        heartbeatWatchdogRef.current
      ) {
        clearInterval(
          heartbeatWatchdogRef.current
        );

        heartbeatWatchdogRef.current =
          null;
      }

      // ─────────────────────────────────────────────────────────────────────
      // WebSocket
      // ─────────────────────────────────────────────────────────────────────

      const ws =
        wsRef.current as ManagedWebSocket | null;

      /**
       * Important:
       * remove it from wsRef BEFORE close().
       */
      wsRef.current =
        null;

      if (ws) {
        /**
         * Closing because component unmounted.
         * Never reconnect from this close.
         */
        ws._suppressReconnect =
          true;

        try {
          if (
            ws.readyState ===
            WebSocket.OPEN ||
            ws.readyState ===
            WebSocket.CONNECTING
          ) {
            ws.close(
              1000,
              "Component unmounted"
            );
          }
        } catch (
        error
        ) {
          console.warn(
            "[MarketGateway] WebSocket cleanup failed:",
            error
          );
        }
      }
    };
  }, [
    connectWS,
  ]);

  // ───────────────────────────────────────────────────────────────────────────
  // Subscribe
  // ───────────────────────────────────────────────────────────────────────────

  const subscribe =
    useCallback(
      (
        symbol: string,
        reason: SubscriptionReason
      ) => {
        if (!symbol) {
          return;
        }

        const sym =
          symbol
            .toUpperCase()
            .trim();

        let ref =
          subRefsRef.current.get(
            sym
          );

        if (!ref) {
          ref = {
            reasons:
              new Map(),
          };

          subRefsRef.current.set(
            sym,
            ref
          );
        }

        const currentCount =
          ref.reasons.get(
            reason
          ) ??
          0;

        ref.reasons.set(
          reason,
          currentCount + 1
        );

        /**
         * Only send subscription the first time
         * this reason becomes active.
         */
        if (
          currentCount === 0 &&
          wsRef.current
            ?.readyState ===
          WebSocket.OPEN
        ) {
          try {
            wsRef.current.send(
              JSON.stringify({
                action:
                  "subscribe",

                symbols: [
                  sym,
                ],

                reason,
              })
            );
          } catch {
            // Reconnect restore will retry later.
          }
        }
      },
      []
    );

  // ───────────────────────────────────────────────────────────────────────────
  // Unsubscribe
  // ───────────────────────────────────────────────────────────────────────────

  const unsubscribe =
    useCallback(
      (
        symbol: string,
        reason: SubscriptionReason
      ) => {
        if (!symbol) {
          return;
        }

        const sym =
          symbol
            .toUpperCase()
            .trim();

        const ref =
          subRefsRef.current.get(
            sym
          );

        if (!ref) {
          return;
        }

        const currentCount =
          ref.reasons.get(
            reason
          ) ??
          0;

        if (
          currentCount <= 1
        ) {
          ref.reasons.delete(
            reason
          );
        } else {
          ref.reasons.set(
            reason,
            currentCount - 1
          );
        }

        const anyRemaining =
          Array.from(
            ref.reasons.values()
          ).some(
            (count) =>
              count > 0
          );

        if (
          !anyRemaining
        ) {
          subRefsRef.current.delete(
            sym
          );

          if (
            wsRef.current
              ?.readyState ===
            WebSocket.OPEN
          ) {
            try {
              wsRef.current.send(
                JSON.stringify({
                  action:
                    "unsubscribe",

                  symbols: [
                    sym,
                  ],

                  reason,
                })
              );
            } catch {
              // Ignore unsubscribe network failure.
            }
          }
        }
      },
      []
    );

  // ───────────────────────────────────────────────────────────────────────────
  // Quote Getter
  // ───────────────────────────────────────────────────────────────────────────

  const getQuote =
    useCallback(
      (
        symbol: string,
        exchange?: string,
        provider?: string
      ):
        | NormalizedQuote
        | null => {
        if (!symbol) {
          return null;
        }

        const sym =
          symbol
            .toUpperCase()
            .trim();

        const prov =
          (
            provider ||
            ""
          ).toUpperCase();

        const ex =
          (
            exchange ||
            ""
          ).toUpperCase();

        // ─────────────────────────────────────────────────────────────────
        // Provider scoped
        // ─────────────────────────────────────────────────────────────────

        if (prov) {
          const provKey =
            `${prov}:${sym}`;

          if (
            quotesRef.current.has(
              provKey
            )
          ) {
            return quotesRef.current.get(
              provKey
            )!;
          }

          if (ex) {
            const provExKey =
              `${prov}:${ex}:${sym}`;

            if (
              quotesRef.current.has(
                provExKey
              )
            ) {
              return quotesRef.current.get(
                provExKey
              )!;
            }
          }
        }

        // ─────────────────────────────────────────────────────────────────
        // Exchange scoped
        // ─────────────────────────────────────────────────────────────────

        if (ex) {
          const exKey =
            `${ex}:${sym}`;

          if (
            quotesRef.current.has(
              exKey
            )
          ) {
            return quotesRef.current.get(
              exKey
            )!;
          }
        }

        // ─────────────────────────────────────────────────────────────────
        // Direct symbol
        // ─────────────────────────────────────────────────────────────────

        const direct =
          quotesRef.current.get(
            sym
          );

        if (direct) {
          if (
            prov &&
            direct.provider &&
            direct.provider.toUpperCase() !==
            prov
          ) {
            const providerDirect =
              quotesRef.current.get(
                `${prov}:${sym}`
              );

            if (
              providerDirect
            ) {
              return providerDirect;
            }
          }

          return direct;
        }

        // ─────────────────────────────────────────────────────────────────
        // Aliases
        // ─────────────────────────────────────────────────────────────────

        const aliases =
          getQuoteAliases(
            symbol,
            exchange,
            provider
          );

        for (
          const alias of
          aliases
        ) {
          const quote =
            quotesRef.current.get(
              alias
            );

          if (quote) {
            return quote;
          }
        }

        return null;
      },
      []
    );

  // ───────────────────────────────────────────────────────────────────────────
  // Direct symbol listener
  // ───────────────────────────────────────────────────────────────────────────

  const subscribeSymbolQuote =
    useCallback(
      (
        symbol: string,
        callback: (
          quote: NormalizedQuote
        ) => void
      ) => {
        if (!symbol) {
          return () => { };
        }

        const sym =
          symbol
            .toUpperCase()
            .trim();

        if (
          !symbolListenersRef.current.has(
            sym
          )
        ) {
          symbolListenersRef.current.set(
            sym,
            new Set()
          );
        }

        const listeners =
          symbolListenersRef.current.get(
            sym
          )!;

        listeners.add(
          callback
        );

        return () => {
          listeners.delete(
            callback
          );

          if (
            listeners.size ===
            0
          ) {
            symbolListenersRef.current.delete(
              sym
            );
          }
        };
      },
      []
    );

  // ───────────────────────────────────────────────────────────────────────────
  // Provider warning
  // ───────────────────────────────────────────────────────────────────────────

  const hasProviderWarning =
    providerHealth.some(
      (provider) =>
        provider.status !==
        "LIVE" &&
        provider.status !==
        "OK" &&
        provider.status !==
        "NOT_CONFIGURED"
    );

  // ───────────────────────────────────────────────────────────────────────────
  // Context value
  // ───────────────────────────────────────────────────────────────────────────

  const value:
    MarketGatewayContextValue =
    useMemo(
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

  // ───────────────────────────────────────────────────────────────────────────
  // Provider
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <MarketGatewayContext.Provider
      value={value}
    >
      {children}
    </MarketGatewayContext.Provider>
  );
}