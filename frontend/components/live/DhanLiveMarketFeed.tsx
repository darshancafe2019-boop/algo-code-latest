"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Radio,
  Clock,
  Zap,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Layers,
  Database,
  ExternalLink,
  Sliders,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { formatPrice, formatPercent, formatVolume } from "@/lib/formatters";

interface DhanQuoteTick {
  provider: string;
  account: string;
  exchange_segment: string;
  security_id: string;
  symbol: string;
  last_price: number;
  bid_price?: number;
  ask_price?: number;
  volume?: number;
  open_interest?: number;
  open?: number;
  high?: number;
  low?: number;
  previous_close?: number;
  event_time?: string;
  received_at?: string;
  freshness_ms?: number;
  connection_status?: string;
  data_mode?: string;
  execution_mode?: string;
}

interface DhanStatusResponse {
  provider: string;
  account: string;
  status:
    | "DISABLED"
    | "STARTING"
    | "SOCKET_CONNECTED_NO_TICK"
    | "CONNECTED"
    | "STALE"
    | "AUTH_REQUIRED"
    | "DATA_API_UNAVAILABLE"
    | "INVALID_INSTRUMENT"
    | "MARKET_CLOSED_OR_NO_TICK"
    | "ERROR"
    | string;
  subscribed_instruments: number;
  last_tick_at: string | null;
  freshness_ms: number | null;
  data_api_access: string;
  execution_mode: string;
  ticks_received: number;
  error_count: number;
  error_message: string | null;
}

export function DhanLiveMarketFeed() {
  const [quotes, setQuotes] = useState<Record<string, DhanQuoteTick>>({});
  const [lastTickIso, setLastTickIso] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("RELIANCE");
  const [priceFlash, setPriceFlash] = useState<Record<string, "up" | "down" | null>>({});
  const prevPriceRef = useRef<Record<string, number>>({});
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  // 1. Query Server-Side Dhan Feed Status (`GET /api/brokers/dhan/status`)
  const { data: dhanStatus, refetch: refetchStatus } = useQuery<DhanStatusResponse>({
    queryKey: ["dhanFeedStatus"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/brokers/dhan/status");
        if (res.ok) return await res.json();
      } catch (err: any) {
        console.warn("Dhan status fetch note:", err);
      }
      return {
        provider: "dhan",
        account: "dhan_primary",
        status: "STARTING",
        subscribed_instruments: 0,
        last_tick_at: null,
        freshness_ms: null,
        data_api_access: "UNAVAILABLE",
        execution_mode: "PAPER",
        ticks_received: 0,
        error_count: 0,
        error_message: null,
      };
    },
    refetchInterval: 3000,
  });

  // 2. Fetch Initial Snapshots (`GET /api/market-data/dhan/quotes`)
  const { data: initialQuotesData } = useQuery({
    queryKey: ["dhanInitialQuotes"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/market-data/dhan/quotes");
        if (res.ok) {
          const json = await res.json();
          return json.quotes || {};
        }
      } catch (err) {
        console.warn("Initial quotes fetch note:", err);
      }
      return {};
    },
    staleTime: 5000,
  });

  useEffect(() => {
    if (initialQuotesData && Object.keys(initialQuotesData).length > 0) {
      setQuotes((prev) => ({ ...prev, ...initialQuotesData }));
    }
  }, [initialQuotesData]);

  // 3. Connect to Server-Sent Event (SSE) Stream (`/api/market-data/stream?provider=dhan&symbols=...`)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let isCancelled = false;

    // Build symbol list from initial quotes (the existing LIVE-tab symbol set)
    const knownSymbols = initialQuotesData ? Object.keys(initialQuotesData) : [];

    const connectSSE = () => {
      if (typeof window === "undefined") return;
      try {
        let streamUrl = "/api/market-data/stream?provider=dhan";
        if (knownSymbols.length > 0) {
          streamUrl += `&symbols=${knownSymbols.join(",")}`;
        }
        eventSource = new EventSource(streamUrl);

        eventSource.onopen = () => {
          if (isCancelled) return;
          setIsStreaming(true);
          setStreamError(null);
        };

        eventSource.onmessage = (event) => {
          if (isCancelled) return;
          try {
            const parsed = JSON.parse(event.data);

            // Handle Gateway-wrapped messages: {type: "QUOTE", data: {...}}
            if (parsed && parsed.type === "QUOTE" && parsed.data) {
              const data = parsed.data;
              if (data.symbol && data.last_price > 0) {
                const sym = data.symbol;
                const newPrice = Number(data.last_price);
                const oldPrice = prevPriceRef.current[sym];

                if (oldPrice !== undefined && oldPrice !== newPrice) {
                  setPriceFlash((prev) => ({
                    ...prev,
                    [sym]: newPrice > oldPrice ? "up" : "down",
                  }));
                  setTimeout(() => {
                    setPriceFlash((prev) => ({ ...prev, [sym]: null }));
                  }, 800);
                }
                prevPriceRef.current[sym] = newPrice;

                setQuotes((prev) => ({ ...prev, [sym]: data }));
                setLastTickIso(data.event_time || data.received_timestamp || new Date().toISOString());
              }
              return;
            }

            // Handle SNAPSHOT events: {type: "SNAPSHOT", data: {symbol: quote, ...}}
            if (parsed && parsed.type === "SNAPSHOT" && parsed.data) {
              const snapQuotes = parsed.data;
              if (typeof snapQuotes === "object" && snapQuotes !== null) {
                setQuotes((prev) => ({ ...prev, ...snapQuotes }));
              }
              return;
            }

            // Legacy flat format fallback: {symbol, last_price, ...}
            if (parsed && parsed.symbol && parsed.last_price > 0) {
              const sym = parsed.symbol;
              const newPrice = Number(parsed.last_price);
              const oldPrice = prevPriceRef.current[sym];

              if (oldPrice !== undefined && oldPrice !== newPrice) {
                setPriceFlash((prev) => ({
                  ...prev,
                  [sym]: newPrice > oldPrice ? "up" : "down",
                }));
                setTimeout(() => {
                  setPriceFlash((prev) => ({ ...prev, [sym]: null }));
                }, 800);
              }
              prevPriceRef.current[sym] = newPrice;

              setQuotes((prev) => ({ ...prev, [sym]: parsed }));
              setLastTickIso(parsed.event_time || new Date().toISOString());
            }
          } catch {
            // Ignore heartbeat/comment frames
          }
        };

        eventSource.onerror = () => {
          if (isCancelled) return;
          setIsStreaming(false);
          setStreamError("SSE stream disconnected. Reconnecting in 3s...");
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          setTimeout(() => {
            if (!isCancelled) connectSSE();
          }, 3000);
        };
      } catch (err: any) {
        setStreamError(err.message || "Failed to initialize SSE stream");
      }
    };

    connectSSE();

    return () => {
      isCancelled = true;
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }, [initialQuotesData]);

  const quoteList = useMemo(() => {
    return Object.values(quotes);
  }, [quotes]);

  const activeQuote = quotes[selectedSymbol] || quoteList[0] || null;
  const status = dhanStatus?.status || "STARTING";

  return (
    <div className="space-y-6 font-sans select-none text-slate-100">
      {/* ─── Top Telemetry & Health Ribbon ────────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#080E20] border border-[#213047] shadow-xl flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Radio className={`h-5 w-5 ${isStreaming ? "animate-pulse" : ""}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white tracking-wide">DHAN HQ V2 REAL-TIME MARKET FEED</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                DATA SOURCE: DHAN HQ
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                PAPER ONLY OMS
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5 font-mono">
              Official Dhan Live Feed (wss://api-feed.dhan.co) • Binary Little-Endian Struct Decoder
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2.5 flex-wrap font-mono text-xs">
          {/* Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-bold ${
              status === "CONNECTED"
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                : status === "STALE"
                ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                : status === "AUTH_REQUIRED"
                ? "bg-rose-500/15 border-rose-500/40 text-rose-400"
                : status === "MARKET_CLOSED_OR_NO_TICK"
                ? "bg-blue-500/15 border-blue-500/40 text-blue-400"
                : "bg-slate-800 border-slate-700 text-slate-300"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${status === "CONNECTED" ? "bg-emerald-400 animate-ping" : "bg-current"}`} />
            <span>{status.replace(/_/g, " ")}</span>
          </div>

          {/* Subscribed Count */}
          <div className="px-3 py-1 rounded-lg bg-[#0E1624] border border-[#213047] text-slate-300">
            <span className="text-slate-400">INSTRUMENTS: </span>
            <span className="font-bold text-cyan-400">{dhanStatus?.subscribed_instruments ?? quoteList.length}</span>
          </div>

          {/* Ticks Count */}
          <div className="px-3 py-1 rounded-lg bg-[#0E1624] border border-[#213047] text-slate-300">
            <span className="text-slate-400">TICKS: </span>
            <span className="font-bold text-white">{dhanStatus?.ticks_received ?? 0}</span>
          </div>

          {/* Manual Refresh */}
          <button
            type="button"
            onClick={() => refetchStatus()}
            className="p-1.5 rounded-lg bg-[#0E1624] border border-[#213047] hover:border-cyan-400 text-slate-400 hover:text-cyan-300 transition-colors"
            title="Refresh Feed Status"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Diagnostic Notice Banners ───────────────────────────────────────── */}
      {status === "AUTH_REQUIRED" && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-rose-400" />
          <div>
            <div className="font-bold">Dhan Authentication Required</div>
            <div className="text-xs text-rose-200/80 mt-1">
              {dhanStatus?.error_message ||
                "Dhan authentication required. Generate a fresh Dhan access token and update Settings → Brokers → Dhan."}
            </div>
          </div>
        </div>
      )}

      {status === "MARKET_CLOSED_OR_NO_TICK" && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 flex items-start gap-3 text-sm">
          <Clock className="h-5 w-5 shrink-0 mt-0.5 text-blue-400" />
          <div>
            <div className="font-bold">Indian Market Session Closed (09:15 – 15:30 IST)</div>
            <div className="text-xs text-blue-200/80 mt-1">
              NSE/BSE equities and indices are currently off-session. Binary struct decoder and WebSocket lifecycle are connected and ready for next session open.
            </div>
          </div>
        </div>
      )}

      {status === "STALE" && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <div className="font-bold">Stale Market Data Guard Active</div>
            <div className="text-xs text-amber-200/80 mt-1">
              Quotes exceed the 10-second freshness threshold. Stale quotes are prevented from triggering automated paper signals.
            </div>
          </div>
        </div>
      )}

      {/* ─── Selected Instrument Hero Card ──────────────────────────────────── */}
      {activeQuote ? (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0B132B] to-[#080E20] border border-cyan-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-wrap items-start justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-black text-white tracking-wider">{activeQuote.symbol}</h2>
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                  {activeQuote.exchange_segment}
                </span>
                <span className="text-xs font-mono text-slate-400">SEC ID: {activeQuote.security_id}</span>
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1">
                Account: {activeQuote.account} • Source: <span className="text-cyan-400 font-semibold">Dhan HQ Feed</span>
              </div>
            </div>

            {/* Price Display */}
            <div className="text-right">
              <div
                className={`text-4xl font-mono font-black transition-colors duration-300 ${
                  priceFlash[activeQuote.symbol] === "up"
                    ? "text-emerald-400"
                    : priceFlash[activeQuote.symbol] === "down"
                    ? "text-rose-400"
                    : "text-white"
                }`}
              >
                ₹{activeQuote.last_price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1 flex items-center justify-end gap-2">
                <span>EVENT TIME: {activeQuote.event_time ? new Date(activeQuote.event_time).toLocaleTimeString() : "—"}</span>
                {activeQuote.freshness_ms !== undefined && (
                  <span className="text-cyan-400 font-bold">• {activeQuote.freshness_ms}ms old</span>
                )}
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-800/80 font-mono text-xs">
            <div className="p-3 rounded-xl bg-[#0E1624]/60 border border-[#213047]">
              <div className="text-[10px] text-slate-400 uppercase">Best Bid</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">
                ₹{activeQuote.bid_price ? activeQuote.bid_price.toFixed(2) : activeQuote.last_price.toFixed(2)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0E1624]/60 border border-[#213047]">
              <div className="text-[10px] text-slate-400 uppercase">Best Ask</div>
              <div className="text-sm font-bold text-rose-400 mt-0.5">
                ₹{activeQuote.ask_price ? activeQuote.ask_price.toFixed(2) : activeQuote.last_price.toFixed(2)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0E1624]/60 border border-[#213047]">
              <div className="text-[10px] text-slate-400 uppercase">Day High</div>
              <div className="text-sm font-bold text-slate-200 mt-0.5">
                {activeQuote.high ? `₹${activeQuote.high.toFixed(2)}` : "—"}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0E1624]/60 border border-[#213047]">
              <div className="text-[10px] text-slate-400 uppercase">Day Low</div>
              <div className="text-sm font-bold text-slate-200 mt-0.5">
                {activeQuote.low ? `₹${activeQuote.low.toFixed(2)}` : "—"}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0E1624]/60 border border-[#213047]">
              <div className="text-[10px] text-slate-400 uppercase">Volume</div>
              <div className="text-sm font-bold text-slate-200 mt-0.5">
                {activeQuote.volume ? formatVolume(activeQuote.volume) : "—"}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0E1624]/60 border border-[#213047]">
              <div className="text-[10px] text-slate-400 uppercase">Open Interest</div>
              <div className="text-sm font-bold text-cyan-400 mt-0.5">
                {activeQuote.open_interest ? formatVolume(activeQuote.open_interest) : "—"}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-[#0B132B]/80 border border-slate-800 text-center font-mono text-xs text-slate-400">
          <Activity className="h-8 w-8 mx-auto text-cyan-400 opacity-60 mb-2 animate-pulse" />
          <div className="font-bold text-slate-300">Awaiting Dhan Live Market Ticks</div>
          <div className="text-slate-400 mt-1 max-w-md mx-auto">
            {status === "AUTH_REQUIRED"
              ? "Dhan authentication required. Generate a fresh token in Settings -> Brokers -> Dhan."
              : "Connecting to server-side DhanFeedManager pipeline. Real-time ticks will appear when received from exchange."}
          </div>
        </div>
      )}

      {/* ─── Real-Time Quotes Table ─────────────────────────────────────────── */}
      <div className="bg-[#0B132B]/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-cyan-400">REGISTERED DHAN LIVE INSTRUMENTS</span>
            <span className="text-xs font-mono text-slate-400">({quoteList.length} Active)</span>
          </div>
          <div className="text-xs font-mono text-slate-400">
            Cache Key: <code className="text-cyan-300">(provider, account, exchange_segment, security_id)</code>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead className="bg-[#080E20] border-b border-slate-800 text-[11px] text-slate-400 uppercase font-bold">
              <tr>
                <th className="py-2.5 px-4">Symbol / Name</th>
                <th className="py-2.5 px-3">Segment</th>
                <th className="py-2.5 px-3">Security ID</th>
                <th className="py-2.5 px-3 text-right">LTP</th>
                <th className="py-2.5 px-3 text-right">Best Bid</th>
                <th className="py-2.5 px-3 text-right">Best Ask</th>
                <th className="py-2.5 px-3 text-right">Volume</th>
                <th className="py-2.5 px-3 text-right">Open Interest</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Last Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {quoteList.length > 0 ? (
                quoteList.map((q) => {
                  const isSelected = selectedSymbol === q.symbol;
                  return (
                    <tr
                      key={`${q.exchange_segment}_${q.security_id}`}
                      onClick={() => setSelectedSymbol(q.symbol)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? "bg-cyan-500/10 text-cyan-200" : "hover:bg-slate-800/40 text-slate-300"
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <span>{q.symbol}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                          DHAN
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{q.exchange_segment}</td>
                      <td className="py-3 px-3 text-slate-400">{q.security_id}</td>
                      <td
                        className={`py-3 px-3 text-right font-bold ${
                          priceFlash[q.symbol] === "up"
                            ? "text-emerald-400"
                            : priceFlash[q.symbol] === "down"
                            ? "text-rose-400"
                            : "text-white"
                        }`}
                      >
                        ₹{q.last_price.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-400">
                        ₹{q.bid_price ? q.bid_price.toFixed(2) : q.last_price.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-400">
                        ₹{q.ask_price ? q.ask_price.toFixed(2) : q.last_price.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-cyan-400">
                        {q.open_interest ? formatVolume(q.open_interest) : "—"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            q.last_price > 0 && (!q.freshness_ms || q.freshness_ms < 10000)
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          }`}
                        >
                          {q.last_price > 0 && (!q.freshness_ms || q.freshness_ms < 10000) ? "LIVE" : "STALE"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 text-[10px]">
                        {q.event_time ? new Date(q.event_time).toLocaleTimeString() : "—"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400 font-mono text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="font-bold text-rose-400 text-sm tracking-wider">NO_LIVE_TICK_RECEIVED</span>
                      <span className="text-slate-400 text-xs max-w-md">
                        {status === "AUTH_REQUIRED"
                          ? "Dhan authentication required (DH-901 / 808). Please update your Dhan access token in Settings → Brokers."
                          : status === "MARKET_CLOSED_OR_NO_TICK"
                          ? "Indian equity/derivatives session is closed (09:15–15:30 IST). Awaiting exchange session open."
                          : "Connecting to server-side DhanFeedManager pipeline. Real-time ticks will appear when received from exchange."}
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
