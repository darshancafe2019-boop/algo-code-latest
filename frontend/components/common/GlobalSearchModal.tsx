"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useActiveBot } from "@/context/ActiveBotContext";
import { useTheme } from "@/context/ThemeContext";
import { executeCommand } from "@/lib/commandClient";
import {
  Search,
  LayoutDashboard,
  LineChart,
  Globe,
  Radar,
  Bot,
  PlusCircle,
  Zap,
  Layers,
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
  ShieldAlert,
  Play,
  Square,
  RefreshCw,
  Download,
  HelpCircle,
  Sparkles,
  Paintbrush,
  Brain,
} from "lucide-react";

import { WatchlistStarButton } from "@/components/watchlists/WatchlistStarButton";
import { apiClient } from "@/lib/apiClient";
import { useUIStore } from "@/lib/store/useUIStore";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tabId: string) => void;
}

interface SearchItem {
  id: string;
  category: "PAGE" | "SYMBOL" | "BOT" | "TOOL" | "THEME";
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

export function GlobalSearchModal({ isOpen, onClose, onNavigateTab }: GlobalSearchModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeBot, setActiveSymbol } = useActiveBot();
  const { openAppearanceDrawer } = useTheme();

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      setQuery("");
    }
  }, [isOpen]);

  const items: SearchItem[] = useMemo(
    () => [
      // 1. Pages
      {
        id: "page-dashboard",
        category: "PAGE",
        title: "Trading Dashboard",
        subtitle: "Main market overview, multi-timeframe confluence, and terminal",
        icon: LayoutDashboard,
        action: () => {
          if (onNavigateTab) onNavigateTab("terminal");
          router.push("/dashboard");
          onClose();
        },
      },
      {
        id: "page-bots",
        category: "PAGE",
        title: "Bot Command Center",
        subtitle: "Multi-bot process controllers and lifecycle manager",
        icon: Bot,
        action: () => {
          if (onNavigateTab) onNavigateTab("bot-control");
          router.push("/bots");
          onClose();
        },
      },
      {
        id: "page-create-bot",
        category: "PAGE",
        title: "Create Bot Instance",
        subtitle: "Launch a new automated algorithmic trading bot instance",
        icon: PlusCircle,
        action: () => {
          router.push("/bots/create");
          onClose();
        },
      },
      {
        id: "page-risk",
        category: "PAGE",
        title: "Risk Management Center",
        subtitle: "Position sizing models, drawdown limits, exposure controls",
        icon: Shield,
        action: () => {
          if (onNavigateTab) onNavigateTab("risk-management");
          router.push("/risk");
          onClose();
        },
      },
      {
        id: "page-options",
        category: "PAGE",
        title: "Options Hub & Greeks",
        subtitle: "Live Option chain, Greeks pricing, and Multi-leg payoff builder",
        icon: Zap,
        action: () => {
          if (onNavigateTab) onNavigateTab("options");
          router.push("/options");
          onClose();
        },
      },
      {
        id: "page-futures",
        category: "PAGE",
        title: "Crypto Futures Terminal",
        subtitle: "Perpetual futures contracts, leverage, basis analysis",
        icon: TrendingUp,
        action: () => {
          if (onNavigateTab) onNavigateTab("crypto-futures");
          router.push("/crypto/futures");
          onClose();
        },
      },
      {
        id: "page-orders",
        category: "PAGE",
        title: "Orders & Execution History",
        subtitle: "Order execution ledger and audit verification",
        icon: Send,
        action: () => {
          router.push("/orders");
          onClose();
        },
      },
      {
        id: "page-positions",
        category: "PAGE",
        title: "Open Positions",
        subtitle: "Active positions with live mark-to-market P&L",
        icon: CheckCircle2,
        action: () => {
          router.push("/positions");
          onClose();
        },
      },
      {
        id: "page-pnl",
        category: "PAGE",
        title: "P&L Ledger & Analytics",
        subtitle: "Authoritative trade ledger metrics and performance curve",
        icon: DollarSign,
        action: () => {
          if (onNavigateTab) onNavigateTab("performance");
          router.push("/pnl");
          onClose();
        },
      },
      {
        id: "page-scanner",
        category: "PAGE",
        title: "Market Scanner",
        subtitle: "RSI, MACD, Volume breakout scanner across 628+ assets",
        icon: Radar,
        action: () => {
          router.push("/scanner");
          onClose();
        },
      },
      {
        id: "page-strategy-builder",
        category: "PAGE",
        title: "Visual Strategy Builder",
        subtitle: "Compile IF / AND / OR / THEN visual rules",
        icon: Code,
        action: () => {
          router.push("/strategy-builder");
          onClose();
        },
      },
      {
        id: "page-alerts",
        category: "PAGE",
        title: "Alerts & Events Monitor",
        subtitle: "Price, indicator, breakout, and system threshold alerts",
        icon: Bell,
        action: () => {
          router.push("/alerts");
          onClose();
        },
      },
      {
        id: "page-system-health",
        category: "PAGE",
        title: "System Health & Diagnostics",
        subtitle: "API, WebSocket, DB, and Broker gateway telemetry",
        icon: Activity,
        action: () => {
          router.push("/system-health");
          onClose();
        },
      },

      // 2. Symbols
      {
        id: "sym-btc",
        category: "SYMBOL",
        title: "BTC/USDT",
        subtitle: "Bitcoin Perpetual / Spot (Binance)",
        icon: Zap,
        action: () => {
          setActiveSymbol("BTC/USDT");
          onClose();
        },
      },
      {
        id: "sym-eth",
        category: "SYMBOL",
        title: "ETH/USDT",
        subtitle: "Ethereum Perpetual / Spot (Binance)",
        icon: Zap,
        action: () => {
          setActiveSymbol("ETH/USDT");
          onClose();
        },
      },
      {
        id: "sym-sol",
        category: "SYMBOL",
        title: "SOL/USDT",
        subtitle: "Solana Perpetual / Spot (Binance)",
        icon: Zap,
        action: () => {
          setActiveSymbol("SOL/USDT");
          onClose();
        },
      },
      {
        id: "sym-nifty",
        category: "SYMBOL",
        title: "NIFTY 50",
        subtitle: "NSE Benchmark Index",
        icon: LineChart,
        action: () => {
          setActiveSymbol("NIFTY");
          onClose();
        },
      },
      {
        id: "sym-banknifty",
        category: "SYMBOL",
        title: "BANKNIFTY",
        subtitle: "NSE Banking Sector Index",
        icon: LineChart,
        action: () => {
          setActiveSymbol("BANKNIFTY");
          onClose();
        },
      },

      // 3. Bot & System Execution Commands (Urgent Access)
      {
        id: "cmd-quick-order-buy",
        category: "TOOL",
        title: "⚡ Quick Order: BUY / LONG",
        subtitle: "Open validated pre-trade order router for BUY orders",
        icon: TrendingUp,
        action: () => {
          const { setOrderPlacementModalOpen, setQuickOrderSide } = useUIStore.getState();
          setQuickOrderSide("BUY");
          setOrderPlacementModalOpen(true);
          onClose();
        },
      },
      {
        id: "cmd-quick-order-sell",
        category: "TOOL",
        title: "⚡ Quick Order: SELL / SHORT",
        subtitle: "Open validated pre-trade order router for SELL orders",
        icon: TrendingUp,
        action: () => {
          const { setOrderPlacementModalOpen, setQuickOrderSide } = useUIStore.getState();
          setQuickOrderSide("SELL");
          setOrderPlacementModalOpen(true);
          onClose();
        },
      },
      {
        id: "cmd-launch-bot",
        category: "BOT",
        title: "🤖 Launch New Bot Instance",
        subtitle: "Deploy a new automated quantitative bot with risk controls",
        icon: PlusCircle,
        action: () => {
          const { setCreateBotModalOpen } = useUIStore.getState();
          setCreateBotModalOpen(true);
          onClose();
        },
      },
      {
        id: "cmd-start-all-bots",
        category: "BOT",
        title: "▶ Start All Bot Instances",
        subtitle: "Safely start all eligible bot workers in parallel",
        icon: Play,
        action: async () => {
          await apiClient.post("/api/bots/start-all", {});
          queryClient.invalidateQueries({ queryKey: ["botsList"] });
          queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
          onClose();
        },
      },
      {
        id: "cmd-pause-all-bots",
        category: "BOT",
        title: "⏸ Pause All Active Bots",
        subtitle: "Pause evaluation cycles for all running bots",
        icon: Square,
        action: async () => {
          await apiClient.post("/api/bots/pause-all", {});
          queryClient.invalidateQueries({ queryKey: ["botsList"] });
          queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
          onClose();
        },
      },
      {
        id: "cmd-resume-all-bots",
        category: "BOT",
        title: "▶ Resume All Paused Bots",
        subtitle: "Resume execution for all paused bot instances",
        icon: Play,
        action: async () => {
          await apiClient.post("/api/bots/resume-all", {});
          queryClient.invalidateQueries({ queryKey: ["botsList"] });
          queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
          onClose();
        },
      },
      {
        id: "bot-start",
        category: "BOT",
        title: `Start Bot (${activeBot?.name || "Active Bot"})`,
        subtitle: "Dispatches START_BOT command to process manager",
        icon: Play,
        action: async () => {
          if (activeBot) {
            await executeCommand("START_BOT", activeBot.id, {}, queryClient);
          }
          onClose();
        },
      },
      {
        id: "bot-stop",
        category: "BOT",
        title: `Stop Bot (${activeBot?.name || "Active Bot"})`,
        subtitle: "Dispatches STOP_BOT command to process manager",
        icon: Square,
        action: async () => {
          if (activeBot) {
            await executeCommand("STOP_BOT", activeBot.id, {}, queryClient);
          }
          onClose();
        },
      },

      // 4. Tools & Emergency
      {
        id: "tool-kill-switch",
        category: "TOOL",
        title: "🛑 EMERGENCY KILL SWITCH (HALT ALL)",
        subtitle: "Immediately halt all active bots and lock order execution",
        icon: ShieldAlert,
        action: async () => {
          if (confirm("Are you sure you want to activate the EMERGENCY KILL SWITCH?")) {
            await executeCommand("ACTIVATE_KILL_SWITCH", null, {}, queryClient);
          }
          onClose();
        },
      },
      {
        id: "tool-export-csv",
        category: "TOOL",
        title: "Export Trade Ledger to CSV",
        subtitle: "Download authoritative CSV trade records",
        icon: Download,
        action: () => {
          window.open("/api/trades/export", "_blank");
          onClose();
        },
      },
      {
        id: "tool-sync-markets",
        category: "TOOL",
        title: "Sync Market Universe",
        subtitle: "Refreshes live quotes across 628+ instruments",
        icon: RefreshCw,
        action: async () => {
          await executeCommand("REFRESH_MARKET_DATA", null, {}, queryClient);
          onClose();
        },
      },

      // 5. Theme Settings
      {
        id: "theme-appearance",
        category: "THEME",
        title: "🎨 Open Theme & Appearance Studio",
        subtitle: "Fine-tune interface fonts, numbers, density, radius, and colors",
        icon: Paintbrush,
        action: () => {
          openAppearanceDrawer();
          onClose();
        },
      },
    ],
    [activeBot, onClose, onNavigateTab, openAppearanceDrawer, queryClient, router, setActiveSymbol]
  );

  const filteredItems = useMemo(() => {
    let result = items;
    if (selectedCategory !== "ALL") {
      result = result.filter((i) => i.category === selectedCategory);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.subtitle.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, query, selectedCategory]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = filteredItems[selectedIndex];
      if (selected) selected.action();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-[var(--theme-bg)]/80 backdrop-blur-md z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 select-none font-sans"
      onClick={onClose}
    >
      <div
        className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150 text-[var(--theme-text-primary)]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="p-4 border-b border-[var(--theme-border-subtle)] flex items-center gap-3 bg-[var(--theme-elevated)]/60">
          <Search className="h-5 w-5 text-[var(--theme-accent)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, symbol, page, action, or theme..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] font-mono focus:outline-none"
          />
          <kbd className="px-2 py-0.5 rounded-lg bg-[var(--theme-bg)] text-[10px] text-[var(--theme-text-secondary)] font-mono border border-[var(--theme-border)]">
            ESC
          </kbd>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-[var(--theme-bg)] border-b border-[var(--theme-border)] overflow-x-auto scrollbar-none">
          {["ALL", "PAGE", "SYMBOL", "BOT", "TOOL", "THEME"].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setSelectedIndex(0);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                selectedCategory === cat
                  ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] shadow-sm"
                  : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-elevated)]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-[var(--theme-border-subtle)]">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--theme-text-muted)] font-mono">
              No matching results found for &quot;{query}&quot;.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? "bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/40 text-[var(--theme-text-primary)] shadow-sm"
                      : "text-[var(--theme-text-secondary)] hover:bg-[var(--theme-elevated)] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl border ${
                        isSelected
                          ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] border-[var(--theme-accent)]"
                          : "bg-[var(--theme-bg)] text-[var(--theme-accent)] border-[var(--theme-border)]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[var(--theme-text-primary)] flex items-center gap-2">
                        <span>{item.title}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--theme-bg)] text-[var(--theme-text-muted)] font-mono border border-[var(--theme-border)]">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--theme-text-muted)] mt-0.5">{item.subtitle}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.category === "SYMBOL" && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <WatchlistStarButton instrument={item.title} size="sm" />
                      </div>
                    )}
                    <span className="text-[10px] font-mono text-[var(--theme-accent)] font-bold">↵ Select</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--theme-border)] bg-[var(--theme-bg)] flex items-center justify-between text-[11px] font-mono text-[var(--theme-text-muted)]">
          <span>Use ↑ ↓ to navigate</span>
          <span>Press ↵ to open</span>
        </div>
      </div>
    </div>
  );
}
