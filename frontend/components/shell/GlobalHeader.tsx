"use client";

import React, { memo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { useGlobalData } from "@/context/GlobalDataContext";
import { useUIStore } from "@/lib/store/useUIStore";
import {
  Terminal,
  Shield,
  Menu,
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
  Bell,
  Search,
} from "lucide-react";
import { TopMarketBar } from "@/components/layout/header/TopMarketBar";
import { ProviderHeaderSelector } from "@/components/providers/ProviderHeaderSelector";

interface GlobalHeaderProps {
  onOpenSearch?: () => void;
  onOpenDetailDrawer?: (type: string, data?: any) => void;
}

export const GlobalHeader = memo(function GlobalHeader({
  onOpenSearch,
}: GlobalHeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
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

  const isKillSwitchActive = Boolean(
    statusData?.system_summary?.kill_switch_active
  );

  return (
    <header className="h-[70px] bg-[#06101B] border-b border-[#10263A] px-4 flex items-center justify-between gap-3 select-none z-30 font-sans shrink-0 sticky top-0">
      {/* ── LEFT SECTION: LOGO + SUBTITLE ──────────────────────── */}
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/"
          className="flex items-center gap-2.5 group hover:opacity-95 transition-opacity"
        >
          <div className="h-8 w-8 rounded-lg bg-[#22D3EE]/10 border border-[#22D3EE]/30 flex items-center justify-center text-[#22D3EE] font-mono font-bold text-sm shadow-sm">
            <Terminal className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[19px] font-bold tracking-tight text-[#F8FAFC] leading-none">
              QUANT<span className="text-[#22D3EE]">.OS</span>
            </span>
            <span className="text-[10px] font-medium tracking-widest text-[#7D8EA5] uppercase leading-tight mt-1">
              ALGO TRADING TERMINAL
            </span>
          </div>
        </Link>
      </div>

      {/* ── CENTER SECTION: COMPACT SEARCH + LIVE MARKET TICKERS ── */}
      <div className="hidden md:flex items-center justify-center flex-1 max-w-4xl min-w-0 mx-2">
        <TopMarketBar onOpenSearch={onOpenSearch} />
      </div>

      {/* ── RIGHT SECTION: PROVIDER SELECTOR + PAPER MODE + USER CONTROL ───────────── */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Compact Multi-Broker / Provider Header Selector */}
        <div className="hidden sm:block">
          <ProviderHeaderSelector />
        </div>

        {/* Paper Mode Control Badge */}
        <div className="h-[38px] px-2.5 sm:px-3.5 flex items-center gap-1.5 sm:gap-2 rounded-lg bg-[#168BFF]/15 border border-[#168BFF]/40 text-[#17C5FF] font-sans text-[11px] sm:text-[12px] font-bold shadow-xs whitespace-nowrap">
          <span className="h-2 w-2 rounded-full bg-[#22D3EE] animate-pulse" />
          <span className="tracking-wide">PAPER MODE</span>
        </div>

        {/* Risk / Killswitch Status */}
        {isKillSwitchActive && (
          <div className="h-[38px] flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg bg-[#FF3B5C]/15 border border-[#FF3B5C]/40 font-mono text-xs font-bold text-[#FF3B5C] whitespace-nowrap">
            <Shield className="h-3.5 w-3.5" />
            <span>HALTED</span>
          </div>
        )}

        {/* Alerts Shortcut */}
        <Link
          href="/alerts"
          prefetch={true}
          className="h-[38px] w-[38px] flex items-center justify-center rounded-lg text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#0A1422] border border-[#12304A] transition-colors cursor-pointer hidden sm:flex"
          title="Terminal Alerts"
        >
          <Bell className="h-4 w-4" />
        </Link>

        {/* Settings Shortcut */}
        <Link
          href="/settings"
          prefetch={true}
          className="h-[38px] w-[38px] flex items-center justify-center rounded-lg text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#0A1422] border border-[#12304A] transition-colors cursor-pointer hidden md:flex"
          title="Terminal Settings"
        >
          <SettingsIcon className="h-4 w-4" />
        </Link>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="h-[38px] flex items-center gap-2 px-2.5 rounded-lg bg-[#0A1422] border border-[#12304A] hover:border-[#168BFF]/50 text-xs text-[#F8FAFC] transition-colors cursor-pointer"
          >
            <div className="h-6 w-6 rounded-md bg-[#168BFF]/20 text-[#22D3EE] flex items-center justify-center font-bold text-xs">
              {user?.username?.[0]?.toUpperCase() || "A"}
            </div>
            <span className="hidden lg:inline font-semibold text-xs text-[#F8FAFC]">
              {user?.username || "admin"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-[#7D8EA5]" />
          </button>

          {userMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-[#0A1422] border border-[#1A2A3F] shadow-2xl py-1 text-xs font-sans z-50 animate-in fade-in zoom-in-95 duration-100"
              onMouseLeave={() => setUserMenuOpen(false)}
            >
              <div className="px-3.5 py-2.5 border-b border-[#122033]">
                <p className="font-semibold text-[#F7FAFC] truncate">{user?.username || "Administrator"}</p>
                <p className="text-[11px] text-[#7C8CA3] truncate font-mono mt-0.5">{user?.email || "admin@quant.os"}</p>
              </div>
              <Link
                href="/settings"
                prefetch={true}
                onClick={() => setUserMenuOpen(false)}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-left text-[#B2C0D2] hover:text-[#F7FAFC] hover:bg-[#101B2D] transition-colors cursor-pointer"
              >
                <SettingsIcon className="h-4 w-4 text-[#22D3EE]" />
                <span>Settings</span>
              </Link>
              <Link
                href="/security"
                prefetch={true}
                onClick={() => setUserMenuOpen(false)}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-left text-[#B2C0D2] hover:text-[#F7FAFC] hover:bg-[#101B2D] transition-colors cursor-pointer"
              >
                <Shield className="h-4 w-4 text-[#00E890]" />
                <span>Security &amp; API Keys</span>
              </Link>
              <div className="my-1 border-t border-[#122033]" />
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-left text-[#FF3B5C] hover:bg-[#FF3B5C]/10 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Menu Toggle */}
        <button
          type="button"
          onClick={() => setMobileCommandSheetOpen(true)}
          className="flex md:hidden items-center justify-center h-[38px] w-[38px] rounded-lg border border-[#12304A] bg-[#0A1422] text-[#7D8EA5] hover:text-[#F8FAFC] transition-colors"
          aria-label="Open mobile navigation menu"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
});
