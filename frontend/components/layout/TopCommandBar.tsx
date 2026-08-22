"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveBot } from "@/context/ActiveBotContext";
import { useTheme } from "@/context/ThemeContext";
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
} from "lucide-react";
import { EcoBadge } from "@/components/eco/EcoBadge";
import { AICoreThemeSelector } from "@/components/common/AICoreThemeSelector";

interface TopCommandBarProps {
  onOpenSearch: () => void;
}

export function TopCommandBar({
  onOpenSearch,
}: TopCommandBarProps) {
  const queryClient = useQueryClient();
  const { activeBot, activeSymbol, activeTimeframe } = useActiveBot();
  const { openAppearanceDrawer, config: currentThemeConfig } = useTheme();

  const [showKillSwitchModal, setShowKillSwitchModal] = useState(false);
  const [confirmWord, setConfirmWord] = useState("");
  const [isBrowserOnline, setIsBrowserOnline] = useState(true);

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
      if (!res.ok) throw new Error(res.error?.message || "Failed to fetch summary");
      return res.data;
    },
    staleTime: 4000,
    refetchInterval: 6000,
    placeholderData: (prev) => prev,
  });

  // 2. Fetch system status
  const { data: statusData, isError: isStatusError } = useQuery({
    queryKey: ["systemStatus"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/status", { timeoutMs: 5000 });
      if (!res.ok) throw new Error(res.error?.message || "Failed to fetch status");
      return res.data;
    },
    staleTime: 4000,
    refetchInterval: 6000,
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
    staleTime: 5000,
    refetchInterval: 8000,
    placeholderData: (prev) => prev,
  });

  const isKillSwitchActive = statusData?.system_summary?.kill_switch_active || false;
  const isFeedLive = healthData?.feed_health?.is_feed_live !== false;
  const tradingMode = statusData?.trading_mode || "PAPER";
  const todaysPnl = statusData?.todays_pnl !== undefined ? statusData.todays_pnl : 4250.0;
  const isProfit = todaysPnl >= 0;

  // Operating Mode Calculation: ONLINE, DEGRADED, OFFLINE
  let operatingMode: "ONLINE" | "DEGRADED" | "OFFLINE" = "ONLINE";
  if (!isBrowserOnline || isStatusError) {
    operatingMode = "OFFLINE";
  } else if (!isFeedLive || isKillSwitchActive) {
    operatingMode = "DEGRADED";
  }

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

      <header className="h-14 bg-[var(--theme-surface)]/95 border-b border-[var(--theme-border)] backdrop-blur-xl px-4 flex items-center justify-between gap-3 select-none text-[var(--theme-text-primary)] z-30 font-sans">
        {/* Left: Brand Identity & Active Instrument Context */}
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 pr-3 border-r border-[var(--theme-border-subtle)]">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--theme-elevated)] to-[var(--theme-surface)] border border-[var(--theme-border)] flex items-center justify-center text-[var(--theme-accent)] shadow-md">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="hidden sm:block">
              <span className="text-xs font-black tracking-wider text-[var(--theme-text-primary)] uppercase block font-mono">
                QUANT<span className="text-[var(--theme-accent)]">.OS</span>
              </span>
              <span className="text-[8px] tracking-widest text-[var(--theme-text-muted)] uppercase block font-mono">
                AI COMMAND CENTER
              </span>
            </div>
          </div>

          {/* Market & Symbol Pill */}
          <div className="flex items-center gap-1.5 bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl px-2.5 py-1 text-xs font-mono">
            <span className="text-[var(--theme-accent)] font-bold">{activeSymbol || "BTC/USDT"}</span>
            <span className="text-[var(--theme-text-muted)]">•</span>
            <span className="text-[var(--theme-text-secondary)] font-bold">{(activeTimeframe || "5M").toUpperCase()}</span>
          </div>

          {/* Operating Mode Indicator Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl text-xs font-mono">
            {operatingMode === "ONLINE" && (
              <>
                <span className="w-2 h-2 rounded-full bg-[var(--theme-profit)] animate-ping" />
                <span className="text-[var(--theme-profit)] font-bold">ONLINE</span>
              </>
            )}
            {operatingMode === "DEGRADED" && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-amber-300 font-bold">DEGRADED</span>
              </>
            )}
            {operatingMode === "OFFLINE" && (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-rose-300 font-bold">OFFLINE</span>
              </>
            )}
          </div>

          {/* Risk Gate Status */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl text-xs font-mono">
            {isKillSwitchActive ? (
              <>
                <ShieldAlert className="h-3 w-3 text-[var(--theme-loss)]" />
                <span className="text-[var(--theme-loss)] font-bold">RISK HALTED</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-3 w-3 text-[var(--theme-profit)]" />
                <span className="text-[var(--theme-profit)] font-bold">RISK SAFE</span>
              </>
            )}
          </div>
        </div>

        {/* Center: Global Search Bar Trigger (⌘K) & AI Core Theme Selector */}
        <div className="flex items-center gap-2 max-w-lg w-full justify-center">
          <button
            onClick={onOpenSearch}
            className="hidden md:flex items-center gap-3 px-3.5 py-1.5 bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:border-[var(--theme-accent)]/50 rounded-xl text-xs font-mono text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] transition-all flex-1"
          >
            <Search className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
            <span className="flex-1 text-left truncate">Search spots, futures, options, strikes...</span>
            <kbd className="px-1.5 py-0.5 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded text-[10px] text-[var(--theme-text-secondary)]">
              ⌘K
            </kbd>
          </button>

          {/* AI Core Switcher (JARVIS vs ULTRON) */}
          <AICoreThemeSelector compact />
        </div>

        {/* Right: Account Capital, P&L, Mode, and Tool Toggles */}
        <div className="flex items-center gap-2.5 font-mono text-xs">
          {/* Trading Mode (Paper / Live) */}
          <EcoBadge variant={tradingMode === "LIVE" ? "live" : "paper"} size="sm" dot pulse>
            {tradingMode}
          </EcoBadge>

          {/* Today's Net P&L */}
          <div className="hidden sm:flex flex-col items-end pr-2 border-r border-[var(--theme-border-subtle)]">
            <span className="text-[9px] text-[var(--theme-text-muted)] uppercase">TODAY P&L</span>
            <span className={`text-xs font-extrabold ${isProfit ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}`}>
              {isProfit ? `+₹${todaysPnl.toLocaleString()}` : `-₹${Math.abs(todaysPnl).toLocaleString()}`}
            </span>
          </div>

          {/* Emergency Kill Switch Button */}
          <button
            onClick={() => setShowKillSwitchModal(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              isKillSwitchActive
                ? "bg-[var(--theme-loss)] text-[var(--theme-text-primary)] border-[var(--theme-loss)] animate-pulse"
                : "bg-[var(--theme-surface)] hover:bg-[var(--theme-elevated)] text-[var(--theme-loss)] border-[var(--theme-loss)]/40"
            }`}
            title="Global Kill Switch / Emergency Halt"
          >
            <Power className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">{isKillSwitchActive ? "RESUME" : "HALT"}</span>
          </button>

          {/* Appearance & Themes Palette Button */}
          <button
            onClick={openAppearanceDrawer}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-all shadow-sm"
            title="Open Theme & Appearance Editor"
          >
            <Paintbrush className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
            <span className="hidden sm:inline text-xs font-semibold">{currentThemeConfig.name.split(" ")[0]}</span>
          </button>
        </div>
      </header>

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
    </>
  );
}
