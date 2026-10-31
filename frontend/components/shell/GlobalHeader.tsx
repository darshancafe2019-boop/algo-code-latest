"use client";

import React, { memo, useState, useEffect } from "react";
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
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format requirement: Friday, 30 Oct 2026 | 09:17:30 PM IST
      const dateStr = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        weekday: "long",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(now);
      const timeStr = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(now);
      setCurrentTime(`${dateStr} | ${timeStr} IST`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch backend status
  const { data: statusData } = useQuery({
    queryKey: ["systemStatus"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/status", { timeoutMs: 10000 });
      return res.ok ? res.data : null;
    },
    staleTime: 15000,
    refetchInterval: 20000,
  });

  const isKillSwitchActive = Boolean(
    statusData?.system_summary?.kill_switch_active
  );

  return (
    <header className="h-[60px] bg-[#06101B] border-b border-[#10263A] px-4 flex items-center justify-between gap-3 select-none z-30 font-sans shrink-0 sticky top-0">
      {/* ── 1. LOGO & BRANDING ────────────────────────────────────── */}
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/"
          className="flex items-center gap-2.5 group hover:opacity-95 transition-opacity"
        >
          <div className="h-8 w-8 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF]/40 flex items-center justify-center text-[#00F0FF] font-mono font-bold text-sm shadow-xs shadow-[#00F0FF]/20">
            <Terminal className="h-4 w-4 text-[#00F0FF]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-black tracking-tight text-[#F8FAFC] whitespace-nowrap">
              ASHISH <span className="text-[#00F0FF]">PARADKAR</span>
            </span>
            <span className="hidden sm:inline-block text-[9px] font-mono font-extrabold tracking-widest px-1.5 py-0.5 rounded bg-[#168BFF]/20 text-[#22D3EE] border border-[#168BFF]/40 uppercase">
              ALGO BOT
            </span>
          </div>
        </Link>
      </div>

      {/* ── 2. GLOBAL SEARCH ────────── */}
      <div className="hidden md:flex items-center gap-2.5 flex-1 max-w-2xl mx-2 min-w-0">
        <button
          type="button"
          onClick={onOpenSearch}
          className="h-[34px] w-full max-w-xs flex items-center justify-between px-3 rounded-lg bg-[#0A1422] border border-[#12304A] hover:border-[#168BFF]/50 text-xs text-[#7D8EA5] hover:text-[#F8FAFC] transition-colors cursor-pointer min-w-0 shrink-0"
        >
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <Search className="h-3.5 w-3.5 text-[#22D3EE] shrink-0" />
            <span className="text-[11px] font-medium truncate whitespace-nowrap">Search symbols (e.g. NIFTY, BTC, GOLD)...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold bg-[#06101B] border border-[#10263A] rounded text-[#7D8EA5] shrink-0 ml-1.5">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* ── 3. RIGHT SECTION: LIVE CLOCK + PAPER MODE + CONTROLS ───── */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Live IST Date & Time Clock */}
        {currentTime && (
          <div className="hidden xl:flex items-center h-[34px] text-[12px] font-mono font-bold text-[#22D3EE] bg-[#071D2D]/90 border border-[#16C6F4]/40 px-3 py-1 rounded-lg tracking-normal whitespace-nowrap shadow-xs shadow-[#16C6F4]/15">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00F0FF] animate-pulse mr-2" />
            <span>{currentTime}</span>
          </div>
        )}

        {/* Paper Mode Control Badge */}
        <div className="h-[34px] px-2.5 flex items-center gap-1.5 rounded-lg bg-[#168BFF]/15 border border-[#168BFF]/40 text-[#17C5FF] font-mono text-[11px] font-bold shadow-xs whitespace-nowrap">
          <span className="h-2 w-2 rounded-full bg-[#22D3EE] animate-pulse" />
          <span className="tracking-wide">PAPER MODE</span>
        </div>

        {/* Risk / Killswitch Status */}
        {isKillSwitchActive && (
          <div className="h-[34px] flex items-center gap-1.5 px-2.5 rounded-lg bg-[#FF3B5C]/15 border border-[#FF3B5C]/40 font-mono text-[11px] font-bold text-[#FF3B5C] whitespace-nowrap">
            <Shield className="h-3 w-3" />
            <span>HALTED</span>
          </div>
        )}

        {/* Alerts Shortcut */}
        <Link
          href="/alerts"
          prefetch={true}
          className="h-[34px] w-[34px] flex items-center justify-center rounded-lg text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#0A1422] border border-[#12304A] transition-colors cursor-pointer relative"
          title="Terminal Alerts"
        >
          <Bell className="h-3.5 w-3.5" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#22D3EE]" />
        </Link>

        {/* Settings Shortcut */}
        <Link
          href="/settings"
          prefetch={true}
          className="h-[34px] w-[34px] flex items-center justify-center rounded-lg text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#0A1422] border border-[#12304A] transition-colors cursor-pointer hidden sm:flex"
          title="Terminal Settings"
        >
          <SettingsIcon className="h-3.5 w-3.5" />
        </Link>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="h-[34px] flex items-center gap-1.5 px-2 rounded-lg bg-[#0A1422] border border-[#12304A] hover:border-[#168BFF]/50 text-xs text-[#F8FAFC] transition-colors cursor-pointer"
          >
            <div className="h-5 w-5 rounded-md bg-[#168BFF]/20 text-[#22D3EE] flex items-center justify-center font-bold text-[10px]">
              {user?.username?.[0]?.toUpperCase() || "A"}
            </div>
            <span className="hidden lg:inline font-semibold text-[11px] text-[#F8FAFC]">
              {user?.username || "admin"}
            </span>
            <ChevronDown className="h-3 w-3 text-[#7D8EA5]" />
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
