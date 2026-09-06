"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LineChart,
  Globe,
  Radar,
  Brain,
  Bot,
  Zap,
  TrendingUp,
  Code,
  Shield,
  Send,
  CheckCircle2,
  DollarSign,
  Bell,
  Activity,
  Cpu,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Terminal,
  Menu,
  X,
  BookOpen,
  History,
  Landmark,
  Scale,
} from "lucide-react";

interface LeftNavigationSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeTab?: string;
  onTabSelect?: (tabId: string) => void;
}

export interface NavChildItem {
  id: string;
  label: string;
  path: string;
  badge?: string;
}

export interface NavItem {
  id: string;
  label: string;
  subtitle?: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  shortcut?: string;
  children?: NavChildItem[];
}

interface NavGroup {
  groupName: string;
  items: NavItem[];
}

export function LeftNavigationSidebar({
  isCollapsed,
  onToggleCollapse,
  activeTab,
  onTabSelect,
}: LeftNavigationSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    options: true,
    futures: true,
  });

  useEffect(() => {
    if (pathname?.startsWith("/options")) {
      setExpandedItems((prev) => ({ ...prev, options: true }));
    }
    if (pathname?.startsWith("/futures") || pathname?.startsWith("/crypto/futures")) {
      setExpandedItems((prev) => ({ ...prev, futures: true }));
    }
  }, [pathname]);

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const navGroups: NavGroup[] = [
    {
      groupName: "OVERVIEW",
      items: [
        { id: "home", label: "HOME", path: "/", icon: LayoutDashboard },
        { id: "markets", label: "MARKETS", path: "/markets", icon: LineChart },
        { id: "scanner", label: "INDICATORS", path: "/scanner", icon: Radar, shortcut: "⌘S" },
      ],
    },
    {
      groupName: "TRADING",
      items: [
        { id: "terminal", label: "TERMINAL", path: "/terminal", icon: Terminal, shortcut: "⌘T" },
        { id: "bots", label: "BOTS", path: "/bots", icon: Bot, badge: "LIVE" },
        { id: "strategies", label: "STRATEGIES", path: "/strategies", icon: Code },
        {
          id: "futures",
          label: "FUTURES",
          path: "/futures",
          icon: TrendingUp,
          children: [
            { id: "futures-all", label: "All / Smart Futures", path: "/futures" },
            { id: "futures-binance-usdm", label: "Binance USD-M", path: "/futures/binance-usdm", badge: "USD-M" },
            { id: "futures-binance-coinm", label: "Binance COIN-M", path: "/futures/binance-coinm", badge: "COIN-M" },
            { id: "futures-delta", label: "Delta Exchange", path: "/futures/delta", badge: "CRYPTO" },
            { id: "futures-dhan", label: "Dhan Futures", path: "/futures/dhan", badge: "NSE" },
            { id: "futures-upstox", label: "Upstox Futures", path: "/futures/upstox", badge: "NSE" },
            { id: "futures-global", label: "CME / Global Futures", path: "/futures/global", badge: "CME" },
            { id: "futures-funding", label: "Funding & Basis", path: "/futures/funding" },
            { id: "futures-saved", label: "Saved Futures", path: "/futures/saved" },
            { id: "futures-strategies", label: "Futures Strategies", path: "/futures/strategies" },
            { id: "futures-positions", label: "Futures Positions", path: "/futures/positions" },
            { id: "futures-health", label: "Futures Health", path: "/futures/health", badge: "HEALTH" },
          ],
        },
        {
          id: "options",
          label: "OPTIONS",
          path: "/options",
          icon: Zap,
          children: [
            { id: "options-all", label: "All / Smart Options", path: "/options" },
            { id: "options-chain", label: "Option Chain", path: "/options/chain" },
            { id: "options-dhan", label: "Dhan Options", path: "/options/dhan", badge: "NSE" },
            { id: "options-upstox", label: "Upstox Options", path: "/options/upstox", badge: "NSE" },
            { id: "options-delta", label: "Delta Exchange Options", path: "/options/delta", badge: "CRYPTO" },
            { id: "options-binance", label: "Binance Options", path: "/options/binance", badge: "CRYPTO" },
            { id: "options-greeks", label: "Greeks & Volatility", path: "/options/greeks" },
            { id: "options-flow", label: "OI & Market Flow", path: "/options/flow" },
            { id: "options-strategies", label: "Strategy Studio", path: "/options/strategies" },
            { id: "options-saved", label: "Saved Chains", path: "/options/saved" },
            { id: "options-positions", label: "Options Positions", path: "/options/positions" },
            { id: "options-orders", label: "Options Orders", path: "/options/orders" },
            { id: "options-health", label: "Options Health", path: "/options/health", badge: "HEALTH" },
          ],
        },
        {
          id: "tax",
          label: "TAX INTELLIGENCE",
          path: "/tax",
          icon: Scale,
        },
      ],
    },
    {
      groupName: "PORTFOLIO",
      items: [
        { id: "positions", label: "POSITIONS", path: "/positions", icon: CheckCircle2, shortcut: "⌘P" },
        { id: "orders", label: "ORDERS", path: "/orders", icon: Send, shortcut: "⌘O" },
        { id: "pnl", label: "P&L", path: "/pnl", icon: DollarSign },
        {
          id: "capital-funds",
          label: " FUNDS",
          path: "/capital",
          icon: Landmark,
        },

      ],
    },
    {
      groupName: "RISK & RECORDS",
      items: [
        { id: "risk", label: "RISK", path: "/risk", icon: Shield, shortcut: "⌘R" },
        { id: "trade-journal", label: "JOURNAL", path: "/trade-journal", icon: BookOpen },
        { id: "alerts", label: "ALERTS", path: "/alerts", icon: Bell },
      ],
    },
    {
      groupName: "MORE",
      items: [
        { id: "logs", label: "AUDIT LOGS", path: "/logs", icon: History },
        { id: "system-health", label: "SYSTEM HEALTH", path: "/system-health", icon: Activity },
        { id: "providers", label: "PROVIDERS", path: "/providers", icon: Cpu },
        { id: "settings", label: "SETTINGS", path: "/settings", icon: Sliders },

      ],
    },
  ];

  useEffect(() => {
    const idlePrefetch = () => {
      const paths = [
        "/",
        "/terminal",
        "/bots",
        "/markets",
        "/options",
        "/futures",
        "/capital",
        "/pnl",
        "/positions",
        "/orders",
        "/risk",
        "/scanner",
        "/tax",
      ];
      paths.forEach((p) => {
        try {
          router.prefetch(p);
        } catch { }
      });
    };
    if (typeof window !== "undefined") {
      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(idlePrefetch, { timeout: 3000 });
      } else {
        setTimeout(idlePrefetch, 1500);
      }
    }
  }, [router]);

  const handleNavClick = (item: NavItem) => {
    if (onTabSelect) {
      onTabSelect(item.id);
    }
    router.push(item.path);
    setMobileDrawerOpen(false);
  };

  const handleItemClick = (item: NavItem) => {
    if (item.children && item.children.length > 0) {
      if (isCollapsed) {
        handleNavClick(item);
      } else {
        toggleExpand(item.id);
        if (!pathname?.startsWith(item.path)) {
          handleNavClick(item);
        }
      }
    } else {
      handleNavClick(item);
    }
  };

  const isItemActive = (item: NavItem) => {
    if (pathname === item.path) return true;
    if (item.id === "futures" && (pathname?.startsWith("/futures") || pathname?.startsWith("/crypto/futures"))) return true;
    if (item.children && item.children.some((c) => pathname === c.path || (c.path === "/options" && (pathname === "/options/all" || pathname === "/options")) || (c.path === "/futures" && (pathname === "/futures" || pathname === "/crypto/futures")))) return true;
    if (item.path !== "/" && pathname?.startsWith(item.path)) return true;
    if (activeTab === item.id) return true;
    if (item.id === "capital-funds" && (activeTab === "capital" || activeTab === "funds" || activeTab === "capital-funds")) return true;
    return false;
  };

  const isChildActive = (child: NavChildItem) => {
    if (child.path === "/options") {
      return pathname === "/options" || pathname === "/options/all";
    }
    if (child.path === "/futures") {
      return pathname === "/futures" || pathname === "/crypto/futures";
    }
    return pathname === child.path;
  };

  // Quick Mobile Bottom Bar Items
  const mobileBarItems = [
    { id: "home", label: "Home", path: "/", icon: LayoutDashboard },
    { id: "markets", label: "Markets", path: "/charts", icon: LineChart },
    { id: "bots", label: "Bots", path: "/bots", icon: Bot },
    { id: "positions", label: "Positions", path: "/positions", icon: CheckCircle2 },
    { id: "menu", label: "More", path: "#", icon: Menu, isMenu: true },
  ];

  return (
    <>
      {/* Desktop & Tablet Adaptive Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-[var(--theme-surface)]/95 border-r border-[var(--theme-border)] transition-all duration-200 select-none z-20 shrink-0 ${isCollapsed ? "w-16" : "w-16 xl:w-60"
          }`}
      >
        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto py-4 px-2.5 space-y-5 scrollbar-thin">
          {navGroups.map((group) => (
            <div key={group.groupName} className="space-y-1">
              {!isCollapsed && (
                <span className="hidden xl:block px-3 text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase mb-2">
                  {group.groupName}
                </span>
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item);
                const hasChildren = Boolean(item.children && item.children.length > 0);
                const isExpanded = Boolean(expandedItems[item.id]);

                return (
                  <div key={item.id} className="space-y-0.5">
                    <button
                      onClick={() => handleItemClick(item)}
                      onMouseEnter={() => {
                        try {
                          router.prefetch(item.path);
                        } catch { }
                      }}
                      title={isCollapsed ? (item.subtitle ? `${item.label} (${item.subtitle})` : item.label) : undefined}
                      aria-label={item.label}
                      aria-expanded={hasChildren ? isExpanded : undefined}
                      data-nav-id={item.id}
                      data-nav-path={item.path}
                      className={`w-full min-h-[40px] flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-mono transition-all duration-150 relative group cursor-pointer ${active
                        ? "bg-sky-500/15 text-sky-400 font-bold border border-sky-500/35 shadow-sm shadow-sky-500/15"
                        : "text-slate-400 hover:text-slate-100 hover:bg-[var(--theme-elevated)]/80 border border-transparent"
                        }`}
                    >
                      {/* Active Left Indicator Bar */}
                      {active && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 bg-sky-400 rounded-r-full shadow-[0_0_10px_rgba(56,189,248,0.9)]" />
                      )}

                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${active ? "text-sky-400" : "text-slate-400 group-hover:text-slate-200"
                          }`}
                      />

                      {!isCollapsed && (
                        <>
                          <div className="hidden xl:flex flex-col flex-1 text-left min-w-0">
                            <span className="tracking-wide truncate font-bold text-xs">{item.label}</span>
                            {item.subtitle && (
                              <span className="text-[9px] text-[#8BA596] truncate font-sans font-normal -mt-0.5">
                                {item.subtitle}
                              </span>
                            )}
                          </div>
                          {item.badge && (
                            <span className="hidden xl:inline-block px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[9px] font-bold border border-emerald-500/30">
                              {item.badge}
                            </span>
                          )}
                          {hasChildren && (
                            <div
                              onClick={(e) => toggleExpand(item.id, e)}
                              className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition"
                            >
                              <ChevronDown
                                className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180 text-sky-400" : ""}`}
                              />
                            </div>
                          )}
                          {item.shortcut && !hasChildren && (
                            <kbd className="text-[9px] text-slate-500 font-mono hidden 2xl:inline">
                              {item.shortcut}
                            </kbd>
                          )}
                        </>
                      )}
                    </button>

                    {/* Children Dropdown (Desktop Expanded) */}
                    {!isCollapsed && hasChildren && isExpanded && (
                      <div className="hidden xl:flex flex-col pl-7 pr-1 py-1 space-y-0.5 animate-fadeIn border-l border-slate-800/80 ml-4 my-1">
                        {item.children!.map((child) => {
                          const childActive = isChildActive(child);
                          return (
                            <button
                              key={child.id}
                              onClick={() => {
                                if (onTabSelect) onTabSelect(child.id);
                                router.push(child.path);
                                setMobileDrawerOpen(false);
                              }}
                              onMouseEnter={() => {
                                try {
                                  router.prefetch(child.path);
                                } catch { }
                              }}
                              data-nav-child-id={child.id}
                              data-nav-child-path={child.path}
                              className={`w-full min-h-[30px] flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition-all duration-150 relative cursor-pointer ${childActive
                                ? "bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40 shadow-sm"
                                : "text-slate-400 hover:text-slate-200 hover:bg-[var(--theme-elevated)]/60 border border-transparent"
                                }`}
                            >
                              {childActive && (
                                <span className="absolute -left-[17px] top-2 bottom-2 w-1 bg-sky-400 rounded-full" />
                              )}
                              <span className="truncate">{child.label}</span>
                              {child.badge && (
                                <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                  {child.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom Collapse Toggle Footer */}
        <div className="p-3 border-t border-[var(--theme-border)] flex items-center justify-between">
          {!isCollapsed && (
            <div className="hidden xl:flex items-center gap-2 text-[10px] font-mono text-[var(--theme-text-muted)]">
              <span className="w-2 h-2 rounded-full bg-[var(--theme-profit)] animate-pulse" />
              <span>ENGINES LIVE</span>
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center p-1.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border)] transition-all ml-auto"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer (Full Navigation Menu) */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex font-sans">
          <div
            className="fixed inset-0 bg-[var(--theme-bg)]/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-[var(--theme-surface)] border-r border-[var(--theme-border)] p-4 flex flex-col z-50 text-[var(--theme-text-primary)] shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--theme-border)] pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--theme-accent)] animate-pulse" />
                <span className="text-xs font-mono font-bold text-[var(--theme-accent)]">QUANT.OS NAVIGATION</span>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[var(--theme-elevated)] text-[var(--theme-text-secondary)] active:scale-95"
                aria-label="Close Menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4">
              {navGroups.map((group) => (
                <div key={group.groupName} className="space-y-1">
                  <span className="text-[9px] font-mono text-[var(--theme-text-muted)] uppercase block px-2">
                    {group.groupName}
                  </span>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isItemActive(item);
                    const hasChildren = Boolean(item.children && item.children.length > 0);
                    const isExpanded = Boolean(expandedItems[item.id]);

                    return (
                      <div key={item.id} className="space-y-1">
                        <button
                          onClick={() => handleItemClick(item)}
                          onMouseEnter={() => {
                            try {
                              router.prefetch(item.path);
                            } catch { }
                          }}
                          data-mobile-nav-id={item.id}
                          data-mobile-nav-path={item.path}
                          className={`w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono transition-all ${active
                            ? "bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] font-bold border border-[var(--theme-accent)]/40"
                            : "text-[var(--theme-text-secondary)] active:bg-[var(--theme-elevated)]"
                            }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <div className="flex flex-col flex-1 text-left min-w-0">
                            <span className="font-bold text-xs">{item.label}</span>
                            {item.subtitle && (
                              <span className="text-[10px] text-[#8BA596] font-sans font-normal">
                                {item.subtitle}
                              </span>
                            )}
                          </div>
                          {item.badge && (
                            <span className="px-1.5 py-0.2 rounded bg-[var(--theme-elevated)] text-[var(--theme-accent)] text-[9px] font-bold border border-[var(--theme-border)]">
                              {item.badge}
                            </span>
                          )}
                          {hasChildren && (
                            <div
                              onClick={(e) => toggleExpand(item.id, e)}
                              className="p-1.5 rounded bg-slate-800 text-slate-300"
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180 text-sky-400" : ""}`}
                              />
                            </div>
                          )}
                        </button>

                        {/* Mobile Children List */}
                        {hasChildren && isExpanded && (
                          <div className="pl-6 space-y-1 my-1 border-l-2 border-slate-800 ml-4">
                            {item.children!.map((child) => {
                              const childActive = isChildActive(child);
                              return (
                                <button
                                  key={child.id}
                                  onClick={() => {
                                    if (onTabSelect) onTabSelect(child.id);
                                    router.push(child.path);
                                    setMobileDrawerOpen(false);
                                  }}
                                  data-mobile-child-id={child.id}
                                  data-mobile-child-path={child.path}
                                  className={`w-full min-h-[38px] flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-all ${childActive
                                    ? "bg-sky-500/25 text-sky-300 font-bold border border-sky-500/40"
                                    : "text-slate-400 active:bg-[var(--theme-elevated)]"
                                    }`}
                                >
                                  <span>{child.label}</span>
                                  {child.badge && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                      {child.badge}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Quick Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--theme-surface)]/95 backdrop-blur-xl border-t border-[var(--theme-border)] flex items-center justify-around px-2 py-1 select-none pb-[calc(0.25rem+var(--safe-bottom))]">
        {mobileBarItems.map((barItem) => {
          const Icon = barItem.icon;
          const active = barItem.isMenu ? false : (pathname === barItem.path || (barItem.path !== "/" && pathname?.startsWith(barItem.path)));

          return (
            <button
              key={barItem.id}
              onClick={() => {
                if (barItem.isMenu) {
                  setMobileDrawerOpen(true);
                } else {
                  if (onTabSelect) {
                    onTabSelect(barItem.id);
                  }
                  router.push(barItem.path);
                }
              }}
              onMouseEnter={() => {
                if (!barItem.isMenu) {
                  try {
                    router.prefetch(barItem.path);
                  } catch { }
                }
              }}
              className={`min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl font-mono text-[10px] transition-all active:scale-95 ${active
                ? "text-[var(--theme-accent)] font-bold"
                : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]"
                }`}
              aria-label={barItem.label}
            >
              <Icon className={`h-4 w-4 ${active ? "text-[var(--theme-accent)]" : "text-[var(--theme-text-muted)]"}`} />
              <span className="truncate">{barItem.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
