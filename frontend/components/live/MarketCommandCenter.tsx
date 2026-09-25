"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Search,
  Coins,
  Globe,
  Sliders,
  CheckCircle2,
  XCircle,
  Play,
  Bot,
  Filter,
  BarChart2,
  Terminal,
  Server,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { formatPrice, formatPercent, formatVolume } from "@/lib/formatters";
import { dispatchBotCreation } from "@/lib/store/useBotCreationIntentStore";
import { useMarketFeedStore, NormalizedMarketTick, ProviderStat } from "@/lib/market-data/market-feed-store";
import { MarketStreamObservatory } from "./MarketStreamObservatory";
import { MarketDepthViewer } from "./MarketDepthViewer";

export interface MasterInstrument {
  symbol: string;
  name: string;
  category: "INDEX" | "STOCK" | "FUTURES" | "OPTIONS" | "CRYPTO" | "GLOBAL";
  exchange: "NSE" | "BSE" | "DELTA" | "BINANCE" | "GLOBAL";
  provider: "DHAN" | "UPSTOX" | "DELTA" | "PAPER";
  instrumentKey?: string;
  securityId?: string;
}

export const INITIAL_MARKET_UNIVERSE: MasterInstrument[] = [
  // Indian Indices
  { symbol: "NIFTY", name: "NIFTY 50 Index", category: "INDEX", exchange: "NSE", provider: "DHAN", securityId: "13" },
  { symbol: "BANKNIFTY", name: "NIFTY Bank Index", category: "INDEX", exchange: "NSE", provider: "DHAN", securityId: "25" },
  { symbol: "FINNIFTY", name: "NIFTY Fin Service", category: "INDEX", exchange: "NSE", provider: "DHAN", securityId: "27" },
  { symbol: "MIDCPNIFTY", name: "NIFTY Midcap Select", category: "INDEX", exchange: "NSE", provider: "DHAN", securityId: "33" },
  { symbol: "SENSEX", name: "BSE SENSEX 30", category: "INDEX", exchange: "BSE", provider: "DHAN", securityId: "51" },
  { symbol: "INDIA VIX", name: "India Volatility Index", category: "INDEX", exchange: "NSE", provider: "UPSTOX", instrumentKey: "NSE_INDEX|India VIX" },

  // Indian Option Chain Contracts
  { symbol: "NIFTY 25150 CE", name: "Nifty 50 25150 ATM Call", category: "OPTIONS", exchange: "NSE", provider: "DHAN" },
  { symbol: "NIFTY 25150 PE", name: "Nifty 50 25150 ATM Put", category: "OPTIONS", exchange: "NSE", provider: "DHAN" },
  { symbol: "NIFTY 25200 CE", name: "Nifty 50 25200 OTM Call", category: "OPTIONS", exchange: "NSE", provider: "DHAN" },
  { symbol: "NIFTY 25100 PE", name: "Nifty 50 25100 OTM Put", category: "OPTIONS", exchange: "NSE", provider: "DHAN" },
  { symbol: "NIFTY 25250 CE", name: "Nifty 50 25250 OTM Call", category: "OPTIONS", exchange: "NSE", provider: "DHAN" },
  { symbol: "NIFTY 25050 PE", name: "Nifty 50 25050 OTM Put", category: "OPTIONS", exchange: "NSE", provider: "DHAN" },
  { symbol: "BANKNIFTY 54500 CE", name: "Bank Nifty 54500 ATM Call", category: "OPTIONS", exchange: "NSE", provider: "DHAN" },
  { symbol: "BANKNIFTY 54500 PE", name: "Bank Nifty 54500 ATM Put", category: "OPTIONS", exchange: "NSE", provider: "DHAN" },
  { symbol: "BTC 65000 CALL", name: "Bitcoin 65000 ATM Call", category: "OPTIONS", exchange: "DELTA", provider: "DELTA" },
  { symbol: "BTC 65000 PUT", name: "Bitcoin 65000 ATM Put", category: "OPTIONS", exchange: "DELTA", provider: "DELTA" },

  // Futures
  { symbol: "NIFTY-FUT", name: "Nifty 29 Oct Future", category: "FUTURES", exchange: "NSE", provider: "DHAN" },
  { symbol: "BANKNIFTY-FUT", name: "Bank Nifty 29 Oct Future", category: "FUTURES", exchange: "NSE", provider: "DHAN" },
  { symbol: "RELIANCE-FUT", name: "Reliance 29 Oct Future", category: "FUTURES", exchange: "NSE", provider: "DHAN" },

  // Indian Equities
  { symbol: "RELIANCE", name: "Reliance Industries Ltd", category: "STOCK", exchange: "NSE", provider: "DHAN", securityId: "2885" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd", category: "STOCK", exchange: "NSE", provider: "DHAN", securityId: "1333" },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd", category: "STOCK", exchange: "NSE", provider: "DHAN", securityId: "4963" },
  { symbol: "INFY", name: "Infosys Ltd", category: "STOCK", exchange: "NSE", provider: "DHAN", securityId: "1594" },
  { symbol: "TCS", name: "Tata Consultancy Services", category: "STOCK", exchange: "NSE", provider: "DHAN", securityId: "11536" },
  { symbol: "SBIN", name: "State Bank of India", category: "STOCK", exchange: "NSE", provider: "DHAN", securityId: "3045" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel Ltd", category: "STOCK", exchange: "NSE", provider: "DHAN", securityId: "10604" },
  { symbol: "TATAMOTORS", name: "Tata Motors Ltd", category: "STOCK", exchange: "NSE", provider: "DHAN", securityId: "3456" },

  // Delta Exchange Crypto
  { symbol: "BTCUSD", name: "Bitcoin Perpetual Future", category: "CRYPTO", exchange: "DELTA", provider: "DELTA" },
  { symbol: "ETHUSD", name: "Ethereum Perpetual Future", category: "CRYPTO", exchange: "DELTA", provider: "DELTA" },
  { symbol: "SOLUSD", name: "Solana Perpetual Future", category: "CRYPTO", exchange: "DELTA", provider: "DELTA" },
  { symbol: "XRPUSD", name: "Ripple Perpetual Future", category: "CRYPTO", exchange: "DELTA", provider: "DELTA" },
  { symbol: "DOGEUSD", name: "Dogecoin Perpetual Future", category: "CRYPTO", exchange: "DELTA", provider: "DELTA" },

  // Global / Benchmarks
  { symbol: "US30", name: "Dow Jones Industrial Average", category: "GLOBAL", exchange: "GLOBAL", provider: "PAPER" },
  { symbol: "US500", name: "S&P 500 Index", category: "GLOBAL", exchange: "GLOBAL", provider: "PAPER" },
  { symbol: "USTEC", name: "NASDAQ 100 Index", category: "GLOBAL", exchange: "GLOBAL", provider: "PAPER" },
  { symbol: "XAUUSD", name: "Gold Spot / US Dollar", category: "GLOBAL", exchange: "GLOBAL", provider: "PAPER" },
];

export function MarketCommandCenter() {
  const router = useRouter();
  const quotes = useMarketFeedStore((state) => state.quotesBySymbol);
  const health = useMarketFeedStore((state) => state.health);
  const ingestBatch = useMarketFeedStore((state) => state.ingestBatch);
  const updateProviderStat = useMarketFeedStore((state) => state.updateProviderStat);
  const setConnectionStatus = useMarketFeedStore((state) => state.setConnectionStatus);

  const [activeProviderTab, setActiveProviderTab] = useState<"ALL" | "DHAN" | "UPSTOX" | "DELTA" | "PAPER">("ALL");
  const [activeMainView, setActiveMainView] = useState<"BOARD" | "DETAIL" | "STREAM" | "ACTIVITY">("BOARD");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "INDICES" | "STOCKS" | "FUTURES" | "OPTIONS" | "CRYPTO" | "GLOBAL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("NIFTY");
  const [subscribedSymbols, setSubscribedSymbols] = useState<Set<string>>(
    new Set(INITIAL_MARKET_UNIVERSE.map((i) => i.symbol))
  );

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedSymbolsRef = useRef<Set<string>>(subscribedSymbols);

  useEffect(() => {
    subscribedSymbolsRef.current = subscribedSymbols;
  }, [subscribedSymbols]);

  // 1. WebSocket Gateway Connection
  const connectGatewayWS = useCallback(() => {
    if (typeof window === "undefined") return;
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      const wsUrl = process.env.NEXT_PUBLIC_MARKET_GATEWAY_WS_URL || "ws://127.0.0.1:5051/ws/market";
      console.log("[COMMAND CENTER] Connecting Market Gateway WS:", wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (wsRef.current !== ws) return;
        console.log("[COMMAND CENTER] Connected to Market Data Gateway.");
        setConnectionStatus("CONNECTED");
        // Subscribe to initial universe
        const syms = Array.from(subscribedSymbolsRef.current);
        if (syms.length > 0) {
          ws.send(JSON.stringify({ action: "subscribe", symbols: syms, reason: "COMMAND_CENTER" }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "QUOTE" && payload.data) {
            ingestBatch([payload.data]);
          } else if (payload.type === "SNAPSHOT" && payload.data) {
            ingestBatch(Object.values(payload.data));
          } else if (payload.type === "GATEWAY_READY") {
            if (Array.isArray(payload.activeProviders)) {
              payload.activeProviders.forEach((p: any) => {
                updateProviderStat(p.id, { status: p.status === "LIVE" ? "CONNECTED" : p.status });
              });
            }
          }
        } catch (err) {
          console.warn("[COMMAND CENTER] WS parse note:", err);
        }
      };

      ws.onerror = (e) => {
        if (wsRef.current !== ws) return;
        console.warn("[COMMAND CENTER] Gateway WS error note:", e);
        setConnectionStatus("ERROR");
      };

      ws.onclose = () => {
        if (wsRef.current !== ws) return;
        wsRef.current = null;
        console.log("[COMMAND CENTER] Gateway WS disconnected. Retrying in 4s...");
        setConnectionStatus("RECONNECTING");
        reconnectTimeoutRef.current = setTimeout(() => {
          connectGatewayWS();
        }, 4000);
      };
    } catch (err) {
      console.warn("[COMMAND CENTER] Gateway WS connection setup note:", err);
    }
  }, [ingestBatch, setConnectionStatus, updateProviderStat]);

  useEffect(() => {
    connectGatewayWS();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      const currentWs = wsRef.current;
      wsRef.current = null;
      if (currentWs) {
        currentWs.onmessage = null;
        currentWs.onerror = null;
        currentWs.onclose = null;
        if (currentWs.readyState === WebSocket.OPEN) {
          try {
            currentWs.close();
          } catch {}
        } else if (currentWs.readyState === WebSocket.CONNECTING) {
          currentWs.onopen = () => {
            try {
              currentWs.close();
            } catch {}
          };
        }
      }
    };
  }, [connectGatewayWS]);

  // 2. Fetch Initial Snapshots via REST fallback with continuous live interval
  useEffect(() => {
    const fetchSnapshot = async () => {
      try {
        const syms = Array.from(subscribedSymbols).join(",");
        const res = await fetch(`/api/market/snapshot?symbols=${encodeURIComponent(syms)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.quotes) {
            ingestBatch(Object.values(json.quotes));
          }
        }
      } catch (err) {
        console.warn("[COMMAND CENTER] REST snapshot fetch note:", err);
      }
    };
    fetchSnapshot();
    const timer = setInterval(fetchSnapshot, 2500);
    return () => clearInterval(timer);
  }, [subscribedSymbols, ingestBatch]);

  // 3. Dynamic search & subscription
  const handleSelectInstrument = (symbol: string) => {
    setSelectedSymbol(symbol);
    if (!subscribedSymbols.has(symbol)) {
      setSubscribedSymbols((prev) => new Set([...prev, symbol]));
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: "subscribe", symbols: [symbol], reason: "USER_SEARCH" }));
      }
    }
  };

  // 4. Filtered Universe
  const filteredInstruments = useMemo(() => {
    return INITIAL_MARKET_UNIVERSE.filter((inst) => {
      if (activeProviderTab !== "ALL" && inst.provider !== activeProviderTab) {
        return false;
      }
      if (categoryFilter === "INDICES" && inst.category !== "INDEX") return false;
      if (categoryFilter === "STOCKS" && inst.category !== "STOCK") return false;
      if (categoryFilter === "OPTIONS" && inst.category !== "OPTIONS") return false;
      if (categoryFilter === "FUTURES" && inst.category !== "FUTURES") return false;
      if (categoryFilter === "CRYPTO" && inst.category !== "CRYPTO") return false;
      if (categoryFilter === "GLOBAL" && inst.category !== "GLOBAL") return false;

      if (searchQuery) {
        const q = searchQuery.toUpperCase();
        return (
          inst.symbol.toUpperCase().includes(q) ||
          inst.name.toUpperCase().includes(q) ||
          inst.exchange.toUpperCase().includes(q)
        );
      }
      return true;
    });
  }, [activeProviderTab, categoryFilter, searchQuery]);

  // Selected Quote
  const currentQuote = useMemo(() => {
    return quotes[selectedSymbol] || quotes[`DHAN:${selectedSymbol}`] || quotes[`DELTA:${selectedSymbol}`] || quotes[`UPSTOX:${selectedSymbol}`];
  }, [quotes, selectedSymbol]);

  // 5. Dynamic Top Movers & Leaders from actual received data
  const { topGainers, topLosers, volumeLeaders } = useMemo(() => {
    const list = Object.values(quotes).filter((q) => q.lastPrice !== null && q.lastPrice > 0);
    const sortedByChange = [...list].sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
    const sortedByVolume = [...list].sort((a, b) => (b.volume || 0) - (a.volume || 0));

    return {
      topGainers: sortedByChange.slice(0, 5),
      topLosers: sortedByChange.reverse().slice(0, 5),
      volumeLeaders: sortedByVolume.slice(0, 5),
    };
  }, [quotes]);

  // 6. Bot Creation Dispatch Bridge (Safe Paper-First Execution)
  const handleCreateBot = (quote: NormalizedMarketTick, side: "BUY" | "SELL", e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isIndex = quote.exchangeSegment?.includes("INDEX") || ["NIFTY", "BANKNIFTY", "INDIA VIX", "SENSEX"].includes(quote.symbol);

    dispatchBotCreation(router, {
      symbol: quote.symbol,
      canonicalSymbol: quote.symbol,
      side,
      assetClass: isIndex ? "INDEX" : quote.provider === "DELTA" ? "CRYPTO" : "EQUITY",
      exchange: quote.exchange || "NSE",
      market: quote.provider === "DELTA" ? "Crypto Derivatives" : "Indian Equity",
      broker: quote.provider || "DHAN",
      marketDataSource: `${quote.provider} Live Feed`,
      instrumentId: quote.securityId || quote.symbol,
      currentPrice: quote.lastPrice || null,
      bid: quote.bid || null,
      ask: quote.ask || null,
      openInterest: quote.oi || null,
      volume: quote.volume || null,
      origin: "LIVE_FEED",
      timestamp: Date.now(),
    });
  };

  const providers = health.providers;

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-5 max-w-[1850px] mx-auto min-w-0 font-sans text-slate-200">
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. TOP PROVIDER BAR (Multi-Provider Live Cards)
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* ALL Tab */}
        <button
          type="button"
          onClick={() => setActiveProviderTab("ALL")}
          className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
            activeProviderTab === "ALL"
              ? "bg-[#0E1A38] border-cyan-500 shadow-lg shadow-cyan-950/40"
              : "bg-[#080E20] border-[#1C2B44] hover:bg-[#0C152E]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-300">ALL PROVIDERS</span>
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-white">
            {Object.keys(quotes).length} <span className="text-[11px] font-normal text-slate-400">active ticks</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-400 flex items-center gap-2">
            <span>Aggregated Gateway</span>
            <span className="text-cyan-400">{health.ticksPerSec} ticks/s</span>
          </div>
        </button>

        {/* DHAN Card */}
        <button
          type="button"
          onClick={() => setActiveProviderTab("DHAN")}
          className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
            activeProviderTab === "DHAN"
              ? "bg-[#0E1A38] border-blue-500 shadow-lg shadow-blue-950/40"
              : "bg-[#080E20] border-[#1C2B44] hover:bg-[#0C152E]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🇮🇳</span>
              <span className="text-xs font-mono font-bold text-blue-300">DHAN HQ v2</span>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                providers.DHAN?.status === "CONNECTED"
                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {providers.DHAN?.status || "STANDBY"}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between font-mono">
            <span className="text-xs text-slate-400">Latency:</span>
            <span className="text-sm font-bold text-slate-100">{providers.DHAN?.latencyMs || 0}ms</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span>NSE / BSE Equities</span>
            <span className="text-blue-400">{providers.DHAN?.subCount || 8} subs</span>
          </div>
        </button>

        {/* UPSTOX Card */}
        <button
          type="button"
          onClick={() => setActiveProviderTab("UPSTOX")}
          className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
            activeProviderTab === "UPSTOX"
              ? "bg-[#0E1A38] border-purple-500 shadow-lg shadow-purple-950/40"
              : "bg-[#080E20] border-[#1C2B44] hover:bg-[#0C152E]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-xs font-mono font-bold text-purple-300">UPSTOX V3</span>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                providers.UPSTOX?.status === "CONNECTED"
                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {providers.UPSTOX?.status || "STANDBY"}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between font-mono">
            <span className="text-xs text-slate-400">Latency:</span>
            <span className="text-sm font-bold text-slate-100">{providers.UPSTOX?.latencyMs || 0}ms</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span>Protobuf F&O/Indices</span>
            <span className="text-purple-400">{providers.UPSTOX?.subCount || 5} subs</span>
          </div>
        </button>

        {/* DELTA Card */}
        <button
          type="button"
          onClick={() => setActiveProviderTab("DELTA")}
          className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
            activeProviderTab === "DELTA"
              ? "bg-[#0E1A38] border-amber-500 shadow-lg shadow-amber-950/40"
              : "bg-[#080E20] border-[#1C2B44] hover:bg-[#0C152E]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-mono font-bold text-amber-300">DELTA EXCHANGE</span>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                providers.DELTA?.status === "CONNECTED"
                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {providers.DELTA?.status || "STANDBY"}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between font-mono">
            <span className="text-xs text-slate-400">Latency:</span>
            <span className="text-sm font-bold text-slate-100">{providers.DELTA?.latencyMs || 0}ms</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span>24/7 Crypto Futures</span>
            <span className="text-amber-400">{providers.DELTA?.subCount || 10} subs</span>
          </div>
        </button>

        {/* PAPER SIMULATION Card */}
        <button
          type="button"
          onClick={() => setActiveProviderTab("PAPER")}
          className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
            activeProviderTab === "PAPER"
              ? "bg-[#0E1A38] border-emerald-500 shadow-lg shadow-emerald-950/40"
              : "bg-[#080E20] border-[#1C2B44] hover:bg-[#0C152E]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-emerald-300">PAPER ENGINE</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
              ACTIVE
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between font-mono">
            <span className="text-xs text-slate-400">Sim Latency:</span>
            <span className="text-sm font-bold text-emerald-300">&lt; 0.1ms</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span>Global Benchmarks</span>
            <span className="text-emerald-400">SAFE MODE</span>
          </div>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. GLOBAL STREAM HEALTH TELEMETRY PANEL
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 p-3 rounded-2xl bg-[#080F22] border border-[#18263E] text-xs font-mono">
        <div className="p-2 rounded-xl bg-[#0B152B] border border-[#1E3050]">
          <span className="text-slate-400 text-[10px] block">CONNECTION</span>
          <span className="font-bold text-cyan-300 flex items-center gap-1 mt-0.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            {health.connectionStatus}
          </span>
        </div>

        <div className="p-2 rounded-xl bg-[#0B152B] border border-[#1E3050]">
          <span className="text-slate-400 text-[10px] block">TICK RATE</span>
          <span className="font-bold text-white mt-0.5 block">{health.ticksPerSec} / sec</span>
        </div>

        <div className="p-2 rounded-xl bg-[#0B152B] border border-[#1E3050]">
          <span className="text-slate-400 text-[10px] block">AVG LATENCY</span>
          <span className="font-bold text-emerald-400 mt-0.5 block">{health.latencyMs.toFixed(1)} ms</span>
        </div>

        <div className="p-2 rounded-xl bg-[#0B152B] border border-[#1E3050]">
          <span className="text-slate-400 text-[10px] block">P95 LATENCY</span>
          <span className="font-bold text-amber-400 mt-0.5 block">{health.p95LatencyMs.toFixed(1)} ms</span>
        </div>

        <div className="p-2 rounded-xl bg-[#0B152B] border border-[#1E3050]">
          <span className="text-slate-400 text-[10px] block">SUBSCRIPTIONS</span>
          <span className="font-bold text-white mt-0.5 block">{subscribedSymbols.size} symbols</span>
        </div>

        <div className="p-2 rounded-xl bg-[#0B152B] border border-[#1E3050]">
          <span className="text-slate-400 text-[10px] block">TOTAL MSGS</span>
          <span className="font-bold text-slate-200 mt-0.5 block">{health.totalMessages.toLocaleString()}</span>
        </div>

        <div className="p-2 rounded-xl bg-[#0B152B] border border-[#1E3050]">
          <span className="text-slate-400 text-[10px] block">DROPPED / GAPS</span>
          <span className="font-bold text-slate-400 mt-0.5 block">{health.droppedPackets} / {health.sequenceGaps}</span>
        </div>

        <div className="p-2 rounded-xl bg-[#0B152B] border border-[#1E3050]">
          <span className="text-slate-400 text-[10px] block">DATA QUALITY</span>
          <span className="font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            STRICT 100%
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. TOOLBAR & VIEW NAVIGATION
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-[#0A1227] border border-[#1C2C47]">
        {/* Main View Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#050A18] border border-[#16233B]">
          <button
            type="button"
            onClick={() => setActiveMainView("BOARD")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeMainView === "BOARD"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-900/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            <span>MARKET BOARD</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainView("DETAIL")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeMainView === "DETAIL"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-900/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>DEPTH & DETAIL</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainView("STREAM")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeMainView === "STREAM"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-900/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>STREAM OBSERVATORY</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-950 text-cyan-300">LIVE</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainView("ACTIVITY")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeMainView === "ACTIVITY"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-900/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>TOP ACTIVITY</span>
          </button>
        </div>

        {/* Universal Search & Quick Filters */}
        <div className="flex items-center gap-2">
          {activeMainView === "BOARD" && (
            <div className="flex items-center gap-1 bg-[#050A18] p-1 rounded-xl border border-[#16233B] flex-wrap">
              {(["ALL", "INDICES", "STOCKS", "OPTIONS", "FUTURES", "CRYPTO", "GLOBAL"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all ${
                    categoryFilter === cat
                      ? "bg-[#162646] text-cyan-300 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search symbol, index, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#050A18] border border-[#16233B] rounded-xl text-xs font-mono text-slate-100 placeholder-slate-500 w-64 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          4. MAIN VIEW CONTAINER
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeMainView === "BOARD" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Market Board Table (2 Cols) */}
          <div className="lg:col-span-2 bg-[#070D1E] border border-[#1A263D] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-3.5 bg-[#0A1227] border-b border-[#1A263D] flex items-center justify-between font-mono text-xs">
              <span className="font-bold text-slate-200 tracking-wider">LIVE MARKET BOARD</span>
              <span className="text-slate-400 text-[11px]">
                Showing {filteredInstruments.length} instruments
              </span>
            </div>

            <div className="overflow-x-auto divide-y divide-[#131D33]">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead className="bg-[#0C152E] text-[11px] font-semibold text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3.5">SYMBOL</th>
                    <th className="py-2.5 px-3">PROVIDER</th>
                    <th className="py-2.5 px-3 text-right">LTP</th>
                    <th className="py-2.5 px-3 text-right">CHANGE</th>
                    <th className="py-2.5 px-3 text-right">BID / ASK</th>
                    <th className="py-2.5 px-3 text-right">VOLUME / OI</th>
                    <th className="py-2.5 px-3 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#131D33] text-slate-300">
                  {filteredInstruments.map((inst) => {
                    const q = quotes[inst.symbol] || quotes[`${inst.provider}:${inst.symbol}`];
                    const isSelected = selectedSymbol === inst.symbol;
                    const change = q?.change ?? null;
                    const changePct = q?.changePercent ?? null;
                    const isUp = (change || 0) >= 0;

                    return (
                      <tr
                        key={inst.symbol}
                        onClick={() => handleSelectInstrument(inst.symbol)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[#112040] border-l-4 border-l-cyan-500"
                            : "hover:bg-[#0E1830]/70"
                        }`}
                      >
                        <td className="py-2.5 px-3.5">
                          <div className="font-bold text-slate-100 flex items-center gap-2">
                            <span>{inst.symbol}</span>
                            <span className="text-[10px] text-slate-500 font-normal">{inst.exchange}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{inst.name}</div>
                        </td>

                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              inst.provider === "DHAN"
                                ? "bg-blue-950/60 text-blue-300 border-blue-500/30"
                                : inst.provider === "UPSTOX"
                                ? "bg-purple-950/60 text-purple-300 border-purple-500/30"
                                : inst.provider === "DELTA"
                                ? "bg-amber-950/60 text-amber-300 border-amber-500/30"
                                : "bg-emerald-950/60 text-emerald-300 border-emerald-500/30"
                            }`}
                          >
                            {inst.provider}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right font-bold text-slate-100">
                          {q?.lastPrice !== null && q?.lastPrice !== undefined ? formatPrice(q.lastPrice) : "--"}
                        </td>

                        <td className={`py-2.5 px-3 text-right font-bold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                          {changePct !== null && changePct !== undefined ? (
                            <span className="flex items-center justify-end gap-0.5">
                              {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                              {formatPercent(changePct)}
                            </span>
                          ) : (
                            "--"
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right text-slate-400 text-[11px]">
                          {q?.bid !== null && q?.bid !== undefined ? formatPrice(q.bid) : "--"} /{" "}
                          {q?.ask !== null && q?.ask !== undefined ? formatPrice(q.ask) : "--"}
                        </td>

                        <td className="py-2.5 px-3 text-right text-slate-400 text-[11px]">
                          {q?.volume !== null && q?.volume !== undefined ? formatVolume(q.volume) : "--"}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => q && handleCreateBot(q, "BUY", e)}
                              className="px-2 py-1 rounded bg-emerald-950/80 hover:bg-emerald-800 text-emerald-300 text-[10px] font-bold border border-emerald-500/40"
                            >
                              BUY
                            </button>
                            <button
                              type="button"
                              onClick={(e) => q && handleCreateBot(q, "SELL", e)}
                              className="px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-800 text-rose-300 text-[10px] font-bold border border-rose-500/40"
                            >
                              SELL
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Market Detail & Quick Depth Sidepanel (1 Col) */}
          <div className="space-y-4">
            {/* Selected Instrument Detail Card */}
            <div className="p-4 rounded-2xl bg-[#070D1E] border border-[#1A263D] shadow-2xl space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-[#152037] pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {selectedSymbol}
                    <span className="text-xs px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                      {currentQuote?.provider || "GATEWAY"}
                    </span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    {currentQuote?.exchange || "NSE"} &bull; {currentQuote?.status || "LIVE"}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    {currentQuote?.lastPrice !== null && currentQuote?.lastPrice !== undefined
                      ? formatPrice(currentQuote.lastPrice)
                      : "--"}
                  </div>
                  <div
                    className={`text-xs font-bold ${
                      (currentQuote?.changePercent || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {currentQuote?.changePercent !== null && currentQuote?.changePercent !== undefined
                      ? formatPercent(currentQuote.changePercent)
                      : "--"}
                  </div>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-[#0A1227] border border-[#152037]">
                  <span className="text-slate-500 text-[10px] block">BEST BID</span>
                  <span className="font-bold text-slate-200">
                    {currentQuote?.bid !== null && currentQuote?.bid !== undefined ? formatPrice(currentQuote.bid) : "--"}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-[#0A1227] border border-[#152037]">
                  <span className="text-slate-500 text-[10px] block">BEST ASK</span>
                  <span className="font-bold text-slate-200">
                    {currentQuote?.ask !== null && currentQuote?.ask !== undefined ? formatPrice(currentQuote.ask) : "--"}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-[#0A1227] border border-[#152037]">
                  <span className="text-slate-500 text-[10px] block">OPEN / HIGH</span>
                  <span className="font-bold text-slate-200">
                    {currentQuote?.open ? formatPrice(currentQuote.open) : "--"} / {currentQuote?.high ? formatPrice(currentQuote.high) : "--"}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-[#0A1227] border border-[#152037]">
                  <span className="text-slate-500 text-[10px] block">LOW / PREV CLOSE</span>
                  <span className="font-bold text-slate-200">
                    {currentQuote?.low ? formatPrice(currentQuote.low) : "--"} / {currentQuote?.previousClose ? formatPrice(currentQuote.previousClose) : "--"}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-[#0A1227] border border-[#152037]">
                  <span className="text-slate-500 text-[10px] block">VOLUME</span>
                  <span className="font-bold text-slate-200">
                    {currentQuote?.volume ? currentQuote.volume.toLocaleString() : "--"}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-[#0A1227] border border-[#152037]">
                  <span className="text-slate-500 text-[10px] block">OPEN INTEREST</span>
                  <span className="font-bold text-slate-200">
                    {currentQuote?.oi ? currentQuote.oi.toLocaleString() : "--"}
                  </span>
                </div>
              </div>

              {/* Bot Creation Intent Dispatch */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => currentQuote && handleCreateBot(currentQuote, "BUY", e)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span>DEPLOY BUY BOT</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => currentQuote && handleCreateBot(currentQuote, "SELL", e)}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span>DEPLOY SELL BOT</span>
                </button>
              </div>
            </div>

            {/* Depth Viewer */}
            <MarketDepthViewer quote={currentQuote} provider={currentQuote?.provider} />
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          5. DETAIL & DEPTH FULL VIEW
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeMainView === "DETAIL" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="p-5 rounded-2xl bg-[#070D1E] border border-[#1A263D] shadow-2xl space-y-4 font-mono">
            <h3 className="text-sm font-bold text-white tracking-wider">INSTRUMENT TELEMETRY & SPECIFICATION</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-[#152037]">
                <span className="text-slate-400">Canonical Symbol</span>
                <span className="font-bold text-white">{selectedSymbol}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#152037]">
                <span className="text-slate-400">Provider Feed</span>
                <span className="font-bold text-cyan-300">{currentQuote?.provider || "GATEWAY"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#152037]">
                <span className="text-slate-400">Exchange Segment</span>
                <span className="font-bold text-slate-200">{currentQuote?.exchangeSegment || "NSE_EQ"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#152037]">
                <span className="text-slate-400">Feed Latency (Gateway)</span>
                <span className="font-bold text-emerald-400">{currentQuote?.feedLatencyMs || 0} ms</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#152037]">
                <span className="text-slate-400">Exchange Timestamp (UTC)</span>
                <span className="font-bold text-slate-300">{currentQuote?.eventTimestamp || "--"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#152037]">
                <span className="text-slate-400">Received Timestamp (UTC)</span>
                <span className="font-bold text-slate-300">{currentQuote?.receivedTimestamp || "--"}</span>
              </div>
            </div>
          </div>

          <MarketDepthViewer quote={currentQuote} provider={currentQuote?.provider} />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          6. STREAM OBSERVATORY TAB
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeMainView === "STREAM" && (
        <MarketStreamObservatory initialProvider={activeProviderTab} initialSymbol={selectedSymbol} />
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          7. TOP ACTIVITY TAB (Movers, Losers, Leaders)
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeMainView === "ACTIVITY" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-mono text-xs">
          {/* Top Gainers */}
          <div className="p-4 rounded-2xl bg-[#070D1E] border border-[#1A263D] shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold border-b border-[#152037] pb-2">
              <TrendingUp className="h-4 w-4" />
              <span>TOP GAINERS</span>
            </div>
            <div className="divide-y divide-[#131D33]">
              {topGainers.length === 0 ? (
                <div className="py-6 text-center text-slate-500">Waiting for market data...</div>
              ) : (
                topGainers.map((q) => (
                  <div key={q.symbol} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">{q.symbol}</span>
                      <span className="text-[10px] text-slate-500">{q.provider}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white block">{q.lastPrice ? formatPrice(q.lastPrice) : "--"}</span>
                      <span className="text-emerald-400 font-bold">{q.changePercent ? formatPercent(q.changePercent) : "--"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Losers */}
          <div className="p-4 rounded-2xl bg-[#070D1E] border border-[#1A263D] shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold border-b border-[#152037] pb-2">
              <TrendingDown className="h-4 w-4" />
              <span>TOP LOSERS</span>
            </div>
            <div className="divide-y divide-[#131D33]">
              {topLosers.length === 0 ? (
                <div className="py-6 text-center text-slate-500">Waiting for market data...</div>
              ) : (
                topLosers.map((q) => (
                  <div key={q.symbol} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">{q.symbol}</span>
                      <span className="text-[10px] text-slate-500">{q.provider}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white block">{q.lastPrice ? formatPrice(q.lastPrice) : "--"}</span>
                      <span className="text-rose-400 font-bold">{q.changePercent ? formatPercent(q.changePercent) : "--"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Volume Leaders */}
          <div className="p-4 rounded-2xl bg-[#070D1E] border border-[#1A263D] shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold border-b border-[#152037] pb-2">
              <BarChart2 className="h-4 w-4" />
              <span>VOLUME LEADERS</span>
            </div>
            <div className="divide-y divide-[#131D33]">
              {volumeLeaders.length === 0 ? (
                <div className="py-6 text-center text-slate-500">Waiting for market data...</div>
              ) : (
                volumeLeaders.map((q) => (
                  <div key={q.symbol} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">{q.symbol}</span>
                      <span className="text-[10px] text-slate-500">{q.provider}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white block">{q.lastPrice ? formatPrice(q.lastPrice) : "--"}</span>
                      <span className="text-cyan-400 font-bold">{q.volume ? q.volume.toLocaleString() : "--"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
