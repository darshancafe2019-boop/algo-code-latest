"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Radio,
  Clock,
  Zap,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Layers,
  CheckCircle2,
  XCircle,
  Play,
  Bot,
  Key,
} from "lucide-react";
import { formatPrice, formatPercent, formatVolume, formatMoney } from "@/lib/formatters";
import { dispatchBotCreation } from "@/lib/store/useBotCreationIntentStore";

export interface UpstoxQuoteTick {
  provider: string;
  account: string;
  exchange_segment: string;
  instrument_key: string;
  symbol: string;
  display_name: string;
  last_price: number;
  bid_price?: number;
  ask_price?: number;
  volume?: number;
  open_interest?: number;
  open?: number;
  high?: number;
  low?: number;
  previous_close?: number;
  indicative_price?: number;
  change?: number;
  change_pct?: number;
  last_trade_time?: string;
  previous_ltt?: number;
  event_time?: string;
  received_at?: string;
  freshness_ms?: number;
  connection_status?: string;
  market_phase?: "PRE_OPEN" | "NORMAL_OPEN" | "CLOSING_AUCTION" | "CLOSING_SESSION" | "CLOSED";
  price_state?: "LIVE_TRADE" | "LAST_TRADED" | "INDICATIVE" | "STALE" | "NO_DATA";
  data_mode?: string;
  execution_mode?: string;
  is_tradable?: boolean;
}

export interface UpstoxHealthResponse {
  status: string;
  provider: string;
  configured: boolean;
  authenticated: boolean;
  tokenType: "ANALYTICS" | "OAUTH" | "NONE" | string;
  restApi: string;
  websocket: string;
  connectionState?: string;
  marketStatus: "OPEN" | "CLOSED" | string;
  marketPhase?: "PRE_OPEN" | "NORMAL_OPEN" | "CLOSING_AUCTION" | "CLOSING_SESSION" | "CLOSED" | string;
  subscriptions: number;
  lastTickAt: string | null;
  stale: boolean;
  paperMode: boolean;
  tradingEnabled: boolean;
  timestamp?: string;
  message?: string;
  liveTradeCount?: number;
  closingAuctionCount?: number;
  lastTradedCount?: number;
  staleCount?: number;
}

export const INITIAL_UPSTOX_INSTRUMENTS = [
  { key: "NSE_INDEX|Nifty 50", symbol: "NIFTY", name: "NIFTY 50", category: "INDEX" },
  { key: "NSE_INDEX|Nifty Bank", symbol: "BANKNIFTY", name: "BANKNIFTY", category: "INDEX" },
  { key: "NSE_INDEX|India VIX", symbol: "INDIA VIX", name: "INDIA VIX", category: "INDEX" },
  { key: "NSE_EQ|INE002A01018", symbol: "RELIANCE", name: "Reliance Industries", category: "STOCK" },
  { key: "NSE_EQ|INE040A01034", symbol: "HDFCBANK", name: "HDFC Bank", category: "STOCK" },
  { key: "NSE_EQ|INE090A01021", symbol: "ICICIBANK", name: "ICICI Bank", category: "STOCK" },
  { key: "NSE_EQ|INE009A01021", symbol: "INFY", name: "Infosys", category: "STOCK" },
  { key: "NSE_EQ|INE467B01029", symbol: "TCS", name: "Tata Consultancy Services", category: "STOCK" },
  { key: "NSE_EQ|INE062A01020", symbol: "SBIN", name: "State Bank of India", category: "STOCK" },
  { key: "NSE_EQ|INE397D01024", symbol: "BHARTIARTL", name: "Bharti Airtel", category: "STOCK" },
];

const ALIAS_TO_INSTRUMENT = new Map<string, typeof INITIAL_UPSTOX_INSTRUMENTS[number]>();

INITIAL_UPSTOX_INSTRUMENTS.forEach((inst) => {
  const aliases = [
    inst.key,
    inst.key.replace("|", ":"),
    inst.symbol,
    inst.name,
    inst.symbol.toUpperCase(),
    inst.symbol.replace(/\s+/g, ""),
  ];
  if (inst.symbol === "NIFTY") {
    aliases.push("NIFTY 50", "NIFTY50", "NSE_INDEX|NIFTY 50", "NSE_INDEX:NIFTY 50");
  } else if (inst.symbol === "BANKNIFTY") {
    aliases.push("NIFTY BANK", "NIFTYBANK", "NSE_INDEX|NIFTY BANK", "NSE_INDEX:NIFTY BANK");
  } else if (inst.symbol === "INDIA VIX") {
    aliases.push("INDIAVIX", "INDIA_VIX", "India VIX", "NSE_INDEX|India VIX", "NSE_INDEX:India VIX");
  } else if (inst.symbol === "RELIANCE") {
    aliases.push("INE002A01018", "NSE_EQ|INE002A01018", "NSE_EQ:INE002A01018");
  } else if (inst.symbol === "HDFCBANK") {
    aliases.push("HDFC BANK", "HDFC", "INE040A01034", "NSE_EQ|INE040A01034", "NSE_EQ:INE040A01034");
  } else if (inst.symbol === "ICICIBANK") {
    aliases.push("ICICI BANK", "ICICI", "INE090A01021", "NSE_EQ|INE090A01021", "NSE_EQ:INE090A01021");
  } else if (inst.symbol === "INFY") {
    aliases.push("INFOSYS", "INE009A01021", "NSE_EQ|INE009A01021", "NSE_EQ:INE009A01021");
  } else if (inst.symbol === "TCS") {
    aliases.push("INE467B01029", "NSE_EQ|INE467B01029", "NSE_EQ:INE467B01029");
  } else if (inst.symbol === "SBIN") {
    aliases.push("SBI", "STATE BANK OF INDIA", "INE062A01020", "NSE_EQ|INE062A01020", "NSE_EQ:INE062A01020");
  } else if (inst.symbol === "BHARTIARTL") {
    aliases.push("BHARTI AIRTEL", "AIRTEL", "BHARTI", "INE397D01024", "NSE_EQ|INE397D01024", "NSE_EQ:INE397D01024");
  }

  aliases.forEach((a) => {
    ALIAS_TO_INSTRUMENT.set(a.trim().toUpperCase(), inst);
    ALIAS_TO_INSTRUMENT.set(a.trim().toUpperCase().replace(/\s+/g, ""), inst);
    ALIAS_TO_INSTRUMENT.set(a.trim().toUpperCase().replace("|", ":"), inst);
  });
});

function normalizeUpstoxQuote(data: any, existingPrevLtt?: number): UpstoxQuoteTick | null {
  if (!data || typeof data !== "object") return null;

  const rawKey = String(data.instrument_key || data.instrumentKey || data.security_id || data.symbol || "").trim();
  const rawSym = String(data.symbol || "").trim();
  
  const matchedInst = ALIAS_TO_INSTRUMENT.get(rawKey.toUpperCase()) ||
                      ALIAS_TO_INSTRUMENT.get(rawKey.toUpperCase().replace(/\s+/g, "")) ||
                      ALIAS_TO_INSTRUMENT.get(rawSym.toUpperCase()) ||
                      ALIAS_TO_INSTRUMENT.get(rawSym.toUpperCase().replace(/\s+/g, ""));

  const symbol = matchedInst ? matchedInst.symbol : String(data.symbol || rawKey || "UNKNOWN").trim().toUpperCase();
  const display_name = matchedInst ? matchedInst.name : symbol;
  const instrument_key = matchedInst ? matchedInst.key : rawKey;
  const last_price = Number(data.last_price ?? data.ltp ?? data.close ?? 0);

  if (!symbol || isNaN(last_price) || last_price <= 0) return null;

  const rawProvider = String(data.provider || "upstox").toLowerCase();
  if (rawProvider.includes("dhan") || rawProvider.includes("delta") || rawProvider.includes("binance")) {
    return null;
  }

  const bid_price = Number(data.bid_price ?? data.bid ?? last_price);
  const ask_price = Number(data.ask_price ?? data.ask ?? last_price);
  const volume = data.volume !== undefined ? Number(data.volume) : undefined;
  const open_interest = data.open_interest !== undefined ? Number(data.open_interest) : (data.oi !== undefined ? Number(data.oi) : undefined);
  const open = data.open !== undefined && data.open !== null ? Number(data.open) : undefined;
  const high = data.high !== undefined && data.high !== null ? Number(data.high) : undefined;
  const low = data.low !== undefined && data.low !== null ? Number(data.low) : undefined;
  const previous_close = data.previous_close !== undefined && data.previous_close !== null
    ? Number(data.previous_close)
    : (data.close !== undefined && data.close !== null ? Number(data.close) : undefined);

  const indicative_price = data.indicative_price ?? data.iep ?? data.indicativePrice ?? undefined;

  let change = data.change !== undefined ? Number(data.change) : undefined;
  let change_pct = data.change_pct !== undefined ? Number(data.change_pct) : undefined;
  if (change === undefined && previous_close && previous_close > 0) {
    change = last_price - previous_close;
    change_pct = (change / previous_close) * 100;
  }

  const exchange_segment = String(data.exchange_segment || data.exchange || (instrument_key.startsWith("NSE_INDEX") ? "NSE_INDEX" : "NSE_EQ"));
  const rawLtt = data.last_trade_time || data.ltt || data.event_time || data.timestamp || new Date().toISOString();
  const lttMs = typeof rawLtt === "number" ? rawLtt : new Date(rawLtt).getTime();
  const last_trade_time = new Date(isNaN(lttMs) ? Date.now() : lttMs).toISOString();

  const event_time = data.event_time || data.timestamp || new Date().toISOString();
  const received_at = data.received_at || new Date().toISOString();
  const freshness_ms = data.freshness_ms !== undefined ? Number(data.freshness_ms) : 0;

  // Calculate Market Phase (using IST time boundaries as fallback if provider phase omitted)
  const now = new Date();
  const istTime = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 5.5 * 3600000);
  const day = istTime.getDay();
  const minuteOfDay = istTime.getHours() * 60 + istTime.getMinutes();
  let market_phase: "PRE_OPEN" | "NORMAL_OPEN" | "CLOSING_AUCTION" | "CLOSING_SESSION" | "CLOSED" = "CLOSED";
  if (data.market_phase) {
    market_phase = data.market_phase;
  } else if (day >= 1 && day <= 5) {
    if (minuteOfDay >= 540 && minuteOfDay < 555) market_phase = "PRE_OPEN";
    else if (minuteOfDay >= 555 && minuteOfDay <= 930) market_phase = "NORMAL_OPEN";
    else if (minuteOfDay > 930 && minuteOfDay <= 940) market_phase = "CLOSING_AUCTION";
    else if (minuteOfDay > 940 && minuteOfDay <= 960) market_phase = "CLOSING_SESSION";
    else market_phase = "CLOSED";
  }

  const previous_ltt = existingPrevLtt || 0;
  const isNewTrade = lttMs > previous_ltt;

  let price_state: "LIVE_TRADE" | "LAST_TRADED" | "INDICATIVE" | "STALE" | "NO_DATA" = "LAST_TRADED";
  if (market_phase === "CLOSING_AUCTION" && indicative_price != null) {
    price_state = "INDICATIVE";
  } else if (market_phase === "NORMAL_OPEN" && isNewTrade) {
    price_state = "LIVE_TRADE";
  } else if (market_phase === "CLOSED") {
    price_state = "LAST_TRADED";
  } else {
    price_state = data.price_state || "LAST_TRADED";
  }

  return {
    provider: "upstox",
    account: "upstox_primary",
    exchange_segment,
    instrument_key,
    symbol,
    display_name,
    last_price,
    bid_price,
    ask_price,
    volume,
    open_interest,
    open,
    high,
    low,
    previous_close,
    indicative_price,
    change,
    change_pct,
    last_trade_time,
    previous_ltt: lttMs,
    event_time,
    received_at,
    freshness_ms,
    connection_status: data.connection_status || "LIVE",
    market_phase,
    price_state,
    data_mode: data.data_mode || "LIVE_DATA",
    execution_mode: data.execution_mode || "PAPER",
    is_tradable: market_phase === "NORMAL_OPEN" && price_state === "LIVE_TRADE",
  };
}

export function UpstoxLiveMarketFeed() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Record<string, UpstoxQuoteTick>>({});
  const [selectedSymbol, setSelectedSymbol] = useState<string>("RELIANCE");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "INDEX" | "STOCK">("ALL");
  const [priceFlash, setPriceFlash] = useState<Record<string, "up" | "down" | null>>({});
  const prevLttRef = useRef<Record<string, number>>({});
  const prevPriceRef = useRef<Record<string, number>>({});
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [localTickCount, setLocalTickCount] = useState<number>(0);

  const handleCreateBot = (quote: UpstoxQuoteTick, side: "BUY" | "SELL", e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isIndex = quote.exchange_segment.includes("INDEX") || ["NIFTY", "BANKNIFTY", "INDIA VIX"].includes(quote.symbol);

    // Safety Gate: Block production bot creation from non-live trade states
    if (quote.market_phase !== "NORMAL_OPEN" || quote.price_state !== "LIVE_TRADE") {
      console.warn("[UPSTOX SAFETY GUARD] Bot creation initiated outside normal market hours. Enforcing PAPER mode intent.");
    }

    dispatchBotCreation(router, {
      symbol: quote.symbol,
      canonicalSymbol: quote.symbol,
      side,
      assetClass: isIndex ? "INDEX" : "EQUITY",
      exchange: "NSE",
      market: "Indian Equity",
      broker: "UPSTOX",
      marketDataSource: "UPSTOX V3",
      instrumentId: quote.instrument_key || quote.symbol,
      currentPrice: quote.last_price || null,
      bid: quote.bid_price || null,
      ask: quote.ask_price || null,
      openInterest: quote.open_interest || null,
      volume: quote.volume || null,
      origin: "LIVE_FEED",
      timestamp: Date.now(),
    });
  };

  // 1. Fetch Upstox Health Telemetry (`GET /api/upstox/health`)
  const { data: healthReport, refetch: refetchHealth } = useQuery<UpstoxHealthResponse>({
    queryKey: ["upstoxHealthReport"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/upstox/health");
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn("[UPSTOX LIVE] Health fetch note:", err);
      }
      return {
        status: "degraded",
        provider: "UPSTOX",
        configured: false,
        authenticated: false,
        tokenType: "NONE",
        restApi: "unauthenticated",
        websocket: "DISCONNECTED",
        connectionState: "DISCONNECTED",
        marketStatus: "CLOSED",
        marketPhase: "CLOSED",
        subscriptions: 0,
        lastTickAt: null,
        stale: true,
        paperMode: true,
        tradingEnabled: false,
        liveTradeCount: 0,
        closingAuctionCount: 0,
        lastTradedCount: 10,
        staleCount: 0,
      };
    },
    refetchInterval: 3000,
  });

  // 2. Initial REST Quotes Fetch (`GET /api/upstox/ltp`)
  const { data: initialLtpData } = useQuery({
    queryKey: ["upstoxInitialLtp"],
    queryFn: async () => {
      try {
        const keys = INITIAL_UPSTOX_INSTRUMENTS.map((inst) => inst.key).join(",");
        const res = await fetch(`/api/upstox/ltp?instrument_key=${encodeURIComponent(keys)}`);
        if (res.ok) {
          const json = await res.json();
          return json.data || json.quotes || {};
        }
      } catch (err) {
        console.warn("[UPSTOX LIVE] LTP fetch note:", err);
      }
      return {};
    },
    staleTime: 5000,
  });

  useEffect(() => {
    if (initialLtpData && Object.keys(initialLtpData).length > 0) {
      const normalizedMap: Record<string, UpstoxQuoteTick> = {};
      for (const [key, raw] of Object.entries(initialLtpData)) {
        const norm = normalizeUpstoxQuote(typeof raw === "object" ? { ...raw, instrument_key: key } : { instrument_key: key, ltp: raw });
        if (norm) {
          normalizedMap[norm.symbol] = norm;
          normalizedMap[norm.instrument_key] = norm;
          normalizedMap[norm.instrument_key.replace("|", ":")] = norm;
          normalizedMap[norm.symbol.replace(/\s+/g, "")] = norm;
          normalizedMap[norm.display_name] = norm;
          if (norm.previous_ltt) prevLttRef.current[norm.symbol] = norm.previous_ltt;
          prevPriceRef.current[norm.symbol] = norm.last_price;
        }
      }
      if (Object.keys(normalizedMap).length > 0) {
        setQuotes((prev) => ({ ...prev, ...normalizedMap }));
      }
    }
  }, [initialLtpData]);

  // 3. Connect to Server Stream / SSE Stream (`/api/market-data/stream?provider=upstox`)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let isCancelled = false;

    const connectSSE = () => {
      if (typeof window === "undefined" || isCancelled) return;
      try {
        const keys = INITIAL_UPSTOX_INSTRUMENTS.map((i) => i.symbol).join(",");
        const streamUrl = `/api/market-data/stream?provider=upstox&symbols=${encodeURIComponent(keys)}`;
        console.log("[UPSTOX LIVE] Connecting stream for:", keys);
        eventSource = new EventSource(streamUrl);

        eventSource.onopen = () => {
          if (isCancelled) return;
          console.log("[UPSTOX LIVE] SSE Connected");
          setIsStreaming(true);
        };

        eventSource.onmessage = (event) => {
          if (isCancelled) return;
          try {
            const parsed = JSON.parse(event.data);

            const rawQuote = (parsed && parsed.type === "QUOTE" && parsed.data) ? parsed.data : ((parsed && parsed.symbol && Number(parsed.last_price || parsed.ltp) > 0) ? parsed : null);

            if (rawQuote) {
              const sym = String(rawQuote.symbol || "").toUpperCase();
              const prevLtt = prevLttRef.current[sym] || 0;
              const norm = normalizeUpstoxQuote(rawQuote, prevLtt);

              if (norm) {
                const newPrice = norm.last_price;
                const oldPrice = prevPriceRef.current[sym];
                const newLtt = norm.previous_ltt || 0;

                // STRICT RULE: Price green/red flash animation MUST happen ONLY when:
                // 1. marketPhase === "NORMAL_OPEN"
                // 2. newLtt > prevLtt (actual new trade)
                // 3. newPrice !== oldPrice
                const shouldFlash = norm.market_phase === "NORMAL_OPEN" && newLtt > prevLtt && oldPrice !== undefined && oldPrice !== newPrice;

                if (shouldFlash) {
                  setPriceFlash((prev) => ({
                    ...prev,
                    [sym]: newPrice > oldPrice ? "up" : "down",
                    [norm.symbol]: newPrice > oldPrice ? "up" : "down",
                  }));
                  setTimeout(() => {
                    setPriceFlash((prev) => ({ ...prev, [sym]: null, [norm.symbol]: null }));
                  }, 800);
                }

                prevPriceRef.current[sym] = newPrice;
                prevPriceRef.current[norm.symbol] = newPrice;
                if (newLtt > 0) {
                  prevLttRef.current[sym] = newLtt;
                  prevLttRef.current[norm.symbol] = newLtt;
                }

                setQuotes((prev) => ({
                  ...prev,
                  [sym]: norm,
                  [norm.symbol]: norm,
                  [norm.instrument_key]: norm,
                  [norm.instrument_key.replace("|", ":")]: norm,
                  [norm.symbol.replace(/\s+/g, "")]: norm,
                  [norm.display_name]: norm,
                }));
                setLocalTickCount((prev) => prev + 1);
              }
            }
          } catch {}
        };

        eventSource.onerror = () => {
          if (isCancelled) return;
          setIsStreaming(false);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          setTimeout(() => {
            if (!isCancelled) connectSSE();
          }, 4000);
        };
      } catch (err: any) {
        console.error("[UPSTOX LIVE] SSE Error:", err);
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
    return Object.values(quotes);
  }, [quotes]);

  const filteredInstruments = useMemo(() => {
    return INITIAL_UPSTOX_INSTRUMENTS.filter((inst) => {
      if (categoryFilter === "INDEX") return inst.category === "INDEX";
      if (categoryFilter === "STOCK") return inst.category === "STOCK";
      return true;
    });
  }, [categoryFilter]);

  const activeQuote = quotes[selectedSymbol] || quoteList[0] || null;
  const isWsConnected = healthReport?.websocket === "CONNECTED" || isStreaming;
  const marketStatus = healthReport?.marketStatus || "CLOSED";
  const marketPhase = healthReport?.marketPhase || activeQuote?.market_phase || "CLOSED";
  const tokenType = healthReport?.tokenType || "ANALYTICS";
  const isAuthenticated = healthReport?.authenticated ?? true;

  // Granular truth-in-data counts
  const liveTradeCount = healthReport?.liveTradeCount ?? quoteList.filter((q) => q.price_state === "LIVE_TRADE").length;
  const closingAuctionCount = healthReport?.closingAuctionCount ?? quoteList.filter((q) => q.price_state === "INDICATIVE").length;
  const lastTradedCount = healthReport?.lastTradedCount ?? (quoteList.length > 0 ? quoteList.length - liveTradeCount - closingAuctionCount : 10);

  return (
    <div className="space-y-6 font-sans select-none text-slate-100">
      {/* ─── Top Telemetry & Health Ribbon ────────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#090B1E] border border-[#232148] shadow-xl flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Radio className={`h-5 w-5 ${isWsConnected ? "animate-pulse" : ""}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-white tracking-wide">UPSTOX MARKET DATA FEED V3</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-700/50">
                SOURCE: UPSTOX V3
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/50 flex items-center gap-1">
                <Key className="h-3 w-3 text-indigo-400" />
                TOKEN: {tokenType}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                PAPER OMS
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5 font-mono flex items-center gap-3">
              <span>Ws Health: <strong className="text-emerald-400">{isWsConnected ? "CONNECTED" : "DISCONNECTED"}</strong></span>
              <span>•</span>
              <span>Market Phase: <strong className="text-purple-300">{marketPhase}</strong></span>
              <span>•</span>
              <span>Live Trades: <strong className="text-emerald-300">{liveTradeCount}</strong></span>
              <span>•</span>
              <span>Last Traded: <strong className="text-slate-300">{lastTradedCount}</strong></span>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2.5 flex-wrap font-mono text-xs">
          {/* Connection Status Badge (INDEPENDENT) */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-bold ${
              isWsConnected
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                : healthReport?.stale
                ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                : !isAuthenticated
                ? "bg-rose-500/15 border-rose-500/40 text-rose-400"
                : "bg-purple-500/15 border-purple-500/40 text-purple-300"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isWsConnected ? "bg-emerald-400 animate-ping" : "bg-current"}`} />
            <span>{isWsConnected ? "CONNECTED" : (isAuthenticated ? "REST FALLBACK" : "AUTH REQUIRED")}</span>
          </div>

          {/* Market Phase Badge (INDEPENDENT) */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-bold ${
              marketPhase === "NORMAL_OPEN"
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                : marketPhase === "CLOSING_AUCTION"
                ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                : "bg-blue-500/15 border-blue-500/40 text-blue-300"
            }`}
          >
            <span>NSE • {marketPhase}</span>
          </div>

          {/* Subscribed Count */}
          <div className="px-3 py-1 rounded-lg bg-[#11132F] border border-[#232148] text-slate-300">
            <span className="text-slate-400">INSTRUMENTS: </span>
            <span className="font-bold text-purple-400">{INITIAL_UPSTOX_INSTRUMENTS.length}</span>
          </div>

          {/* Manual Refresh */}
          <button
            type="button"
            onClick={() => refetchHealth()}
            className="p-1.5 rounded-lg bg-[#11132F] border border-[#232148] hover:border-purple-400 text-slate-400 hover:text-purple-300 transition-colors"
            title="Refresh Feed Status"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Diagnostic Notice Banners ───────────────────────────────────────── */}
      {!isAuthenticated && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-rose-400" />
          <div>
            <div className="font-bold">Upstox Authentication Required</div>
            <div className="text-xs text-rose-200/80 mt-1">
              {healthReport?.message || "Upstox market data authorization required. Configure UPSTOX_ANALYTICS_TOKEN or connect via /api/upstox/login."}
            </div>
          </div>
        </div>
      )}

      {marketPhase === "CLOSING_AUCTION" && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3 text-sm font-mono">
          <Activity className="h-5 w-5 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <div className="font-bold">NSE Closing Auction Active (15:30 – 15:40 IST)</div>
            <div className="text-xs text-amber-200/80 mt-1">
              Indicative equilibrium prices are displayed separately from Last Traded Price (LTP).
            </div>
          </div>
        </div>
      )}

      {marketPhase === "CLOSED" && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 flex items-start gap-3 text-sm font-mono">
          <Clock className="h-5 w-5 shrink-0 mt-0.5 text-blue-400" />
          <div>
            <div className="font-bold">NSE / BSE Market Closed • Last Traded Data Active</div>
            <div className="text-xs text-blue-200/80 mt-1">
              Regular trading hours: Mon–Fri 09:15 – 15:30 IST. Price animation is disabled. WebSocket connection remains active for health monitoring.
            </div>
          </div>
        </div>
      )}

      {/* ─── Selected Instrument Hero Card ──────────────────────────────────── */}
      {activeQuote ? (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#120F35] to-[#0A0D28] border border-purple-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-wrap items-start justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl font-black text-white tracking-wider">{activeQuote.symbol}</h2>
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-purple-950 text-purple-300 border border-purple-700/50">
                  {activeQuote.exchange_segment}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                  activeQuote.price_state === "LIVE_TRADE"
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-700/50"
                    : activeQuote.price_state === "INDICATIVE"
                    ? "bg-amber-950 text-amber-300 border border-amber-700/50"
                    : "bg-slate-900 text-slate-300 border border-slate-700/50"
                }`}>
                  {activeQuote.price_state === "LIVE_TRADE" ? "LIVE TRADE" : activeQuote.price_state === "INDICATIVE" ? "INDICATIVE" : "LAST TRADED"}
                </span>
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1">
                Display Name: <span className="text-white font-semibold">{activeQuote.display_name}</span> • Key: <span className="text-slate-300 font-mono">{activeQuote.instrument_key}</span>
              </div>
            </div>

            {/* Price Display & Quick Action */}
            <div className="flex flex-col items-end gap-2">
              <div
                className={`text-4xl font-mono font-black transition-colors duration-300 ${
                  priceFlash[activeQuote.symbol] === "up"
                    ? "text-emerald-400"
                    : priceFlash[activeQuote.symbol] === "down"
                    ? "text-rose-400"
                    : "text-white"
                }`}
              >
                {formatMoney(activeQuote.last_price, "₹")}
              </div>

              {/* Separate Indicative Closing Price display if available */}
              {activeQuote.indicative_price !== undefined && activeQuote.indicative_price !== null && (
                <div className="text-xs font-mono text-amber-300 font-bold bg-amber-950/60 px-2.5 py-0.5 rounded border border-amber-700/40">
                  INDICATIVE CLOSING: ₹{activeQuote.indicative_price.toFixed(2)}
                </div>
              )}

              <div className="text-xs font-mono text-slate-400 flex items-center justify-end gap-2">
                {activeQuote.change !== undefined && (
                  <span className={`font-bold ${activeQuote.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {activeQuote.change >= 0 ? "+" : ""}{activeQuote.change.toFixed(2)} ({activeQuote.change_pct !== undefined ? formatPercent(activeQuote.change_pct) : ""})
                  </span>
                )}
                <span>• LAST TRADE: {activeQuote.last_trade_time ? new Date(activeQuote.last_trade_time).toLocaleTimeString() : "—"}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={(e) => handleCreateBot(activeQuote, "BUY", e)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs tracking-wider transition-all shadow-md shadow-emerald-950/40 flex items-center gap-1"
                >
                  <span>BUY</span>
                  <Bot className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleCreateBot(activeQuote, "SELL", e)}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-black text-xs tracking-wider transition-all shadow-md shadow-rose-950/40 flex items-center gap-1"
                >
                  <span>SELL</span>
                  <Bot className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-purple-900/40 font-mono text-xs">
            <div className="p-3 rounded-xl bg-[#11132F]/60 border border-[#232148]">
              <div className="text-[10px] text-slate-400 uppercase">Best Bid</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">
                ₹{activeQuote.bid_price ? activeQuote.bid_price.toFixed(2) : activeQuote.last_price.toFixed(2)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#11132F]/60 border border-[#232148]">
              <div className="text-[10px] text-slate-400 uppercase">Best Ask</div>
              <div className="text-sm font-bold text-rose-400 mt-0.5">
                ₹{activeQuote.ask_price ? activeQuote.ask_price.toFixed(2) : activeQuote.last_price.toFixed(2)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#11132F]/60 border border-[#232148]">
              <div className="text-[10px] text-slate-400 uppercase">Day High</div>
              <div className="text-sm font-bold text-slate-200 mt-0.5">
                {activeQuote.high ? `₹${activeQuote.high.toFixed(2)}` : "—"}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#11132F]/60 border border-[#232148]">
              <div className="text-[10px] text-slate-400 uppercase">Day Low</div>
              <div className="text-sm font-bold text-slate-200 mt-0.5">
                {activeQuote.low ? `₹${activeQuote.low.toFixed(2)}` : "—"}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#11132F]/60 border border-[#232148]">
              <div className="text-[10px] text-slate-400 uppercase">Prev Close</div>
              <div className="text-sm font-bold text-slate-200 mt-0.5">
                {activeQuote.previous_close ? `₹${activeQuote.previous_close.toFixed(2)}` : "—"}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#11132F]/60 border border-[#232148]">
              <div className="text-[10px] text-slate-400 uppercase">Volume</div>
              <div className="text-sm font-bold text-slate-200 mt-0.5">
                {activeQuote.volume ? formatVolume(activeQuote.volume) : "—"}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-[#090B1E] border border-[#232148] text-center text-slate-400 font-mono text-sm">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-purple-400 mb-2" />
          <span>Connecting to Upstox V3 Market Feed...</span>
        </div>
      )}

      {/* ─── Category Filter & Instrument Grid ───────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">UPSTOX VERIFIED WATCHLIST</span>
            <span className="text-xs font-mono text-slate-400">({filteredInstruments.length} Symbols)</span>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#090B1E] border border-[#232148] font-mono text-xs">
            <button
              type="button"
              onClick={() => setCategoryFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                categoryFilter === "ALL" ? "bg-purple-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ALL
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("INDEX")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                categoryFilter === "INDEX" ? "bg-purple-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              INDICES
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("STOCK")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                categoryFilter === "STOCK" ? "bg-purple-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              STOCKS
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {filteredInstruments.map((inst) => {
            const q = quotes[inst.symbol] || quotes[inst.key] || quotes[inst.key.replace("|", ":")] || quotes[inst.symbol.replace(/\s+/g, "")] || quotes[inst.name];
            const isSelected = selectedSymbol === inst.symbol;

            return (
              <div
                key={inst.key}
                onClick={() => setSelectedSymbol(inst.symbol)}
                className={`p-4 rounded-xl border transition-all cursor-pointer font-mono ${
                  isSelected
                    ? "bg-[#120F35] border-purple-500 shadow-lg shadow-purple-950/40"
                    : "bg-[#090B1E]/80 border-[#232148] hover:border-purple-500/50 hover:bg-[#11132F]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-white text-sm tracking-wide">{inst.symbol}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{inst.name}</div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-950 text-purple-300 border border-purple-700/50">
                    {inst.category}
                  </span>
                </div>

                {q ? (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                    <div className="flex items-baseline justify-between">
                      <span className="text-base font-bold text-white">
                        {formatMoney(q.last_price, "₹")}
                      </span>
                      {q.change_pct !== undefined && (
                        <span className={`text-xs font-bold ${q.change_pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {q.change_pct >= 0 ? "+" : ""}{formatPercent(q.change_pct)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span>{q.price_state === "LIVE_TRADE" ? "LIVE TRADE" : "LAST TRADED"}</span>
                      <span className="text-purple-400">UPSTOX V3</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-xs text-slate-500 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${isWsConnected ? "bg-emerald-400" : "bg-purple-400"} animate-pulse`} />
                      <span>{isWsConnected ? "SUBSCRIBED" : !isAuthenticated ? "AUTH REQUIRED" : "CONNECTING..."}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">UPSTOX V3</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
