"use client";

import React, { memo, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { useActiveBot } from "@/context/ActiveBotContext";
import { useGlobalData } from "@/context/GlobalDataContext";
import { useUIStore } from "@/lib/store/useUIStore";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { formatMoney } from "@/lib/formatters";
import {
  Terminal,
  Activity,
  Shield,
  Layers,
  User,
  Bell,
  Search,
  Sliders,
  Menu,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GlobalHeaderProps {
  onOpenSearch?: () => void;
  onOpenDetailDrawer?: (type: string, data?: any) => void;
}

export const GlobalHeader = memo(function GlobalHeader({
  onOpenSearch,
  onOpenDetailDrawer,
}: GlobalHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { activeSymbol } = useActiveBot();
  const {
    portfolioSnapshot,
    riskSummary,
    tradingMode,
    isLive,
    setTradingMode,
    providers,
  } = useGlobalData();
  const { setMobileCommandSheetOpen } = useUIStore();

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Fetch backend status
  const { data: statusData } = useQuery({
    queryKey: ["globalHeaderStatus"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/status", { timeoutMs: 4000 });
      return res.ok ? res.data : null;
    },
    staleTime: 6000,
    refetchInterval: 10000,
  });

  const liveProvidersCount = providers.filter((p) => p.status === "LIVE").length || 2;
  const totalProvidersCount = providers.length || 4;

  const isKillSwitchActive = Boolean(
    riskSummary?.globalKillSwitchActive || statusData?.system_summary?.kill_switch_active
  );

  const todaysPnl = portfolioSnapshot?.dailyPnl ?? statusData?.todays_pnl ?? 0;
  const totalEquity = portfolioSnapshot?.equity ?? statusData?.health?.balance ?? 1000000;

  return (
    <header className="h-12 bg-[#030712] border-b border-[#162238] px-3 sm:px-4 flex items-center justify-between gap-2 select-none z-30 font-sans shrink-0 sticky top-0 backdrop-blur-xl">
      {/* ── LEFT SECTION: BRAND + ACTIVE SYMBOL ──────────────────────── */}
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/"
          className="flex items-center gap-2 group hover:opacity-90 transition-opacity"
        >
          <div className="h-7 w-7 rounded bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs shadow-[0_0_10px_rgba(0,229,255,0.25)]">
            <Terminal className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold font-mono tracking-wider text-slate-100 group-hover:text-cyan-400 transition-colors leading-none">
              QUANT<span className="text-cyan-400">.OS</span>
            </span>
            <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase leading-tight mt-0.5 hidden sm:inline">
              AI TRADING TERMINAL
            </span>
          </div>
        </Link>

        {activeSymbol && (
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#07101F] border border-[#162238] font-mono text-[11px] text-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold">{activeSymbol}</span>
          </div>
        )}
      </div>

      {/* ── CENTER SECTION: QUICK SEARCH / COMMAND ───────────────────── */}
      <div className="hidden md:flex items-center justify-center flex-1 max-w-xs mx-2">
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-1 bg-[#07101F] hover:bg-[#0A1426] border border-[#162238] hover:border-cyan-500/40 rounded-md text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <span>Search symbols, orders, bots...</span>
          </span>
          <span className="text-[10px] bg-[#0A1426] px-1.5 py-0.5 rounded border border-[#162238] text-slate-400">
            ⌘K
          </span>
        </button>
      </div>

      {/* ── RIGHT SECTION: MODE + STATUS + P&L + USER ────────────────── */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Mode Selector / Badge */}
        <div className="flex items-center">
          <ModeBadge mode={tradingMode} size="sm" />
        </div>

        {/* Status Pills */}
        <div className="hidden xl:flex items-center gap-1.5 font-mono text-[10px]">
          <button
            type="button"
            onClick={() => onOpenDetailDrawer?.("providers")}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#07101F] border border-[#162238] hover:border-cyan-500/40 text-slate-300 transition-colors cursor-pointer"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>DATA {liveProvidersCount}/{totalProvidersCount} LIVE</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenDetailDrawer?.("risk")}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded border transition-colors cursor-pointer",
              isKillSwitchActive
                ? "bg-rose-500/20 border-rose-500/50 text-rose-300"
                : "bg-[#07101F] border-[#162238] hover:border-emerald-500/40 text-slate-300"
            )}
          >
            <Shield className={cn("h-3 w-3", isKillSwitchActive ? "text-rose-400" : "text-emerald-400")} />
            <span>{isKillSwitchActive ? "KILL SWITCH" : "RISK GATE"}</span>
          </button>
        </div>

        {/* P&L Display */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#07101F] border border-[#162238] font-mono text-xs">
          <span className="text-[10px] text-slate-500 uppercase">P&L:</span>
          <span
            className={cn(
              "font-bold tabular-nums",
              todaysPnl >= 0 ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {todaysPnl >= 0 ? `+₹${Math.round(todaysPnl).toLocaleString()}` : `-₹${Math.round(Math.abs(todaysPnl)).toLocaleString()}`}
          </span>
        </div>

        {/* Settings Shortcut */}
        <button
          type="button"
          onClick={() => router.push("/settings")}
          className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#F4F7FA] hover:bg-[#121C2C] border border-transparent hover:border-[#213047] transition-colors cursor-pointer hidden sm:flex"
          title="System Settings"
        >
          <SettingsIcon className="h-4 w-4" />
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-1.5 p-1 rounded-md bg-[#0E1624] border border-[#213047] hover:border-[#31445E] text-xs font-mono text-[#F4F7FA] transition-colors cursor-pointer"
          >
            <div className="h-5 w-5 rounded bg-[#22C7E8]/20 text-[#22C7E8] flex items-center justify-center font-bold text-[10px]">
              {user?.username?.[0]?.toUpperCase() || "A"}
            </div>
            <span className="hidden md:inline text-[11px] max-w-[80px] truncate">
              {user?.username || "Admin"}
            </span>
            <ChevronDown className="h-3 w-3 text-[#64748B]" />
          </button>

          {userMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-48 rounded-lg bg-[#0E1624] border border-[#213047] shadow-xl py-1 text-xs font-mono z-50 animate-in fade-in zoom-in-95 duration-100"
              onMouseLeave={() => setUserMenuOpen(false)}
            >
              <div className="px-3 py-2 border-b border-[#213047]/60">
                <p className="font-semibold text-[#F4F7FA] truncate">{user?.username || "Quant Trader"}</p>
                <p className="text-[10px] text-[#64748B] truncate">{user?.email || "admin@quant.os"}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  router.push("/settings");
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#121C2C] transition-colors"
              >
                <SettingsIcon className="h-3.5 w-3.5 text-[#22C7E8]" />
                <span>Settings</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  router.push("/security");
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#121C2C] transition-colors"
              >
                <Shield className="h-3.5 w-3.5 text-[#22C983]" />
                <span>Security Center</span>
              </button>
              <div className="my-1 border-t border-[#213047]/60" />
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  logout?.();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[#F2556A] hover:bg-[#F2556A]/10 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Menu */}
        <button
          type="button"
          onClick={() => setMobileCommandSheetOpen(true)}
          className="flex lg:hidden items-center justify-center p-1.5 rounded-md border border-[#213047] bg-[#0E1624] text-slate-300 hover:text-white transition-colors"
          aria-label="Open mobile navigation"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
});
