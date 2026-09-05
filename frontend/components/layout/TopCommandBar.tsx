"use client";

import React, { useState, useEffect, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useActiveBot } from "@/context/ActiveBotContext";
import { useGlobalData } from "@/context/GlobalDataContext";
import { useUIStore } from "@/lib/store/useUIStore";
import { AlertTriangle, WifiOff, Menu } from "lucide-react";

import { HeaderBrand } from "./header/HeaderBrand";
import { HeaderSymbolSelector } from "./header/HeaderSymbolSelector";
import { HeaderTimeframeSelector } from "./header/HeaderTimeframeSelector";
import { HeaderConnectionStatus } from "./header/HeaderConnectionStatus";
import { HeaderRiskStatus } from "./header/HeaderRiskStatus";
import { HeaderGlobalSearch } from "./header/HeaderGlobalSearch";
import { HeaderAICopilotButton } from "./header/HeaderAICopilotButton";
import { HeaderOrderButton } from "./header/HeaderOrderButton";
import { HeaderBotControl } from "./header/HeaderBotControl";
import { HeaderTradingMode } from "./header/HeaderTradingMode";
import { HeaderPnLDisplay } from "./header/HeaderPnLDisplay";
import { HeaderHaltButton } from "./header/HeaderHaltButton";
import { HeaderUserMenu } from "./header/HeaderUserMenu";

import { MarketAnalystDrawer } from "@/components/analyst/MarketAnalystDrawer";
import { QuickMarketSwitcherModal } from "@/components/layout/QuickMarketSwitcherModal";
import { UniversalMarketAICopilot } from "@/components/ai/UniversalMarketAICopilot";

interface TopCommandBarProps {
  onOpenSearch?: () => void;
}

export const TopCommandBar = memo(function TopCommandBar({
  onOpenSearch,
}: TopCommandBarProps) {
  const { activeSymbol } = useActiveBot();
  const { riskSummary, tradingMode: globalTradingMode } = useGlobalData();
  const { setMobileCommandSheetOpen } = useUIStore();

  const [isBrowserOnline, setIsBrowserOnline] = useState(true);
  const [isMarketAnalystOpen, setIsMarketAnalystOpen] = useState(false);

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

  // Fetch lightweight system status (staleTime: 6s, placeholderData: prev)
  const { data: statusData } = useQuery({
    queryKey: ["systemStatus"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/status", { timeoutMs: 5000 });
      if (!res.ok) return {};
      return res.data;
    },
    staleTime: 6000,
    refetchInterval: isBrowserOnline ? 8000 : 25000,
    placeholderData: (prev) => prev,
  });

  const isKillSwitchActive = Boolean(
    riskSummary?.globalKillSwitchActive || statusData?.system_summary?.kill_switch_active
  );
  const tradingMode: "PAPER" | "LIVE" = (globalTradingMode || statusData?.trading_mode || "PAPER") as "PAPER" | "LIVE";

  return (
    <>
      {/* Operator Kill Switch Banner (Shown ONLY when explicitly armed by operator) */}
      {isKillSwitchActive && (
        <div
          id="kill-switch-active-banner"
          className="bg-rose-950/90 border-b border-rose-800/80 px-4 py-1 text-center text-xs font-mono text-rose-200 flex items-center justify-center gap-2 select-none z-40"
        >
          <AlertTriangle className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
          <span>
            <strong>GLOBAL KILL SWITCH ACTIVE:</strong> Emergency halt armed by operator. New order execution paused.
          </span>
        </div>
      )}

      {/* UI Syncing Notice (Non-blocking: informs trader without halting engine) */}
      {!isBrowserOnline && (
        <div
          id="ui-syncing-banner"
          className="bg-slate-900/90 border-b border-slate-700/80 px-4 py-1 text-center text-xs font-mono text-slate-300 flex items-center justify-center gap-2 select-none z-40"
        >
          <WifiOff className="h-3.5 w-3.5 text-amber-400" />
          <span>
            <strong>UI RECONNECTING:</strong> Re-establishing dashboard stream. Background trading engine continues unaffected.
          </span>
        </div>
      )}

      {/* Institutional Single-Line Header */}
      <header className="h-12 bg-[var(--theme-surface)]/95 border-b border-[var(--theme-border)] backdrop-blur-xl px-3 sm:px-4 flex items-center justify-between gap-2 select-none text-[var(--theme-text-primary)] z-30 font-sans shadow-xs">
        {/* Left Section: Brand, Symbol, Timeframe, Connection, Risk */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <HeaderBrand />
          <HeaderSymbolSelector />
          <HeaderTimeframeSelector />
          <div className="hidden sm:block">
            <HeaderConnectionStatus />
          </div>
          <div className="hidden md:block">
            <HeaderRiskStatus isKillSwitchActive={isKillSwitchActive} />
          </div>
        </div>

        {/* Center Section: Intelligent Global Search + AI Copilot Trigger */}
        <div className="hidden md:flex items-center justify-center gap-2 flex-1 max-w-sm mx-2">
          <HeaderGlobalSearch onOpenSearch={onOpenSearch} />
          <HeaderAICopilotButton />
        </div>

        {/* Right Section: Order, Bot, Trading Mode, P&L, Safety Halt, User Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="hidden sm:block">
            <HeaderOrderButton />
          </div>
          <div className="hidden lg:block">
            <HeaderBotControl />
          </div>
          <HeaderTradingMode tradingMode={tradingMode} />
          <HeaderPnLDisplay
            statusDataPnl={statusData?.todays_pnl}
            statusDataEquity={statusData?.health?.balance}
          />
          <HeaderHaltButton isKillSwitchActive={isKillSwitchActive} />
          <HeaderUserMenu onOpenMarketAnalyst={() => setIsMarketAnalystOpen(true)} />

          {/* Mobile Hamburger Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileCommandSheetOpen(true)}
            className="flex md:hidden items-center justify-center p-1.5 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-elevated)] text-slate-300 hover:text-white transition-colors"
            aria-label="Open mobile navigation menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Embedded Global Modals & Drawers */}
      <MarketAnalystDrawer
        isOpen={isMarketAnalystOpen}
        onClose={() => setIsMarketAnalystOpen(false)}
        symbol={activeSymbol || "BTC/USDT"}
        assetClass="crypto"
        exchange="binance"
      />

      <QuickMarketSwitcherModal />
      <UniversalMarketAICopilot />
    </>
  );
});
