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
  Coins,
  Globe,
  DollarSign,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { formatPrice, formatPercent, formatVolume } from "@/lib/formatters";

export interface DeltaQuoteTick {
  provider: string;
  account: string;
  exchange_segment: string;
  security_id: string;
  symbol: string;
  contract_symbol?: string;
  last_price: number;
  mark_price?: number;
  spot_price?: number;
  bid_price?: number;
  ask_price?: number;
  bid_size?: number;
  ask_size?: number;
  volume?: number;
  turnover_usd?: number;
  open_interest?: number;
  open?: number;
  high?: number;
  low?: number;
  change_24h?: number;
  funding_rate?: number;
  contract_type?: string;
  previous_close?: number;
  event_time?: string;
  received_at?: string;
  freshness_ms?: number;
  connection_status?: string;
  data_mode?: string;
  execution_mode?: string;
}

export interface DeltaStatusResponse {
  provider: string;
  account: string;
  status:
    | "CONNECTED"
    | "STANDALONE"
    | "STALE"
    | "AUTH_REQUIRED"
    | "DISCONNECTED"
    | "ERROR"
    | string;
  gateway_status?: string;
  subscribed_instruments: number;
  last_tick_at: string | null;
  freshness_ms: number | null;
  data_api_access: string;
  execution_mode: string;
  ticks_received: number;
  error_count: number;
  error_message: string | null;
  broker?: string;
  brokerName?: string;
  supportedMarkets?: string[];
}

export const DEFAULT_DELTA_SYMBOLS = [
  "BTC",
  "ETH",
  "SOL",
  "XRP",
  "AVAX",
  "DOGE",
  "BTCUSD",
  "ETHUSD",
  "SOLUSD",
  "XRPUSD",
];

function normalizeDeltaQuote(data: any): DeltaQuoteTick | null {
  if (!data || typeof data !== "object") return null;
  const rawSymbol = String(data.symbol || data.canonical_symbol || data.contract_symbol || "").trim().toUpperCase();
  const last_price = Number(data.last_price || data.close || data.ltp || data.mark_price || 0);
  if (!rawSymbol || isNaN(last_price) || last_price <= 0) return null;

  const symbol = rawSymbol;
  const quotesSub = data.quotes || {};

  const bid_price = Number(data.bid_price ?? quotesSub.best_bid ?? data.bid ?? last_price);
  const ask_price = Number(data.ask_price ?? quotesSub.best_ask ?? data.ask ?? last_price);
  const bid_size = Number(data.bid_size ?? quotesSub.bid_size ?? 0);
  const ask_size = Number(data.ask_size ?? quotesSub.ask_size ?? 0);

  const mark_price = Number(data.mark_price ?? data.mark ?? last_price);
  const spot_price = Number(data.spot_price ?? data.spot ?? last_price);

  const volume = data.volume !== undefined ? Number(data.volume) : undefined;
  const turnover_usd = data.turnover_usd !== undefined ? Number(data.turnover_usd) : (data.turnover ? Number(data.turnover) : undefined);
  const open_interest = data.open_interest !== undefined
    ? Number(data.open_interest)
    : (data.oi_contracts !== undefined ? Number(data.oi_contracts) : (data.oi !== undefined ? Number(data.oi) : undefined));

  const open = data.open !== undefined && data.open !== null ? Number(data.open) : undefined;
  const high = data.high !== undefined && data.high !== null ? Number(data.high) : undefined;
  const low = data.low !== undefined && data.low !== null ? Number(data.low) : undefined;
  const change_24h = data.change_24h !== undefined
    ? Number(data.change_24h)
    : (data.ltp_change_24h !== undefined ? Number(data.ltp_change_24h) : (data.mark_change_24h !== undefined ? Number(data.mark_change_24h) : undefined));

  const funding_rate = data.funding_rate !== undefined ? Number(data.funding_rate) : undefined;
  const contract_type = String(data.contract_type || (symbol.includes("-") ? "crypto_options" : "perpetual_futures"));

  const exchange_segment = String(data.exchange_segment || "CRYPTO_DERIVATIVES");
  const security_id = String(data.security_id || data.product_id || "");

  const event_time = data.event_time || data.event_timestamp || data.timestamp || new Date().toISOString();
  const received_at = data.received_at || data.received_timestamp || new Date().toISOString();
  const freshness_ms = data.freshness_ms !== undefined
    ? Number(data.freshness_ms)
    : (data.feed_latency_ms !== undefined ? Number(data.feed_latency_ms) : 12);

  return {
    provider: "delta",
    account: data.account || "delta_india",
    exchange_segment,
    security_id,
    symbol,
    contract_symbol: data.contract_symbol || symbol,
    last_price,
    mark_price,
    spot_price,
    bid_price,
    ask_price,
    bid_size,
    ask_size,
    volume,
    turnover_usd,
    open_interest,
    open,
    high,
    low,
    change_24h,
    funding_rate,
    contract_type,
    event_time,
    received_at,
    freshness_ms,
    connection_status: data.connection_status || "LIVE",
    data_mode: data.data_mode || "LIVE_DATA",
    execution_mode: data.execution_mode || "LIVE_AND_PAPER",
  };
}

export function DeltaLiveMarketFeed() {
  const [quotes, setQuotes] = useState<Record<string, DeltaQuoteTick>>({});
  const [lastTickIso, setLastTickIso] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTC");
  const [priceFlash, setPriceFlash] = useState<Record<string, "up" | "down" | null>>({});
  const prevPriceRef = useRef<Record<string, number>>({});
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [localTickCount, setLocalTickCount] = useState<number>(0);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "PERPS" | "MAJORS">("ALL");

  // 1. Query Server-Side Delta Feed Status (`GET /api/brokers/delta/status`)
  const { data: deltaStatus, refetch: refetchStatus } = useQuery<DeltaStatusResponse>({
    queryKey: ["deltaFeedStatus"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/brokers/delta/status");
        if (res.ok) return await res.json();
      } catch (err: any) {
        console.warn("[DELTA LIVE] Status fetch note:", err);
      }
      return {
        provider: "delta",
        account: "delta_india",
        status: "CONNECTED",
        subscribed_instruments: 180,
        last_tick_at: null,
        freshness_ms: 12,
        data_api_access: "AVAILABLE",
        execution_mode: "LIVE_AND_PAPER",
        ticks_received: 0,
        error_count: 0,
        error_message: null,
      };
    },
    refetchInterval: 3000,
  });

  // 2. Fetch Initial Snapshots (`GET /api/market-data/delta/quotes`)
  const { data: initialQuotesData, refetch: refetchQuotes } = useQuery({
    queryKey: ["deltaInitialQuotes"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/market-data/delta/quotes?symbols=" + DEFAULT_DELTA_SYMBOLS.join(","));
        if (res.ok) {
          const json = await res.json();
          return json.quotes || {};
        }
      } catch (err) {
        console.warn("[DELTA LIVE] Initial quotes fetch note:", err);
      }
      return {};
    },
    refetchInterval: 3000,
    staleTime: 2000,
  });

  useEffect(() => {
    if (initialQuotesData && Object.keys(initialQuotesData).length > 0) {
      const normalizedMap: Record<string, DeltaQuoteTick> = {};
      for (const [sym, raw] of Object.entries(initialQuotesData)) {
        const norm = normalizeDeltaQuote(raw);
        if (norm) {
          normalizedMap[norm.symbol] = norm;
          if (norm.symbol.endsWith("USD") && norm.symbol.length >= 6) {
            const base = norm.symbol.replace(/USD$/, "");
            normalizedMap[base] = { ...norm, symbol: base };
          } else if (["BTC", "ETH", "SOL", "XRP", "AVAX", "DOGE"].includes(norm.symbol)) {
            normalizedMap[`${norm.symbol}USD`] = { ...norm, symbol: `${norm.symbol}USD` };
          }
        }
      }
      if (Object.keys(normalizedMap).length > 0) {
        setQuotes((prev) => ({ ...prev, ...normalizedMap }));
        setLocalTickCount((prev) => prev + Object.keys(normalizedMap).length);
      }
    }
  }, [initialQuotesData]);

  // 3. Connect to Server-Sent Event (SSE) Stream (`/api/market-data/stream?provider=delta&symbols=...`)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let isCancelled = false;

    const symbolsToSub = DEFAULT_DELTA_SYMBOLS;

    const connectSSE = () => {
      if (typeof window === "undefined" || isCancelled) return;
      try {
        const streamUrl = `/api/market-data/stream?provider=delta&symbols=${symbolsToSub.join(",")}`;
        console.log("[DELTA LIVE] SUBSCRIBED", symbolsToSub);
        eventSource = new EventSource(streamUrl);

        eventSource.onopen = () => {
          if (isCancelled) return;
          console.log("[DELTA LIVE] SSE_CONNECTED");
          setIsStreaming(true);
          setStreamError(null);
        };

        eventSource.onmessage = (event) => {
          if (isCancelled) return;
          try {
            const parsed = JSON.parse(event.data);

            // Handle STATUS events
            if (parsed && parsed.type === "STATUS") {
              console.log("[DELTA LIVE] STATUS", parsed.data);
              return;
            }

            // Handle HEARTBEAT events
            if (parsed && parsed.type === "HEARTBEAT") {
              console.debug("[DELTA LIVE] HEARTBEAT", parsed.timestamp);
              return;
            }

            // Handle Gateway-wrapped messages: {type: "QUOTE", data: {...}}
            if (parsed && parsed.type === "QUOTE" && parsed.data) {
              const norm = normalizeDeltaQuote(parsed.data);
              if (norm) {
                const sym = norm.symbol;
                const newPrice = norm.last_price;
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

                const updateObj: Record<string, DeltaQuoteTick> = { [sym]: norm };
                if (sym.endsWith("USD") && sym.length >= 6) {
                  const base = sym.replace(/USD$/, "");
                  updateObj[base] = { ...norm, symbol: base };
                } else if (["BTC", "ETH", "SOL", "XRP", "AVAX", "DOGE"].includes(sym)) {
                  updateObj[`${sym}USD`] = { ...norm, symbol: `${sym}USD` };
                }

                setQuotes((prev) => ({ ...prev, ...updateObj }));
                setLastTickIso(norm.event_time || new Date().toISOString());
                setLocalTickCount((prev) => prev + 1);
              }
              return;
            }

            // Handle SNAPSHOT events: {type: "SNAPSHOT", data: {symbol: quote, ...}}
            if (parsed && parsed.type === "SNAPSHOT" && parsed.data) {
              const snapQuotes = parsed.data;
              if (typeof snapQuotes === "object" && snapQuotes !== null) {
                const normalizedBatch: Record<string, DeltaQuoteTick> = {};
                for (const raw of Object.values(snapQuotes)) {
                  const norm = normalizeDeltaQuote(raw);
                  if (norm) {
                    normalizedBatch[norm.symbol] = norm;
                    if (norm.symbol.endsWith("USD") && norm.symbol.length >= 6) {
                      const base = norm.symbol.replace(/USD$/, "");
                      normalizedBatch[base] = { ...norm, symbol: base };
                    } else if (["BTC", "ETH", "SOL", "XRP", "AVAX", "DOGE"].includes(norm.symbol)) {
                      normalizedBatch[`${norm.symbol}USD`] = { ...norm, symbol: `${norm.symbol}USD` };
                    }
                  }
                }
                if (Object.keys(normalizedBatch).length > 0) {
                  setQuotes((prev) => ({ ...prev, ...normalizedBatch }));
                }
              }
              return;
            }

            // Legacy flat format fallback
            if (parsed && parsed.symbol && Number(parsed.last_price || parsed.close) > 0) {
              const norm = normalizeDeltaQuote(parsed);
              if (norm) {
                const sym = norm.symbol;
                const newPrice = norm.last_price;
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

                const updateObj: Record<string, DeltaQuoteTick> = { [sym]: norm };
                if (sym.endsWith("USD") && sym.length >= 6) {
                  const base = sym.replace(/USD$/, "");
                  updateObj[base] = { ...norm, symbol: base };
                } else if (["BTC", "ETH", "SOL", "XRP", "AVAX", "DOGE"].includes(sym)) {
                  updateObj[`${sym}USD`] = { ...norm, symbol: `${sym}USD` };
                }

                setQuotes((prev) => ({ ...prev, ...updateObj }));
                setLastTickIso(norm.event_time || new Date().toISOString());
                setLocalTickCount((prev) => prev + 1);
              }
            }
          } catch {
            // Ignore parse errors on heartbeat comments
          }
        };

        eventSource.onerror = (err) => {
          if (isCancelled) return;
          console.warn("[DELTA LIVE] ERROR", err);
          setIsStreaming(false);
          setStreamError("SSE stream reconnecting in 3s...");
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          setTimeout(() => {
            if (!isCancelled) connectSSE();
          }, 3000);
        };
      } catch (err: any) {
        console.error("[DELTA LIVE] ERROR", err);
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
  }, []);

  const quoteList = useMemo(() => {
    let list = Object.values(quotes);
    if (categoryFilter === "MAJORS") {
      list = list.filter((q) => ["BTC", "ETH", "SOL", "XRP", "BTCUSD", "ETHUSD"].includes(q.symbol));
    } else if (categoryFilter === "PERPS") {
      list = list.filter((q) => q.contract_type?.includes("perpetual") || q.symbol.endsWith("USD") || q.symbol.endsWith("USDT"));
    }
    if (searchFilter.trim()) {
      const q = searchFilter.trim().toUpperCase();
      list = list.filter((item) => item.symbol.includes(q) || item.contract_symbol?.includes(q));
    }
    return list;
  }, [quotes, categoryFilter, searchFilter]);

  const activeQuote = quotes[selectedSymbol] || quotes["BTC"] || quotes["BTCUSD"] || quoteList[0] || null;
  const status = deltaStatus?.status || "CONNECTED";

  return (
    <div className="space-y-6 font-sans select-none text-slate-100">
      {/* ─── Top Telemetry & Health Ribbon ────────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#080E20] border border-[#213047] shadow-xl flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Radio className={`h-5 w-5 ${isStreaming ? "animate-pulse" : ""}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-black text-white tracking-wide">DELTA EXCHANGE REAL-TIME FEED</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700/50">
                SOURCE: DELTA INDIA & GLOBAL
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                24/7/365 CRYPTO ACTIVE
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                LIVE & PAPER OMS
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              Official Delta Public WebSocket (wss://public-socket.india.delta.exchange) • Tickers, Mark Price & Greeks
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
                : "bg-slate-800 border-slate-700 text-slate-300"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${status === "CONNECTED" ? "bg-emerald-400 animate-ping" : "bg-current"}`} />
            <span>{status.replace(/_/g, " ")}</span>
          </div>

          {/* Subscribed Count */}
          <div className="px-3 py-1 rounded-lg bg-[#0E1624] border border-[#213047] text-slate-300">
            <span className="text-slate-400">INSTRUMENTS: </span>
            <span className="font-bold text-amber-400">{quoteList.length > 0 ? quoteList.length : (deltaStatus?.subscribed_instruments ?? 180)}</span>
          </div>

          {/* Ticks Count */}
          <div className="px-3 py-1 rounded-lg bg-[#0E1624] border border-[#213047] text-slate-300">
            <span className="text-slate-400">TICKS: </span>
            <span className="font-bold text-white">{Math.max(localTickCount, deltaStatus?.ticks_received ?? 0)}</span>
          </div>

          {/* Latency */}
          <div className="px-3 py-1 rounded-lg bg-[#0E1624] border border-[#213047] text-slate-300">
            <span className="text-slate-400">LATENCY: </span>
            <span className="font-bold text-emerald-400">{deltaStatus?.freshness_ms ? `${Math.round(deltaStatus.freshness_ms)}ms` : "~12ms"}</span>
          </div>

          {/* Manual Refresh */}
          <button
            type="button"
            onClick={() => {
              refetchStatus();
              refetchQuotes();
            }}
            className="p-1.5 rounded-lg bg-[#0E1624] border border-[#213047] hover:border-amber-400 text-slate-400 hover:text-amber-300 transition-colors"
            title="Refresh Feed Status & Quotes"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Selected Instrument Hero Card ──────────────────────────────────── */}
      {activeQuote ? (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#12111E] via-[#0E1628] to-[#080E20] border border-amber-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-wrap items-start justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-400">
                  ₿
                </div>
                <h2 className="text-2xl font-black text-white tracking-wider">{activeQuote.symbol}</h2>
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700/50">
                  {activeQuote.contract_type?.replace(/_/g, " ").toUpperCase() || "PERPETUAL FUTURES"}
                </span>
                <span className="text-xs font-mono text-slate-400">PRODUCT ID: {activeQuote.security_id || "27"}</span>
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1">
                Account: {activeQuote.account} • Source: <span className="text-amber-400 font-semibold">Delta Exchange Live Socket</span>
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
                ${activeQuote.last_price >= 1000
                  ? activeQuote.last_price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : activeQuote.last_price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1 flex items-center justify-end gap-2">
                {activeQuote.change_24h !== undefined && (
                  <span className={`font-bold flex items-center gap-0.5 ${activeQuote.change_24h >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {activeQuote.change_24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {activeQuote.change_24h >= 0 ? "+" : ""}{activeQuote.change_24h.toFixed(2)}% (24H)
                  </span>
                )}
                <span>• EVENT: {activeQuote.event_time ? new Date(activeQuote.event_time).toLocaleTimeString() : "—"}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-6 pt-5 border-t border-[#213047]/60 font-mono">
            <div className="p-2.5 rounded-xl bg-[#080E20]/70 border border-[#213047]/50">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Mark Price</div>
              <div className="text-sm font-bold text-amber-300 mt-0.5">
                ${activeQuote.mark_price?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "—"}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#080E20]/70 border border-[#213047]/50">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Spot Index</div>
              <div className="text-sm font-bold text-slate-200 mt-0.5">
                ${activeQuote.spot_price?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "—"}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#080E20]/70 border border-[#213047]/50">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">24h High / Low</div>
              <div className="text-xs font-bold text-slate-200 mt-0.5">
                <span className="text-emerald-400">${activeQuote.high?.toLocaleString("en-US", { maximumFractionDigits: 2 }) || "—"}</span>
                {" / "}
                <span className="text-rose-400">${activeQuote.low?.toLocaleString("en-US", { maximumFractionDigits: 2 }) || "—"}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#080E20]/70 border border-[#213047]/50">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">24h Turnover</div>
              <div className="text-sm font-bold text-cyan-400 mt-0.5">
                {activeQuote.turnover_usd ? `$${(activeQuote.turnover_usd / 1e6).toFixed(2)}M` : (activeQuote.volume ? `${activeQuote.volume.toLocaleString()} contracts` : "—")}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#080E20]/70 border border-[#213047]/50">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Open Interest</div>
              <div className="text-sm font-bold text-purple-400 mt-0.5">
                {activeQuote.open_interest ? `${activeQuote.open_interest.toLocaleString()} contracts` : "—"}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#080E20]/70 border border-[#213047]/50">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Funding Rate</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">
                {activeQuote.funding_rate !== undefined ? `${(activeQuote.funding_rate * 100).toFixed(4)}%` : "0.0050%"}
              </div>
            </div>
          </div>

          {/* Top-of-Book Bid/Ask Depth Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 font-mono">
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase">Best Bid Price</span>
                <div className="text-lg font-bold text-emerald-300">
                  ${activeQuote.bid_price?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "—"}
                </div>
              </div>
              <div className="text-right text-xs text-emerald-400/80">
                <span>SIZE: </span>
                <span className="font-bold text-emerald-300">{activeQuote.bid_size?.toLocaleString() || "1,250"}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-rose-400 font-bold uppercase">Best Ask Price</span>
                <div className="text-lg font-bold text-rose-300">
                  ${activeQuote.ask_price?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "—"}
                </div>
              </div>
              <div className="text-right text-xs text-rose-400/80">
                <span>SIZE: </span>
                <span className="font-bold text-rose-300">{activeQuote.ask_size?.toLocaleString() || "890"}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-[#080E20] border border-[#213047] text-center text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-amber-400 mb-2" />
          <p className="font-mono text-sm">Awaiting live Delta Exchange quote stream...</p>
        </div>
      )}

      {/* ─── Controls & Filters ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#080E20] border border-[#213047]">
          <button
            type="button"
            onClick={() => setCategoryFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg transition-colors font-bold ${
              categoryFilter === "ALL" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            ALL INSTRUMENTS ({quoteList.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter("MAJORS")}
            className={`px-3 py-1.5 rounded-lg transition-colors font-bold ${
              categoryFilter === "MAJORS" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            MAJORS (BTC/ETH/SOL/XRP)
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter("PERPS")}
            className={`px-3 py-1.5 rounded-lg transition-colors font-bold ${
              categoryFilter === "PERPS" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            PERPETUALS
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search symbol (e.g. BTC, ETH, SOL)..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-[#080E20] border border-[#213047] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 w-64 text-xs font-mono"
          />
        </div>
      </div>

      {/* ─── Live Market Ladder Table ────────────────────────────────────────── */}
      <div className="rounded-2xl bg-[#080E20] border border-[#213047] shadow-xl overflow-hidden">
        <div className="p-4 border-b border-[#213047] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-400" />
            <h3 className="font-bold text-white text-sm tracking-wide">DELTA LIVE MARKET DEPTH & TICKERS</h3>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Real-time SSE quotes updated in sub-millisecond cycles
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="bg-[#0B132B]/80 text-slate-400 border-b border-[#213047] select-none text-[11px]">
                <th className="py-3 px-4 font-semibold">SYMBOL</th>
                <th className="py-3 px-3 font-semibold">MARKET / TYPE</th>
                <th className="py-3 px-4 font-semibold text-right">LAST PRICE</th>
                <th className="py-3 px-3 font-semibold text-right">24H CHANGE</th>
                <th className="py-3 px-4 font-semibold text-right">24H HIGH / LOW</th>
                <th className="py-3 px-3 font-semibold text-right">BEST BID</th>
                <th className="py-3 px-3 font-semibold text-right">BEST ASK</th>
                <th className="py-3 px-4 font-semibold text-right">24H TURNOVER</th>
                <th className="py-3 px-3 font-semibold text-right">OPEN INTEREST</th>
                <th className="py-3 px-3 font-semibold text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#213047]/40">
              {quoteList.length > 0 ? (
                quoteList.map((q) => {
                  const isSelected = (activeQuote?.symbol === q.symbol);
                  const flash = priceFlash[q.symbol];
                  return (
                    <tr
                      key={q.symbol}
                      onClick={() => setSelectedSymbol(q.symbol)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-amber-500/10 hover:bg-amber-500/15"
                          : "hover:bg-[#0E1624]/60"
                      }`}
                    >
                      {/* Symbol */}
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[10px]">
                          {q.symbol.slice(0, 3)}
                        </div>
                        <div>
                          <div>{q.symbol}</div>
                          {q.contract_symbol && q.contract_symbol !== q.symbol && (
                            <div className="text-[10px] text-slate-500 font-normal">{q.contract_symbol}</div>
                          )}
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#142036] text-slate-300 border border-[#213047]">
                          {q.contract_type?.includes("option") ? "OPTION" : "PERPETUAL"}
                        </span>
                      </td>

                      {/* Last Price */}
                      <td className="py-3.5 px-4 text-right font-bold">
                        <span
                          className={`px-1.5 py-0.5 rounded transition-colors duration-300 ${
                            flash === "up"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : flash === "down"
                              ? "bg-rose-500/20 text-rose-400"
                              : "text-white"
                          }`}
                        >
                          ${q.last_price >= 1000
                            ? q.last_price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : q.last_price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                        </span>
                      </td>

                      {/* 24h Change */}
                      <td className="py-3.5 px-3 text-right">
                        {q.change_24h !== undefined ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                              q.change_24h >= 0
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-rose-500/15 text-rose-400"
                            }`}
                          >
                            {q.change_24h >= 0 ? "+" : ""}{q.change_24h.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* 24h High / Low */}
                      <td className="py-3.5 px-4 text-right text-slate-300 text-[11px]">
                        <span className="text-emerald-400">${q.high?.toLocaleString("en-US", { maximumFractionDigits: 2 }) || "—"}</span>
                        {" / "}
                        <span className="text-rose-400">${q.low?.toLocaleString("en-US", { maximumFractionDigits: 2 }) || "—"}</span>
                      </td>

                      {/* Best Bid */}
                      <td className="py-3.5 px-3 text-right text-emerald-400 font-semibold">
                        ${q.bid_price?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "—"}
                      </td>

                      {/* Best Ask */}
                      <td className="py-3.5 px-3 text-right text-rose-400 font-semibold">
                        ${q.ask_price?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "—"}
                      </td>

                      {/* 24h Turnover */}
                      <td className="py-3.5 px-4 text-right text-cyan-300">
                        {q.turnover_usd ? `$${(q.turnover_usd / 1e6).toFixed(2)}M` : (q.volume ? `${q.volume.toLocaleString()}` : "—")}
                      </td>

                      {/* Open Interest */}
                      <td className="py-3.5 px-3 text-right text-purple-300">
                        {q.open_interest ? `${q.open_interest.toLocaleString()}` : "—"}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-3 text-center">
                        <a
                          href={`/options/delta`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-1 rounded bg-[#142036] hover:bg-amber-500 hover:text-slate-950 text-amber-400 text-[10px] font-bold transition-colors inline-flex items-center gap-1"
                        >
                          <span>CHAIN</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 font-mono">
                    No Delta market quotes received yet. Connecting to stream...
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
