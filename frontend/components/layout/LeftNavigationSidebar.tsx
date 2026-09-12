"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LineChart,
  Radio,
  Bot,
  Code,
  Zap,
  TrendingUp,
  Coins,
  Landmark,
  FileText,
  Bell,
  Network,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Lock,
  X,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LeftNavigationSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeTab?: string;
  onTabSelect?: (tabId: string) => void;
}

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const CANONICAL_NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", path: "/", icon: LayoutDashboard },
  { id: "markets", label: "Markets", path: "/markets", icon: LineChart },
  { id: "live", label: "Live Feed", path: "/live", icon: Radio },
  { id: "bots", label: "Bots", path: "/bots", icon: Bot },
  { id: "strategies", label: "Strategies", path: "/strategies", icon: Code },
  { id: "options", label: "Options", path: "/options", icon: Zap },
  { id: "futures", label: "Futures", path: "/futures", icon: TrendingUp },
  { id: "crypto", label: "Crypto", path: "/crypto", icon: Coins },
  { id: "portfolio", label: "Portfolio", path: "/portfolio", icon: Landmark },
  { id: "reports", label: "Tax", path: "/tax-intelligence", icon: FileText },
  { id: "alerts", label: "Alerts", path: "/alerts", icon: Bell },
  { id: "providers", label: "API & Integrations", path: "/providers", icon: Network },
  { id: "settings", label: "Settings", path: "/settings", icon: Sliders },
];

export function LeftNavigationSidebar({
  isCollapsed,
  onToggleCollapse,
  activeTab,
  onTabSelect,
}: LeftNavigationSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleNavClick = (item: NavItem) => {
    if (onTabSelect) {
      onTabSelect(item.id);
    }
    router.push(item.path);
    setMobileDrawerOpen(false);
  };

  const isItemActive = (item: NavItem) => {
    if (item.path === "/" && (pathname === "/" || pathname === "/dashboard")) {
      return !activeTab || activeTab === "home" || activeTab === "dashboard";
    }
    if (activeTab === item.id) return true;
    if (item.path !== "/" && pathname?.startsWith(item.path)) return true;
    if (item.id === "strategies" && (pathname === "/strategies" || pathname === "/strategy-builder" || activeTab === "strategies" || activeTab === "strategy-builder")) return true;
    if (item.id === "crypto" && (pathname?.startsWith("/crypto") || activeTab === "crypto-derivatives" || activeTab === "crypto-futures" || activeTab === "crypto-options" || activeTab === "crypto-options-chain")) return true;
    if (item.id === "portfolio" && (pathname === "/positions" || pathname === "/orders" || pathname === "/capital" || pathname === "/capital-funds" || pathname === "/pnl" || pathname === "/journal" || activeTab === "positions" || activeTab === "orders" || activeTab === "portfolio" || activeTab === "pnl" || activeTab === "trade-journal")) return true;
    if (item.id === "reports" && (pathname === "/reports" || pathname === "/tax" || pathname === "/tax-intelligence" || activeTab === "reports" || activeTab === "tax" || activeTab === "research" || activeTab === "backtesting")) return true;
    if (item.id === "providers" && (pathname === "/providers" || pathname === "/api-integrations" || pathname === "/integrations" || activeTab === "providers")) return true;
    return false;
  };

  return (
    <>
      {/* Desktop Sidebar (182px) */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-[#07111F] border-r border-[#12304A] transition-all duration-150 select-none z-20 shrink-0 font-sans",
          isCollapsed ? "w-16" : "w-[182px]"
        )}
      >
        {/* Navigation Item List */}
        <div className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5 scrollbar-thin">
          {CANONICAL_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "w-full h-[50px] flex items-center gap-2.5 px-3 rounded-lg text-[13px] font-medium transition-colors relative group cursor-pointer text-left",
                  active
                    ? "bg-[#0A2A47] text-[#22D3EE] font-semibold border-l-[3px] border-l-[#22D3EE]"
                    : "text-[#B7C6D8] font-medium hover:text-[#F8FAFC] hover:bg-[#0F1C2F] border-l-[3px] border-l-transparent"
                )}
              >
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    active ? "text-[#22D3EE]" : "text-[#7D8EA5] group-hover:text-[#B7C6D8]"
                  )}
                />

                {!isCollapsed && (
                  <span className="truncate text-[13px] tracking-tight">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Sidebar Status & Controls */}
        <div className="p-2.5 border-t border-[#12304A] bg-[#040A12]/80 space-y-2 shrink-0">
          {!isCollapsed && (
            <div className="space-y-1 font-mono text-[11px] rounded-lg p-1.5 bg-[#0A1422] border border-[#12304A]">
              {/* Paper Trading Status Pill */}
              <div className="flex items-center justify-between px-2 py-1 rounded bg-[#17C5FF]/10 border border-[#17C5FF]/20 text-[#17C5FF]">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#17C5FF] animate-pulse" />
                  <span className="font-semibold text-[10px] tracking-wide">PAPER TRADING</span>
                </div>
              </div>

              {/* Live Trading Locked */}
              <div className="flex items-center justify-between px-2 py-1 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B]">
                <div className="flex items-center gap-1.5 truncate">
                  <Lock className="h-3 w-3 text-[#F59E0B]" />
                  <span className="font-semibold text-[10px] tracking-wide">Live Trading: LOCKED</span>
                </div>
              </div>
            </div>
          )}

          {/* Collapse Toggle Button */}
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center p-1.5 rounded-lg text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#0F1C2F] transition-colors cursor-pointer text-xs border border-transparent hover:border-[#12304A]"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex font-sans">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] bg-[#07111F] border-r border-[#13263A] flex flex-col z-50 h-full p-3 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#13263A] mb-2">
              <span className="font-bold text-sm text-[#F7FAFC] font-sans">Quant.OS Terminal</span>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 rounded text-[#7C8CA3] hover:text-[#F7FAFC]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1">
              {CANONICAL_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item)}
                    className={cn(
                      "w-full h-10 flex items-center gap-3 px-3 rounded-lg text-xs font-medium transition-colors text-left",
                      active
                        ? "bg-[rgba(14,165,233,0.12)] text-[#32D7FF] font-semibold border-l-[3px] border-l-[#22D3EE]"
                        : "text-[#A8B6C9] hover:text-[#F7FAFC] hover:bg-[rgba(30,64,95,0.18)]"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
