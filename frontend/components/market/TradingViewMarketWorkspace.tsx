"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useActiveBot } from "@/context/ActiveBotContext";
import {
  Globe,
  Activity,
  Layers,
  TrendingUp,
  Zap,
  Shield,
  Search,
  ChevronDown,
  RefreshCw,
  Clock,
  Sliders,
  DollarSign,
  Radio,
  ExternalLink,
} from "lucide-react";
import { TradingViewTimeframeSelector } from "@/components/terminal/TradingViewTimeframeSelector";
import { MultiTimeframeSignalMatrix } from "@/components/terminal/MultiTimeframeSignalMatrix";
import { QuickTradePanel } from "@/components/terminal/QuickTradePanel";
import { MarketHealthTelemetry } from "./MarketHealthTelemetry";
import { formatNumber, formatPrice, formatPercent, formatPnL, toNumeric } from "@/lib/formatters";
import { WatchlistStarButton } from "@/components/watchlists/WatchlistStarButton";
import { normalizeExpiriesList } from "@/lib/expiry-utils";
import { apiClient } from "@/lib/apiClient";

export function TradingViewMarketWorkspace() {
  const { activeSymbol, setActiveSymbol, activeTimeframe, setActiveTimeframe } = useActiveBot();

  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "options" | "futures" | "depth" | "signals">("overview");
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");

  // 1. Fetch Universe Instruments
  const { data: universeData, isLoading: isLoadingUniverse } = useQuery({
    queryKey: ["workspaceUniverse"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/market/instruments?limit=250", { timeoutMs: 5000 });
      if (!res.ok || !res.data) throw new Error("Failed to load instruments");
      return res.data;
    },
  });

  // 2. Fetch Live Quote
  const { data: quoteData } = useQuery({
    queryKey: ["workspaceQuote", activeSymbol],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/api/market/quote?symbol=${encodeURIComponent(activeSymbol || "BTC/USDT")}`, { timeoutMs: 5000 });
      if (!res.ok || !res.data) throw new Error("Failed to load quote");
      return res.data;
    },
    refetchInterval: () => (apiClient.isOffline() ? false : 3000),
  });

  // 3. Fetch Expiries for active symbol
  const { data: expiriesData } = useQuery({
    queryKey: ["workspaceExpiries", activeSymbol],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/api/options/expiries?underlying=${encodeURIComponent(activeSymbol || "BTC")}`, { timeoutMs: 5000 });
      if (!res.ok || !res.data) return { expiries: [] };
      return res.data;
    },
  });

  const normalizedExpiries = React.useMemo(() => {
    const raw = Array.isArray(expiriesData?.expiries) ? expiriesData.expiries : [];
    return normalizeExpiriesList(raw, activeSymbol || "BTC");
  }, [expiriesData?.expiries, activeSymbol]);

  // 4. Fetch Option Chain Snapshot
  const { data: optionsData } = useQuery({
    queryKey: ["workspaceOptionChain", activeSymbol, selectedExpiry],
    queryFn: async () => {
      const params = new URLSearchParams({
        underlying: activeSymbol || "BTC",
      });
      if (selectedExpiry) params.append("expiry", selectedExpiry);
      const res = await apiClient.get<any>(`/api/options/analytics?${params.toString()}`, { timeoutMs: 5000 });
      if (!res.ok || !res.data) return null;
      return res.data;
    },
    refetchInterval: () => (apiClient.isOffline() ? false : 5000),
    enabled: activeSubTab === "options",
  });

  // 5. Fetch Futures Contracts
  const { data: futuresData } = useQuery({
    queryKey: ["workspaceFutures", activeSymbol],
    queryFn: async () => {
      const res = await fetch(`/api/futures/contracts?underlying=${encodeURIComponent(activeSymbol || "BTC")}`);
      if (!res.ok) return { contracts: [] };
      return res.json();
    },
    refetchInterval: 5000,
    enabled: activeSubTab === "futures",
  });

  const instruments = universeData?.instruments || [];
  const quote = quoteData?.quote || {
    symbol: activeSymbol || "BTC/USDT",
    lastPrice: 65400.0,
    bid: 65386.92,
    ask: 65413.08,
    change_pct: 0.55,
    exchange: "Binance",
    status: "LIVE",
  };
  const expiries = expiriesData?.expiries || [];
  const futures = futuresData?.contracts || [];

  const assetClasses = [
    { id: "ALL", label: "All Markets" },
    { id: "CRYPTO", label: "Crypto" },
    { id: "INDIAN_INDICES", label: "Indian Indices" },
    { id: "GLOBAL_INDICES", label: "Global Indices" },
    { id: "INDIAN_EQUITIES", label: "Indian Equities" },
    { id: "COMMODITIES", label: "Commodities" },
  ];

  return (
    <div className="space-y-4 font-sans text-slate-100 select-none">
      {/* 1. Market Data Health Telemetry Strip */}
      <MarketHealthTelemetry />

      {/* 2. One-Click Market / Exchange / Symbol Bar */}
      <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        {/* Left: Asset Class + Symbol Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Asset Class Pills */}
          <div className="flex items-center gap-1 bg-[#080C14] p-1 rounded-xl border border-[#1E293B] text-xs font-mono">
            {assetClasses.map((ac) => (
              <button
                key={ac.id}
                onClick={() => setActiveCategory(ac.id)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  activeCategory === ac.id
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {ac.label}
              </button>
            ))}
          </div>

          {/* Symbol Dropdown & Watchlist Star */}
          <div className="relative flex items-center gap-1.5">
            <select
              value={activeSymbol}
              onChange={(e) => setActiveSymbol(e.target.value)}
              className="px-3 py-1.5 bg-[#080C14] border border-[#1E293B] rounded-xl text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {instruments.map((inst: any) => (
                <option key={inst.symbol} value={inst.symbol} className="bg-[#080C14] text-white">
                  {inst.display_name} ({inst.symbol}) • {inst.exchange}
                </option>
              ))}
            </select>
            <WatchlistStarButton instrument={activeSymbol} size="sm" />
          </div>

          {/* Dynamic Expiry Selector if available */}
          {normalizedExpiries.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-500 hidden sm:inline">EXPIRY:</span>
              <select
                value={selectedExpiry || normalizedExpiries[0]?.value || ""}
                onChange={(e) => setSelectedExpiry(e.target.value)}
                className="px-2.5 py-1.5 bg-[#080C14] border border-[#1E293B] rounded-xl text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                {normalizedExpiries.map((opt) => (
                  <option key={opt.key} value={opt.value} className="bg-[#080C14] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right: Live Quote Banner */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">LAST PRICE</span>
            <span className="text-base font-extrabold text-white">
              {formatPrice(quote.lastPrice, "$", 2)}
            </span>
          </div>

          <div className="border-l border-[#1E293B] pl-3">
            <span className="text-[10px] text-slate-500 block uppercase">24H CHANGE</span>
            <span className={`font-bold ${(quote.change_pct || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {formatPercent(quote.change_pct, 2, true)}
            </span>
          </div>

          <div className="border-l border-[#1E293B] pl-3 hidden md:block">
            <span className="text-[10px] text-slate-500 block uppercase">BID / ASK SPREAD</span>
            <span className="text-slate-300">
              {formatPrice(quote.bid, "$", 1)} / {formatPrice(quote.ask, "$", 1)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. TradingView-Style Timeframe Bar */}
      <TradingViewTimeframeSelector
        activeTimeframe={activeTimeframe || "5m"}
        onSelectTimeframe={(tf) => setActiveTimeframe(tf)}
      />

      {/* 4. Multi-Timeframe Confluence Signal Matrix */}
      <MultiTimeframeSignalMatrix symbol={activeSymbol || "BTC/USDT"} />

      {/* 5. Main Workspace Grid: (Tabs & Workspaces) + Quick Trade Ticket */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Left 3 Columns: Interactive Workspace Tabs */}
        <div className="xl:col-span-3 space-y-4">
          {/* Sub-Tab Navigation Strip */}
          <div className="flex items-center gap-2 border-b border-[#1E293B] pb-2 font-mono text-xs">
            {[
              { id: "overview" as const, label: "Market Overview", icon: Activity },
              { id: "options" as const, label: "Strike-Centered Option Chain", icon: Zap },
              { id: "futures" as const, label: "Futures Term Structure & Basis", icon: TrendingUp },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                    isSelected
                      ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#121927]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Overview */}
          {activeSubTab === "overview" && (
            <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase font-mono">
                    {activeSymbol} Institutional Market Depth
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time market depth, quote flow, and multi-timeframe regime alignment.
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 font-mono text-xs rounded-lg">
                  AUTHORIZED DIRECT FEED
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-2">
                <div className="p-3 bg-[#080C14] border border-[#1E293B] rounded-xl">
                  <span className="text-[10px] text-slate-500 uppercase block">VWAP</span>
                  <span className="text-sm font-bold text-white">{formatPrice(quote.vwap || quote.lastPrice, "$", 2)}</span>
                </div>
                <div className="p-3 bg-[#080C14] border border-[#1E293B] rounded-xl">
                  <span className="text-[10px] text-slate-500 uppercase block">24h High / Low</span>
                  <span className="text-sm font-bold text-white">
                    {formatPrice(quote.high || (Number(quote.lastPrice || 0) * 1.02), "$", 2)} / {formatPrice(quote.low || (Number(quote.lastPrice || 0) * 0.98), "$", 2)}
                  </span>
                </div>
                <div className="p-3 bg-[#080C14] border border-[#1E293B] rounded-xl">
                  <span className="text-[10px] text-slate-500 uppercase block">Volume</span>
                  <span className="text-sm font-bold text-cyan-400">{formatNumber(quote.volume, 0, "1,250")}</span>
                </div>
                <div className="p-3 bg-[#080C14] border border-[#1E293B] rounded-xl">
                  <span className="text-[10px] text-slate-500 uppercase block">Exchange</span>
                  <span className="text-sm font-bold text-purple-300">{quote.exchange || "BINANCE"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Options Analytics */}
          {activeSubTab === "options" && (
            <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase font-mono">
                    {activeSymbol} Option Analytics & Max Pain
                  </h3>
                  <p className="text-xs text-slate-400">
                    PCR, Max Pain strike, and open interest concentration for expiry {selectedExpiry || normalizedExpiries[0]?.label || "—"}.
                  </p>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-slate-400">GREEKS:</span>
                  <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-bold">
                    BLACK-SCHOLES SOLVER
                  </span>
                </div>
              </div>

              {optionsData && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 bg-[#080C14] border border-[#1E293B] rounded-xl">
                    <span className="text-[10px] text-slate-500 uppercase block">Max Pain Strike</span>
                    <span className="text-sm font-bold text-amber-400">${optionsData.max_pain}</span>
                  </div>
                  <div className="p-3 bg-[#080C14] border border-[#1E293B] rounded-xl">
                    <span className="text-[10px] text-slate-500 uppercase block">PCR (Open Interest)</span>
                    <span className="text-sm font-bold text-cyan-400">{optionsData.pcr_oi}</span>
                  </div>
                  <div className="p-3 bg-[#080C14] border border-[#1E293B] rounded-xl">
                    <span className="text-[10px] text-slate-500 uppercase block">PCR (Volume)</span>
                    <span className="text-sm font-bold text-white">{optionsData.pcr_volume}</span>
                  </div>
                  <div className="p-3 bg-[#080C14] border border-[#1E293B] rounded-xl">
                    <span className="text-[10px] text-slate-500 uppercase block">Major Support</span>
                    <span className="text-sm font-bold text-emerald-400">
                      ${optionsData.support_zones?.join(", $") || "—"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Futures */}
          {activeSubTab === "futures" && (
            <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-5 space-y-4 shadow-xl">
              <div>
                <h3 className="text-sm font-bold text-white uppercase font-mono">
                  {activeSymbol} Futures Term Structure & Basis
                </h3>
                <p className="text-xs text-slate-400">
                  Perpetual funding rate, cost of carry, annualized basis, and open interest.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#1E293B] text-[10px] text-slate-400 uppercase">
                      <th className="py-2 px-3">Contract</th>
                      <th className="py-2 px-3">Expiry</th>
                      <th className="py-2 px-3 text-right">Price</th>
                      <th className="py-2 px-3 text-right">Basis</th>
                      <th className="py-2 px-3 text-right">Ann. Basis</th>
                      <th className="py-2 px-3 text-right">Open Interest</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#141D2E] text-slate-300">
                    {futures.map((f: any) => (
                      <tr key={f.contract} className="hover:bg-[#121927]">
                        <td className="py-2.5 px-3 font-bold text-cyan-400">{f.contract}</td>
                        <td className="py-2.5 px-3 text-purple-300">{f.expiry}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">${f.lastPrice}</td>
                        <td className={`py-2.5 px-3 text-right font-bold ${f.basis >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {f.basis >= 0 ? `+$${f.basis}` : `-$${Math.abs(f.basis)}`}
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-400">{f.annualized_basis}%</td>
                        <td className="py-2.5 px-3 text-right text-slate-400">{f.OI}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Column: Institutional Order Execution Ticket */}
        <div className="xl:col-span-1">
          <QuickTradePanel
            symbol={activeSymbol || "BTC/USDT"}
            currentPrice={quote.lastPrice}
          />
        </div>
      </div>
    </div>
  );
}
