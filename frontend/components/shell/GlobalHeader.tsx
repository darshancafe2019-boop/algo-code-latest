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
    <header className="h-12 bg-[#070B14] border-b border-[#213047] px-3 sm:px-4 flex items-center justify-between gap-2 select-none z-30 font-sans shrink-0 sticky top-0">
      {/* ── LEFT SECTION: BRAND + ACTIVE SYMBOL ──────────────────────── */}
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/"
          className="flex items-center gap-2 group hover:opacity-90 transition-opacity"
        >
          <div className="h-7 w-7 rounded bg-[#22C7E8]/10 border border-[#22C7E8]/40 flex items-center justify-center text-[#22C7E8] font-mono font-bold text-xs shadow-[0_0_10px_rgba(34,199,232,0.2)]">
            <Terminal className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold font-mono tracking-wider text-[#F4F7FA] group-hover:text-[#22C7E8] transition-colors leading-none">
              QUANT<span className="text-[#22C7E8]">.OS</span>
            </span>
            <span className="text-[9px] font-mono tracking-widest text-[#64748B] uppercase leading-tight mt-0.5 hidden sm:inline">
              INSTITUTIONAL TERMINAL
            </span>
          </div>
        </Link>

        {activeSymbol && (
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0E1624] border border-[#213047] font-mono text-[11px] text-[#F4F7FA]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22C983]" />
            <span className="font-semibold">{activeSymbol}</span>
          </div>
        )}
      </div>

      {/* ── CENTER SECTION: QUICK SEARCH / COMMAND ───────────────────── */}
      <div className="hidden md:flex items-center justify-center flex-1 max-w-xs mx-2">
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-1 bg-[#0E1624] hover:bg-[#121C2C] border border-[#213047] hover:border-[#31445E] rounded-md text-xs font-mono text-[#94A3B8] transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-[#64748B]" />
            <span>Search symbols, orders, bots...</span>
          </span>
          <span className="text-[10px] bg-[#101827] px-1.5 py-0.5 rounded border border-[#213047] text-[#64748B]">
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
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#0E1624] border border-[#213047] hover:border-[#22C7E8] text-[#94A3B8] transition-colors cursor-pointer"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#22C983]" />
            <span>DATA {liveProvidersCount}/{totalProvidersCount} LIVE</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenDetailDrawer?.("risk")}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded border transition-colors cursor-pointer",
              isKillSwitchActive
                ? "bg-[#F2556A]/15 border-[#F2556A]/40 text-[#F2556A]"
                : "bg-[#0E1624] border-[#213047] hover:border-[#22C983] text-[#94A3B8]"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isKillSwitchActive ? "bg-[#F2556A] animate-ping" : "bg-[#22C983]"
              )}
            />
            <span>RISK {isKillSwitchActive ? "HALTED" : "READY"}</span>
          </button>

          <div className="hidden 2xl:flex items-center gap-1 px-2 py-0.5 rounded bg-[#0E1624] border border-[#213047] text-[#94A3B8]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22C983]" />
            <span>OMS READY</span>
          </div>

          <div className="hidden 2xl:flex items-center gap-1 px-2 py-0.5 rounded bg-[#0E1624] border border-[#213047] text-[#64748B]">
            <span>ba_primary</span>
          </div>
        </div>

        {/* P&L Display */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-0.5 rounded bg-[#0E1624] border border-[#213047] font-mono text-xs">
          <span className="text-[10px] text-[#64748B] uppercase">P&L:</span>
          <span
            className={cn(
              "font-bold tabular-nums",
              todaysPnl >= 0 ? "text-[#22C983]" : "text-[#F2556A]"
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
