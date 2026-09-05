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

interface NavItem {
  id: string;
  label: string;
  subtitle?: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  shortcut?: string;
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
        { id: "futures", label: "FUTURES", path: "/crypto/futures", icon: TrendingUp },
        { id: "options", label: "OPTIONS", path: "/options", icon: Zap },
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
        "/capital",
        "/pnl",
        "/positions",
        "/orders",
        "/risk",
        "/scanner",
        "/crypto/futures",
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

  const isItemActive = (item: NavItem) => {
    if (pathname === item.path) return true;
    if (item.path !== "/" && pathname?.startsWith(item.path)) return true;
    if (activeTab === item.id) return true;
    if (item.id === "capital-funds" && (activeTab === "capital" || activeTab === "funds" || activeTab === "capital-funds")) return true;
    return false;
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

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item)}
                    onMouseEnter={() => {
                      try {
                        router.prefetch(item.path);
                      } catch { }
                    }}
                    title={isCollapsed ? (item.subtitle ? `${item.label} (${item.subtitle})` : item.label) : undefined}
                    aria-label={item.label}
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
                        {item.shortcut && (
                          <kbd className="text-[9px] text-slate-500 font-mono hidden 2xl:inline">
                            {item.shortcut}
                          </kbd>
                        )}
                      </>
                    )}
                  </button>
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
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item)}
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
                      </button>
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
