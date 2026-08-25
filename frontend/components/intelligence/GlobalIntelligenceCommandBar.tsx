"use client";

import React, { useState } from "react";
import {
  Brain,
  Radio,
  ShieldCheck,
  ShieldAlert,
  Bot,
  Zap,
  RefreshCw,
  Clock,
  Layers,
  ChevronDown,
  Activity,
  Sliders,
  ExternalLink,
  Search,
  Globe,
  AlertTriangle,
  Flame,
} from "lucide-react";
import { useActiveBot } from "@/context/ActiveBotContext";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

interface GlobalIntelligenceCommandBarProps {
  executionMode?: "PAPER" | "LIVE";
  symbol?: string;
  exchange?: string;
  strategyName?: string;
  timeframe?: string;
  lastUpdatedText?: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onKillSwitch?: () => void;
  feedLatencyMs?: number;
  marketStatus?: string;
  feedStatus?: string;
}

const ASSET_CLASS_OPTIONS = [
  { id: "ALL", label: "All Markets" },
  { id: "CRYPTO_SPOT", label: "Crypto Spot" },
  { id: "CRYPTO_FUTURES", label: "Crypto Futures" },
  { id: "INDIAN_INDICES", label: "NSE Indices" },
  { id: "INDIAN_EQUITIES", label: "NSE Equities" },
  { id: "INDIAN_FNO", label: "NSE F&O" },
  { id: "US_EQUITIES", label: "US Equities & ETFs" },
  { id: "GLOBAL_INDICES", label: "Global Indices" },
  { id: "FOREX", label: "Forex" },
  { id: "COMMODITIES", label: "Commodities" },
];

export function GlobalIntelligenceCommandBar({
  executionMode = "PAPER",
  symbol = "BTC/USDT",
  exchange = "Binance Futures",
  strategyName = "Deterministic Multi-Timeframe Confluence Engine",
  timeframe = "15m Primary",
  lastUpdatedText = "Live Feed Active",
  isRefreshing = false,
  onRefresh,
  onKillSwitch,
  feedLatencyMs = 14.5,
  marketStatus = "MARKET OPEN 24/7",
  feedStatus = "REAL-TIME",
}: GlobalIntelligenceCommandBarProps) {
  const isLive = executionMode === "LIVE";
  const { activeSymbol, setActiveSymbol } = useActiveBot();
  const [selectedAssetClass, setSelectedAssetClass] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isHalted, setIsHalted] = useState(false);

  // Search instruments from canonical universe
  const { data: searchData } = useQuery({
    queryKey: ["marketsSearch", searchQuery, selectedAssetClass],
    queryFn: async () => {
      const q = encodeURIComponent(searchQuery);
      const ac = selectedAssetClass !== "ALL" ? `&asset_class=${selectedAssetClass}` : "";
      const res = await apiClient.get<any>(`/api/markets/search?query=${q}${ac}&limit=20`);
      if (!res.ok) return [];
      return res.data?.results || [];
    },
    enabled: showSearchModal || searchQuery.length > 0,
    staleTime: 30000,
  });

  const handleSelectSymbol = (sym: string) => {
    setActiveSymbol(sym);
    setShowSearchModal(false);
    setSearchQuery("");
  };

  const handleEmergencyHalt = async () => {
    if (confirm("EMERGENCY ACTION: Are you sure you want to trigger Global HALT across all bots and feeds?")) {
      setIsHalted(true);
      await apiClient.post("/api/ai/disable", {});
      if (onKillSwitch) onKillSwitch();
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl space-y-4 font-sans select-none">
      {/* Top Main Command Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Intelligence Engine Identity & Instrument Switcher */}
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/30 text-[var(--theme-accent)] shadow-md shadow-[var(--theme-accent)]/10">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--theme-text-primary)]">
                Global Multi-Asset Intelligence OS
              </h1>
              {/* Environment Badge */}
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono border flex items-center gap-1.5 ${
                  isLive
                    ? "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/40 animate-pulse"
                    : "bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border-[var(--theme-accent)]/30"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isLive ? "bg-[var(--theme-loss)]" : "bg-[var(--theme-accent)]"
                  }`}
                />
                {isLive ? "LIVE CAPITAL" : "PAPER SIMULATION"}
              </span>

              {/* Active Symbol Switcher Trigger */}
              <button
                onClick={() => setShowSearchModal(true)}
                className="text-xs font-mono font-extrabold px-3 py-1 rounded-lg bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] border border-[var(--theme-border-subtle)] text-[var(--theme-accent)] flex items-center gap-1.5 transition shadow-sm"
              >
                <span>{symbol || activeSymbol || "BTC/USDT"}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {/* Feed Status Badge */}
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                feedStatus === "REAL-TIME"
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : feedStatus === "DELAYED"
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}>
                {feedStatus}
              </span>
            </div>

            <p className="text-xs text-[var(--theme-text-secondary)] mt-0.5 flex items-center gap-2 flex-wrap font-mono">
              <span>{exchange} • {strategyName} ({timeframe})</span>
              <span className="text-[10px] text-[var(--theme-text-muted)]">
                • {lastUpdatedText}
              </span>
            </p>
          </div>
        </div>

        {/* Right: Operational Telemetry & Safety Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Feed Latency Badge */}
          <div
            className="px-2.5 py-1.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] flex items-center gap-1.5 text-xs font-mono"
            title="Direct Stream Latency"
          >
            <Radio className="h-3.5 w-3.5 text-[var(--theme-profit)] animate-pulse" />
            <span className="text-[11px] text-[var(--theme-text-secondary)]">FEED:</span>
            <span className="font-bold text-[var(--theme-profit)] text-[11px] tabular-nums">
              {feedLatencyMs.toFixed(1)}ms
            </span>
          </div>

          {/* Market Status Badge */}
          <div
            className="px-2.5 py-1.5 rounded-xl bg-[var(--theme-profit)]/10 border border-[var(--theme-profit)]/30 flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--theme-profit)]"
          >
            <Activity className="h-3.5 w-3.5" />
            <span className="text-[11px]">{marketStatus}</span>
          </div>

          {/* 20-Gate Risk Status */}
          <div
            className="px-2.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-300"
            title="20 Pre-Trade Deterministic Risk Gates Armed"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="text-[11px]">20-GATE ARMED</span>
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border-subtle)] transition disabled:opacity-50"
              title="Force Refresh Decision Engine & Quotes"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-[var(--theme-accent)]" : ""}`} />
            </button>
          )}

          {/* Emergency HALT Button */}
          <button
            onClick={handleEmergencyHalt}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition flex items-center gap-1.5 ${
              isHalted
                ? "bg-rose-600 text-white border-rose-500 animate-pulse"
                : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30"
            }`}
            title="Emergency Halt: Blocks all orders and pauses trading bots"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{isHalted ? "SYSTEM HALTED" : "EMERGENCY HALT"}</span>
          </button>
        </div>
      </div>

      {/* Asset Class Quick-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs font-mono border-t border-[var(--theme-border-subtle)] pt-3">
        {ASSET_CLASS_OPTIONS.map((ac) => (
          <button
            key={ac.id}
            onClick={() => setSelectedAssetClass(ac.id)}
            className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition ${
              selectedAssetClass === ac.id
                ? "bg-[var(--theme-accent)] text-slate-950 shadow-md shadow-[var(--theme-accent)]/20"
                : "bg-[var(--theme-elevated)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface)]"
            }`}
          >
            {ac.label}
          </button>
        ))}
      </div>

      {/* Symbol Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-[var(--theme-accent)]" />
                <h3 className="font-bold text-white text-base">Select Global Market Instrument</h3>
              </div>
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-slate-400 hover:text-white text-sm font-mono"
              >
                ESC / Close
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="Search BTC, NIFTY, AAPL, RELIANCE, EUR/USD, GOLD..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-[var(--theme-accent)]"
              />
            </div>

            {/* Results list */}
            <div className="max-h-72 overflow-y-auto space-y-1.5 font-mono text-xs">
              {(searchData || []).map((inst: any) => (
                <div
                  key={inst.instrument_id}
                  onClick={() => handleSelectSymbol(inst.display_symbol)}
                  className="p-2.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-accent)]/50 cursor-pointer flex items-center justify-between transition"
                >
                  <div>
                    <div className="font-bold text-white text-sm">{inst.display_symbol}</div>
                    <div className="text-[11px] text-slate-400">{inst.exchange} • {inst.asset_class}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      inst.feed_status === "REAL-TIME"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-amber-500/15 text-amber-400"
                    }`}>
                      {inst.feed_status}
                    </span>
                    <span className="text-slate-500 text-xs">Lot: {inst.lot_size}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
