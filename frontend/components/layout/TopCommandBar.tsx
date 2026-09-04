"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveBot } from "@/context/ActiveBotContext";
import { useTheme } from "@/context/ThemeContext";
import { useGlobalData } from "@/context/GlobalDataContext";
import { executeCommand } from "@/lib/commandClient";
import { apiClient } from "@/lib/apiClient";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Sparkles,
  Power,
  Paintbrush,
  Wifi,
  WifiOff,
  AlertTriangle,
  Lock,
  BrainCircuit,
  User,
  LogOut,
  KeyRound,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { formatMoney, formatPnL } from "@/lib/formatters";
import { EcoBadge } from "@/components/eco/EcoBadge";
import { MarketAnalystDrawer } from "@/components/analyst/MarketAnalystDrawer";
import { QuickMarketSwitcherModal } from "@/components/layout/QuickMarketSwitcherModal";
import { UniversalMarketAICopilot } from "@/components/ai/UniversalMarketAICopilot";
import { useUIStore } from "@/lib/store/useUIStore";

interface TopCommandBarProps {
  onOpenSearch?: () => void;
}

export function TopCommandBar({
  onOpenSearch,
}: TopCommandBarProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeBot, activeSymbol, activeTimeframe } = useActiveBot();
  const { openAppearanceDrawer, config: currentThemeConfig } = useTheme();
  const { portfolioSnapshot, riskSummary, tradingMode: globalTradingMode, reconciliationStatus } = useGlobalData();
  const { setMarketSwitcherOpen, setAICopilotOpen } = useUIStore();
  const { user, session, logout, lockTerminal } = useAuth();

  const [showKillSwitchModal, setShowKillSwitchModal] = useState(false);
  const [confirmWord, setConfirmWord] = useState("");
  const [isBrowserOnline, setIsBrowserOnline] = useState(true);
  const [isMarketAnalystOpen, setIsMarketAnalystOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("quantos:offline", handleOffline);
    window.addEventListener("quantos:online", handleOnline);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsBrowserOnline(false);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("quantos:offline", handleOffline);
      window.removeEventListener("quantos:online", handleOnline);
    };
  }, []);

  // 1. Fetch summary metrics
  const { data: summaryData } = useQuery({
    queryKey: ["botsSummary"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/bots/summary", { timeoutMs: 5000 });
      if (!res.ok) return {};
      return res.data;
    },
    staleTime: 6000,
    refetchInterval: isBrowserOnline ? 8000 : 20000,
    placeholderData: (prev) => prev,
  });

  // 2. Fetch system status
  const { data: statusData, isError: isStatusError } = useQuery({
    queryKey: ["systemStatus"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/status", { timeoutMs: 5000 });
      if (!res.ok) return {};
      return res.data;
    },
    staleTime: 6000,
    refetchInterval: isBrowserOnline ? 8000 : 20000,
    placeholderData: (prev) => prev,
  });

  // 3. Fetch feed health
  const { data: healthData } = useQuery({
    queryKey: ["marketHealthTelemetry"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/market-health", { timeoutMs: 5000 });
      if (!res.ok) return null;
      return res.data;
    },
    staleTime: 6000,
    refetchInterval: isBrowserOnline ? 10000 : 25000,
    placeholderData: (prev) => prev,
  });

  const isKillSwitchActive = riskSummary?.globalKillSwitchActive || statusData?.system_summary?.kill_switch_active || false;
  const isFeedLive = healthData?.feed_health?.is_feed_live !== false;
  const tradingMode = globalTradingMode || statusData?.trading_mode || "PAPER";
  const todaysPnl = portfolioSnapshot?.dailyPnl ?? (statusData?.todays_pnl !== undefined ? Number(statusData.todays_pnl) : 0.0);
  const totalEquity = portfolioSnapshot?.equity ?? (statusData?.health?.balance !== undefined ? Number(statusData.health.balance) : 0.0);
  const isProfit = todaysPnl >= 0;

  // Operating Mode Calculation: ONLINE, DEGRADED, OFFLINE
  let operatingMode: "ONLINE" | "DEGRADED" | "OFFLINE" = "ONLINE";
  if (!isBrowserOnline || isStatusError) {
    operatingMode = "OFFLINE";
  } else if (!isFeedLive || isKillSwitchActive) {
    operatingMode = "DEGRADED";
  }

  // Mode Switch States & Mutation
  const [showModeModal, setShowModeModal] = useState(false);
  const [liveConfirmCheck1, setLiveConfirmCheck1] = useState(false);
  const [liveConfirmCheck2, setLiveConfirmCheck2] = useState(false);
  const [modeError, setModeError] = useState<string | null>(null);

  const modeMutation = useMutation({
    mutationFn: async (targetMode: "PAPER" | "LIVE") => {
      setModeError(null);
      if (targetMode === "LIVE") {
        const res = await apiClient.post<any>("/api/live-trading/arm", {
          user_confirm: true,
          user_ack_risk: true,
        });
        if (!res.ok) throw new Error(res.error?.message || "Failed to arm live trading");
        return res.data;
      } else {
        const res = await apiClient.post<any>("/api/live-trading/disarm", {});
        if (!res.ok) throw new Error(res.error?.message || "Failed to disarm live trading");
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemStatus"] });
      queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
      queryClient.invalidateQueries({ queryKey: ["terminalStatus"] });
      setShowModeModal(false);
      setLiveConfirmCheck1(false);
      setLiveConfirmCheck2(false);
    },
    onError: (err: any) => {
      setModeError(err.message || "Failed to toggle trading mode");
    },
  });

  // Kill Switch Mutation
  const killSwitchMutation = useMutation({
    mutationFn: async () => {
      if (isKillSwitchActive) {
        return await executeCommand("DEACTIVATE_KILL_SWITCH", null, {}, queryClient);
      } else {
        return await executeCommand("ACTIVATE_KILL_SWITCH", null, { reason: "Top Bar Emergency Halt" }, queryClient);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
      queryClient.invalidateQueries({ queryKey: ["systemStatus"] });
      queryClient.invalidateQueries({ queryKey: ["botsList"] });
      setShowKillSwitchModal(false);
      setConfirmWord("");
    },
  });

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  return (
    <>
      {/* Offline / Degraded Safe Banner */}
      {operatingMode === "OFFLINE" && (
        <div id="offline-readonly-banner" className="bg-rose-950/90 border-b border-rose-800/80 px-4 py-1 text-center text-xs font-mono text-rose-200 flex items-center justify-center gap-2 select-none z-40">
          <WifiOff className="h-3.5 w-3.5" />
          <span><strong>OFFLINE — READ ONLY:</strong> Network disconnected. Live execution blocked. Viewing cached local state.</span>
        </div>
      )}
      {operatingMode === "DEGRADED" && (
        <div id="degraded-mode-banner" className="bg-amber-950/80 border-b border-amber-800/80 px-4 py-1 text-center text-xs font-mono text-amber-200 flex items-center justify-center gap-2 select-none z-40">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span><strong>DEGRADED MODE:</strong> {isKillSwitchActive ? "Emergency halt active" : "Market feed stale"}. Orders restricted.</span>
        </div>
      )}

      <header className="h-14 bg-[var(--theme-surface)]/90 border-b border-[var(--theme-border)] backdrop-blur-xl px-4 flex items-center justify-between gap-3 select-none text-[var(--theme-text-primary)] z-30 font-sans shadow-[0_4px_20px_-4px_rgba(0,0,0,0.35)]">
        {/* Left: Brand Identity & Active Instrument Context */}
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5 pr-3 border-r border-[var(--theme-border-subtle)]">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500/20 via-blue-600/10 to-transparent border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.25)]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="hidden sm:block">
              <span className="text-xs font-black tracking-wider text-slate-100 uppercase block font-mono">
                ALPHA<span className="text-sky-400">.ALGO</span>
              </span>
              <span className="text-[8px] tracking-widest text-slate-400 uppercase block font-mono">
                QUANT TERMINAL
              </span>
            </div>
          </div>

          {/* Market & Symbol Pill (Interactive Switcher) */}
          <button
            type="button"
            onClick={() => setMarketSwitcherOpen(true)}
            className="flex items-center gap-2 bg-[var(--theme-elevated)]/80 hover:bg-[var(--theme-elevated)] border border-[var(--theme-border)] hover:border-sky-500/40 rounded-xl px-3 py-1.5 text-xs font-mono transition-all cursor-pointer group shadow-sm active:scale-95"
            title="Click to Switch Market Universe"
          >
            <span className="text-sky-400 font-bold group-hover:underline">
              {(() => {
                const sym = activeSymbol || "BTC/USDT";
                if (sym === "BTC-OPTIONS") return "BTC Options";
                if (sym === "ETH-OPTIONS") return "ETH Options";
                if (sym === "SOL-OPTIONS") return "SOL Options";
                if (sym.includes("-OPTIONS")) return sym.replace("-OPTIONS", " Options");
                if (sym === "NIFTY") return "NIFTY 50";
                if (sym === "BANKNIFTY") return "Bank Nifty";
                return sym;
              })()}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300 font-bold">{(activeTimeframe || "5M").toUpperCase()}</span>
          </button>

          {/* Operating Mode Indicator Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[var(--theme-elevated)]/80 border border-[var(--theme-border)] rounded-xl text-xs font-mono shadow-sm">
            {operatingMode === "ONLINE" && (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-bold tracking-wide">ONLINE</span>
              </>
            )}
            {operatingMode === "DEGRADED" && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-amber-300 font-bold tracking-wide">DEGRADED</span>
              </>
            )}
            {operatingMode === "OFFLINE" && (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-rose-300 font-bold tracking-wide">OFFLINE</span>
              </>
            )}
          </div>

          {/* Risk Gate Status */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-[var(--theme-elevated)]/80 border border-[var(--theme-border)] rounded-xl text-xs font-mono shadow-sm">
            {isKillSwitchActive ? (
              <>
                <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                <span className="text-rose-400 font-bold tracking-wide">RISK HALTED</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold tracking-wide">RISK SAFE</span>
              </>
            )}
          </div>
        </div>

        {/* Center: Global Search Bar Trigger (⌘K) */}
        <div className="flex items-center max-w-md w-full justify-center gap-2">
          <button
            onClick={onOpenSearch}
            className="hidden md:flex items-center gap-3 px-3.5 py-1.5 bg-[var(--theme-elevated)]/60 hover:bg-[var(--theme-elevated)] border border-[var(--theme-border)] hover:border-sky-500/40 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200 transition-all flex-1 shadow-inner"
          >
            <Search className="h-3.5 w-3.5 text-sky-400" />
            <span className="flex-1 text-left truncate text-slate-400">Search spots, futures, options, strikes...</span>
            <kbd className="px-1.5 py-0.5 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded text-[10px] text-slate-400 font-semibold shadow-xs">
              ⌘K
            </kbd>
          </button>

          {/* AI Copilot Global Header Button */}
          <button
            type="button"
            onClick={() => setAICopilotOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 text-purple-300 border border-purple-500/40 font-bold font-mono transition-all shadow-[0_0_14px_rgba(168,85,247,0.2)] active:scale-95 group shrink-0"
            title="Open Universal AI Market Copilot (⌘J)"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-400 group-hover:rotate-12 transition-transform animate-pulse" />
            <span className="hidden sm:inline">AI COPILOT</span>
            <kbd className="hidden lg:inline px-1 py-0.2 bg-purple-950/60 border border-purple-500/30 rounded text-[9px] text-purple-300">
              ⌘J
            </kbd>
          </button>
        </div>

        {/* Right: Quick Action Buttons & Emergency Halt */}
        <div className="flex items-center gap-2.5 font-mono text-xs">
          {/* Quick Order Trigger */}
          <button
            type="button"
            onClick={() => {
              const { setOrderPlacementModalOpen, setQuickOrderSide } = useUIStore.getState();
              setQuickOrderSide("BUY");
              setOrderPlacementModalOpen(true);
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 font-bold transition-all shadow-[0_0_12px_-2px_rgba(16,185,129,0.25)] active:scale-95 cursor-pointer"
            title="Open Quick Order Router (Buy / Long)"
          >
            <span>+ ORDER</span>
          </button>

          {/* Quick Bot Deploy Trigger */}
          <button
            type="button"
            onClick={() => {
              const { setCreateBotModalOpen } = useUIStore.getState();
              setCreateBotModalOpen(true);
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 hover:border-sky-500/50 font-bold transition-all shadow-[0_0_12px_-2px_rgba(56,189,248,0.25)] active:scale-95 cursor-pointer"
            title="Deploy New Quant Bot Instance"
          >
            <span>+ BOT</span>
          </button>

          {/* Trading Mode (Paper / Live) Toggle Trigger */}
          <button
            type="button"
            onClick={() => setShowModeModal(true)}
            className="cursor-pointer focus:outline-none focus:ring-1 focus:ring-sky-500 rounded-lg"
            title="Click to manage live execution / paper mode gate"
          >
            <EcoBadge variant={tradingMode === "LIVE" ? "live" : "paper"} size="sm" dot pulse>
              {tradingMode}
            </EcoBadge>
          </button>

          {/* Account Equity & Today's Net P&L (Click opens P&L Center) */}
          <Link
            href="/pnl"
            className="hidden sm:flex flex-col items-end pr-2 border-r border-[var(--theme-border-subtle)] hover:opacity-85 transition-opacity cursor-pointer"
            title="View P&L & Portfolio Performance Center"
          >
            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-medium">EQUITY / TODAY</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-100">
                {formatMoney(totalEquity, "$")}
              </span>
              <span className={`text-xs font-extrabold ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
                {formatPnL(todaysPnl, "$").formatted}
              </span>
            </div>
          </Link>

          {/* Emergency Kill Switch Button (ALWAYS VISIBLE) */}
          <button
            onClick={() => setShowKillSwitchModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm cursor-pointer ${
              isKillSwitchActive
                ? "bg-rose-500 text-white border-rose-400 animate-pulse shadow-[0_0_16px_rgba(244,63,94,0.5)]"
                : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30 hover:border-rose-500/50 shadow-[0_0_12px_-2px_rgba(244,63,94,0.2)]"
            }`}
            title="Global Kill Switch / Emergency Halt"
          >
            <Power className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">{isKillSwitchActive ? "RESUME" : "HALT"}</span>
          </button>

          {/* Secondary Actions: More Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="flex items-center justify-center min-w-[36px] min-h-[36px] p-1.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-all shadow-sm cursor-pointer"
              title="More Actions & Tools"
            >
              <span className="text-xs font-bold tracking-widest leading-none">•••</span>
            </button>

            {isMoreMenuOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-2 shadow-2xl w-56 flex flex-col gap-1 text-xs">
                {/* Start All Bots */}
                <button
                  onClick={async () => {
                    await apiClient.post("/api/bots/start-all", {});
                    queryClient.invalidateQueries({ queryKey: ["botsList"] });
                    queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
                    setIsMoreMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-emerald-400 hover:bg-emerald-500/10 font-semibold transition-colors text-left"
                >
                  <span>▶</span>
                  <span>Start All Bots</span>
                </button>

                {/* Pause All Bots */}
                <button
                  onClick={async () => {
                    await apiClient.post("/api/bots/pause-all", {});
                    queryClient.invalidateQueries({ queryKey: ["botsList"] });
                    queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
                    setIsMoreMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-amber-400 hover:bg-amber-500/10 font-semibold transition-colors text-left"
                >
                  <span>⏸</span>
                  <span>Pause All Bots</span>
                </button>

                {/* Market Analyst Copilot */}
                <button
                  onClick={() => {
                    setIsMarketAnalystOpen(true);
                    setIsMoreMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-emerald-300 hover:bg-emerald-500/10 font-semibold transition-colors text-left border-t border-[var(--theme-border-subtle)]"
                >
                  <BrainCircuit className="h-4 w-4 text-emerald-400" />
                  <span>Market Analyst Copilot</span>
                </button>

                {/* Theme Editor */}
                <button
                  onClick={() => {
                    openAppearanceDrawer();
                    setIsMoreMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-elevated)] font-semibold transition-colors text-left border-t border-[var(--theme-border-subtle)]"
                >
                  <Paintbrush className="h-4 w-4 text-[var(--theme-accent)]" />
                  <span>Themes & Appearance</span>
                </button>
              </div>
            )}
          </div>

          {/* Operator Profile & Session Controls */}
          <div className="relative">
            <button
              onClick={() => {
                setIsUserMenuOpen(!isUserMenuOpen);
                setIsMoreMenuOpen(false);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-primary)] transition-all shadow-sm cursor-pointer"
              title="Operator Identity & Security Controls"
            >
              <div className="h-6 w-6 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center border border-cyan-500/30">
                {user?.username?.substring(0, 2).toUpperCase() || "AD"}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-mono font-bold text-[var(--theme-text-primary)] leading-tight">
                  {user?.username || "admin"}
                </span>
                <span className="text-[10px] font-mono text-cyan-400 font-medium leading-none">
                  {user?.role || "ADMIN"}
                </span>
              </div>
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-3 shadow-2xl w-64 flex flex-col gap-2.5 text-xs font-mono">
                {/* User Summary */}
                <div className="p-2.5 bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[var(--theme-text-primary)]">
                      {user?.username || "admin"}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                      {user?.role || "ADMIN"}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--theme-text-secondary)] truncate">
                    {user?.email || "admin@algotrading.local"}
                  </p>
                  <div className="flex items-center gap-1.5 pt-1 text-[10px] text-emerald-400 font-sans">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Cryptographic Session Active</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                  {/* Lock Terminal */}
                  <button
                    onClick={() => {
                      lockTerminal();
                      setIsUserMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-amber-400 hover:bg-amber-500/10 font-semibold transition-colors text-left"
                  >
                    <Lock className="h-4 w-4" />
                    <span>Lock Terminal</span>
                  </button>

                  {/* Security Settings Link */}
                  <Link
                    href="/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-elevated)] font-semibold transition-colors text-left"
                  >
                    <KeyRound className="h-4 w-4 text-cyan-400" />
                    <span>Account & Security Center</span>
                  </Link>

                  {/* Sign Out */}
                  <button
                    onClick={async () => {
                      setIsUserMenuOpen(false);
                      await logout();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 font-semibold transition-colors text-left border-t border-[var(--theme-border-subtle)]"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mode Switch Modal */}
      {showModeModal && (
        <div className="fixed inset-0 z-50 bg-[var(--theme-bg)]/80 backdrop-blur-md flex items-center justify-center p-4 font-sans">
          <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-[var(--theme-text-primary)]">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl border ${
                tradingMode === "LIVE" 
                  ? "bg-[var(--theme-profit)]/15 border-[var(--theme-profit)]/40 text-[var(--theme-profit)]" 
                  : "bg-amber-500/15 border-amber-500/40 text-amber-400"
              }`}>
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--theme-text-primary)]">
                  {tradingMode === "LIVE" ? "Revert to PAPER Simulation Mode" : "Arm Real LIVE Trading Gate"}
                </h3>
                <p className="text-xs text-[var(--theme-text-secondary)]">
                  {tradingMode === "LIVE"
                    ? "Safe simulated orders with 0 risk to real broker capital."
                    : "Authorizes real order execution against configured exchange accounts."}
                </p>
              </div>
            </div>

            {modeError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-mono text-rose-300">
                {modeError}
              </div>
            )}

            {tradingMode === "PAPER" ? (
              <div className="space-y-3 pt-2">
                <div className="p-3 bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl text-xs space-y-2 text-[var(--theme-text-secondary)]">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={liveConfirmCheck1}
                      onChange={(e) => setLiveConfirmCheck1(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-[11px] leading-tight">
                      I understand that LIVE trading places real market orders using real funds.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={liveConfirmCheck2}
                      onChange={(e) => setLiveConfirmCheck2(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-[11px] leading-tight">
                      I have verified my exchange API credentials, leverage limits, and risk stops.
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowModeModal(false)}
                    className="px-4 py-2 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => modeMutation.mutate("LIVE")}
                    disabled={!liveConfirmCheck1 || !liveConfirmCheck2 || modeMutation.isPending}
                    className={`px-5 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                      liveConfirmCheck1 && liveConfirmCheck2
                        ? "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    {modeMutation.isPending ? "Arming..." : "ARM LIVE TRADING"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-[var(--theme-text-secondary)]">
                  Switching back to PAPER mode will immediately disarm live execution and safely route all bot signals to paper simulations.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowModeModal(false)}
                    className="px-4 py-2 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => modeMutation.mutate("PAPER")}
                    disabled={modeMutation.isPending}
                    className="px-5 py-2 rounded-xl text-xs font-bold font-mono bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/30 transition-all"
                  >
                    {modeMutation.isPending ? "Disarming..." : "Switch to PAPER Mode"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Kill Switch Modal */}
      {showKillSwitchModal && (
        <div className="fixed inset-0 z-50 bg-[var(--theme-bg)]/80 backdrop-blur-md flex items-center justify-center p-4 font-sans">
          <div className="bg-[var(--theme-surface)] border border-[var(--theme-loss)]/60 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-[var(--theme-text-primary)]">
            <div className="flex items-center gap-3 text-[var(--theme-loss)]">
              <div className="p-3 bg-[var(--theme-loss)]/15 border border-[var(--theme-loss)]/40 rounded-2xl">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--theme-text-primary)]">
                  {isKillSwitchActive ? "Resume Trading Systems?" : "EMERGENCY KILL SWITCH"}
                </h3>
                <p className="text-xs text-[var(--theme-text-secondary)]">
                  {isKillSwitchActive
                    ? "Re-enable order routing and bot signals."
                    : "Instantly halt all execution and cancel open orders."}
                </p>
              </div>
            </div>

            <div className="p-3 bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-2xl text-xs space-y-1 font-mono">
              <div className="flex justify-between text-[var(--theme-text-secondary)]">
                <span>Active Bots:</span>
                <strong className="text-[var(--theme-text-primary)]">{summaryData?.metrics?.running_bots || 0}</strong>
              </div>
              <div className="flex justify-between text-[var(--theme-text-secondary)]">
                <span>Open Trades:</span>
                <strong className="text-[var(--theme-text-primary)]">{summaryData?.metrics?.open_trades || 0}</strong>
              </div>
              <div className="flex justify-between text-[var(--theme-text-secondary)]">
                <span>Execution Mode:</span>
                <strong className="text-[var(--theme-accent)]">{tradingMode}</strong>
              </div>
            </div>

            <p className="text-xs text-[var(--theme-text-muted)]">
              Type <span className="text-[var(--theme-loss)] font-bold font-mono">{isKillSwitchActive ? "RESUME" : "HALT"}</span> below to confirm action.
            </p>

            <input
              type="text"
              value={confirmWord}
              onChange={(e) => setConfirmWord(e.target.value.toUpperCase())}
              placeholder={isKillSwitchActive ? "Type RESUME" : "Type HALT"}
              className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] focus:border-[var(--theme-loss)] rounded-xl px-4 py-2 text-sm font-mono text-[var(--theme-text-primary)] outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowKillSwitchModal(false);
                  setConfirmWord("");
                }}
                className="px-4 py-2 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => killSwitchMutation.mutate()}
                disabled={confirmWord !== (isKillSwitchActive ? "RESUME" : "HALT") || killSwitchMutation.isPending}
                className={`px-5 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                  confirmWord === (isKillSwitchActive ? "RESUME" : "HALT")
                    ? "bg-[var(--theme-loss)] hover:bg-[var(--theme-loss)]/90 text-white shadow-lg"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                {killSwitchMutation.isPending ? "Executing..." : isKillSwitchActive ? "Confirm Resume" : "Confirm Emergency Halt"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Market Analyst Copilot Drawer */}
      <MarketAnalystDrawer
        isOpen={isMarketAnalystOpen}
        onClose={() => setIsMarketAnalystOpen(false)}
        symbol={activeSymbol || "BTC/USDT"}
        assetClass="crypto"
        exchange="binance"
      />

      {/* Universal AI Market Copilot & Quick Market Switcher */}
      <QuickMarketSwitcherModal />
      <UniversalMarketAICopilot />
    </>
  );
}
