"use client";

import { formatMoney } from "@/lib/formatters";
import React, { useEffect, useState, useRef } from "react";
import {
  Activity,
  Bot,
  TrendingUp,
  BookOpen,
  Globe,
  Bell,
  Shield,
  FlaskConical,
  Terminal,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  RefreshCw,
  CheckCircle,
  HelpCircle,
  Search,
  Code,
  ShieldAlert,
  Sliders,
  Layers,
  Radio,
  Sparkles,
  Paintbrush,
  BrainCircuit,
  Landmark,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { executeCommand } from "@/lib/commandClient";
import { apiClient } from "@/lib/apiClient";
import { useActiveBot } from "@/context/ActiveBotContext";
import { useTheme } from "@/context/ThemeContext";
import { useSymbolQuote, useFeedHealth } from "@/lib/market-data/market-feed-store";
import { BotAssistantModal } from "@/components/bot-control/BotAssistantModal";
import { ProviderHeaderSelector } from "@/components/providers/ProviderHeaderSelector";
import { ProviderFailoverBanner } from "@/components/providers/ProviderFailoverBanner";

interface TickerData {
  symbol: string;
  last: number;
  change_pct: number;
  change_val: number;
  high: number;
  low: number;
  volume: number;
}

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenTutorial?: () => void;
  onOpenCommandPalette?: () => void;
}

export function Navbar({
  activeTab,
  setActiveTab,
  onOpenTutorial,
  onOpenCommandPalette,
}: NavbarProps) {
  const queryClient = useQueryClient();
  const { activeSymbol } = useActiveBot();
  const { openAppearanceDrawer, config: themeConfig } = useTheme();
  const [activateSuccess, setActivateSuccess] = useState(false);
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [isBotAssistantOpen, setIsBotAssistantOpen] = useState(false);
  const [isMarketAnalystOpen, setIsMarketAnalystOpen] = useState(false);
  const [ticker, setTicker] = useState<TickerData>({
    symbol: activeSymbol || "BTC/USDT",
    last: 0,
    change_pct: 0,
    change_val: 0,
    high: 0,
    low: 0,
    volume: 0,
  });

  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);
  const prevPriceRef = useRef<number>(0);

  // Activate All Bots Mutation
  const activateAllMutation = useMutation({
    mutationFn: async () => {
      return await executeCommand("START_ALL_BOTS", null, {}, queryClient);
    },
    onSuccess: () => {
      setActivateSuccess(true);
      setTimeout(() => setActivateSuccess(false), 4000);
    },
  });

  // Emergency Kill Switch Mutation
  const killSwitchMutation = useMutation({
    mutationFn: async () => {
      if (killSwitchActive) {
        const res = await executeCommand("DEACTIVATE_KILL_SWITCH", null, {}, queryClient);
        setKillSwitchActive(false);
        return res;
      } else {
        if (confirm("EMERGENCY KILL SWITCH: Are you sure? All running bots will be immediately stopped.")) {
          const res = await executeCommand("ACTIVATE_KILL_SWITCH", null, {}, queryClient);
          setKillSwitchActive(true);
          return res;
        }
      }
    },
  });

  // Resilient SSE Ticker Stream with single-connection ownership and exponential backoff
  useEffect(() => {
    let isSubscribed = true;

    const handleNewPrice = (newPrice: number, data: any) => {
      if (!isSubscribed) return;
      if (prevPriceRef.current !== newPrice) {
        if (newPrice > prevPriceRef.current && prevPriceRef.current > 0) {
          setPriceFlash("up");
        } else if (newPrice < prevPriceRef.current && prevPriceRef.current > 0) {
          setPriceFlash("down");
        }
        prevPriceRef.current = newPrice;
        setTimeout(() => {
          if (isSubscribed) setPriceFlash(null);
        }, 1000);
      }

      setTicker({
        symbol: data.symbol || activeSymbol || "BTC/USDT",
        last: newPrice,
        change_pct: data.change_pct !== undefined ? Number(data.change_pct) : 0,
        change_val: data.change_val !== undefined ? Number(data.change_val) : 0,
        high: data.high || newPrice,
        low: data.low || newPrice,
        volume: data.volume || 0,
      });
    };

    const streamUrl = `/api/stream/ticker?symbol=${encodeURIComponent(activeSymbol || "BTC/USDT")}`;
    const handle = apiClient.createResilientEventSource(streamUrl, {
      key: `ticker_stream_${activeSymbol}`,
      onMessage: (data) => {
        const raw = data.data || data.ticker || data;
        const price = parseFloat(raw.price || raw.last);
        if (!isNaN(price) && price > 0) {
          handleNewPrice(price, raw);
        }
      },
    });

    return () => {
      isSubscribed = false;
      handle.close();
    };
  }, [activeSymbol]);

  const navItems = [
    { id: "home", label: "🏠 Home", icon: Activity },
    { id: "orchestrator", label: "🤖 AI Orchestrator", icon: BrainCircuit },
    { id: "markets", label: "🌐 Markets", icon: Globe },
    { id: "command-center", label: "⚡ Command Center", icon: Terminal },
    { id: "crypto-derivatives", label: "🪙 Crypto Hub", icon: Zap },
    { id: "crypto-futures", label: "📈 Crypto Futures", icon: TrendingUp },
    { id: "crypto-options-chain", label: "⚡ Crypto Options", icon: Layers },
    { id: "options", label: "📊 Index Options", icon: Layers },
    { id: "orderbook", label: "⚖️ Order Book", icon: Activity },
    { id: "bot-control", label: "🤖 Bot Instances", icon: Bot },
    { id: "strategy-builder", label: "🛠️ Strategy Builder", icon: Code },
    { id: "indicators", label: "📊 Indicator Center", icon: Sliders },
    { id: "risk-management", label: "🛡️ Risk Engine", icon: Shield },
    { id: "providers", label: "📡 Providers", icon: Radio },
    { id: "backtesting", label: "🧪 Backtest Lab", icon: FlaskConical },
    { id: "performance", label: "📈 Portfolio / Analytics", icon: TrendingUp },
    { id: "capital-funds", label: "🏛️ Capital & Funds", icon: Landmark },
    { id: "trade-journal", label: "📘 Trade Journal", icon: BookOpen },
    { id: "alerts", label: "🔔 Alerts", icon: Bell },
    { id: "logs", label: "📜 Audit Logs", icon: Terminal },
    { id: "settings", label: "⚙️ Settings", icon: Sliders },
    { id: "account-security", label: "🔒 Security", icon: Shield },
  ];

  const liveQuote = useSymbolQuote(activeSymbol || "NIFTY");
  const feedHealth = useFeedHealth();

  // If live store has quote, use it; otherwise fallback to SSE stream
  const currentSymbol = liveQuote?.symbol || ticker?.symbol || activeSymbol || "NIFTY";
  const currentPrice = liveQuote?.lastPrice ?? (ticker?.last && ticker.last > 0 ? ticker.last : null);
  const currentChangePct = liveQuote?.changePercent ?? ticker?.change_pct ?? 0;
  const currentChangeVal = liveQuote?.change ?? ticker?.change_val ?? 0;
  const currentFlash = liveQuote?.flashDirection || priceFlash;
  const isIndianAsset = currentSymbol.includes("NIFTY") || currentSymbol.includes("SENSEX") || currentSymbol.includes("BANK");
  const currencySymbol = isIndianAsset ? "₹" : "$";
  const isPositive = currentChangePct >= 0;
  const isLiveFeed = liveQuote ? !liveQuote.isStale : (feedHealth.connectionStatus === "LIVE");
  const measuredLatency = liveQuote?.feedLatencyMs ?? feedHealth.latencyMs;
  const latencyDisplay = measuredLatency ? measuredLatency.toFixed(0) : "—";

  return (
    <>
      <ProviderFailoverBanner />
      <header className="sticky top-0 z-40 w-full border-b border-[#1A2A3F] bg-[#0B0E17]/95 backdrop-blur px-3 sm:px-4 py-1.5 flex flex-col gap-1.5 shadow-md font-sans select-none">
        {/* Top Control Bar Row */}
        <div className="flex items-center justify-between w-full gap-2 sm:gap-4">
          {/* Left Branding and Primary Nav Links */}
          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            <div
              onClick={() => setActiveTab("home")}
              className="flex items-center gap-2 cursor-pointer group select-none"
            >
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-600 via-cyan-500 to-blue-500 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
                <div className="h-full w-full bg-[#0B0E17] rounded-[6px] flex items-center justify-center">
                  <Radio className="h-4 w-4 text-cyan-400 animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-wider bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                    QUANT.OS
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                    PRO
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 font-mono tracking-tight hidden sm:block">
                  INSTITUTIONAL MARKET FEED
                </p>
              </div>
            </div>
          </div>

          {/* Center Real-Time Market Ticker & Provider Selector */}
          <div className="flex items-center gap-2 sm:gap-3 bg-[#121824] px-2.5 sm:px-3.5 py-1 rounded-xl border border-[#1A2A3F] min-w-0 max-w-xl">
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-300">{currentSymbol}</span>
              <span
                className={`text-xs sm:text-sm font-mono font-bold transition-all duration-200 ${
                  currentFlash === "up"
                    ? "text-emerald-300 bg-emerald-950/80 px-1.5 rounded shadow-sm shadow-emerald-500/30"
                    : currentFlash === "down"
                      ? "text-red-300 bg-red-950/80 px-1.5 rounded shadow-sm shadow-red-500/30"
                      : "text-white"
                }`}
              >
                {currentPrice != null && currentPrice > 0 ? formatMoney(currentPrice, currencySymbol) : "—"}
              </span>
            </div>

            <div
              className={`hidden xs:flex items-center gap-0.5 text-xs font-semibold shrink-0 ${
                isPositive ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              <span>
                {isPositive ? "+" : ""}
                {currentChangePct.toFixed(2)}%
              </span>
            </div>

            {/* Global Provider Control Plane Selector */}
            <div className="shrink-0">
              <ProviderHeaderSelector />
            </div>

            <div className="hidden xl:flex items-center gap-2 text-[11px] font-mono border-l border-slate-800 pl-2.5 shrink-0">
              <span className={`flex items-center gap-1 ${isLiveFeed ? "text-emerald-400" : "text-amber-400"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isLiveFeed ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                {isLiveFeed ? "LIVE" : "STALE"}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">{latencyDisplay !== "—" ? `${latencyDisplay}ms` : "—"}</span>
            </div>
          </div>

          {/* Right Top Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* AI Bot Copilot Trigger */}
            <button
              onClick={() => setIsBotAssistantOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-teal-500/20 hover:from-cyan-500/30 hover:to-teal-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition shadow-md shadow-cyan-950/40"
              title="Open AI Bot Copilot & Autonomous Resolver (Ctrl+J / Cmd+J)"
            >
              <Bot className="h-4 w-4 text-cyan-400 animate-pulse" />
              <span className="hidden sm:inline">Copilot</span>
            </button>

            {/* Command Palette Quick Trigger */}
            <button
              onClick={() => onOpenCommandPalette?.()}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition"
              title="Open Command Palette (Ctrl+K)"
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span className="hidden md:inline">Commands</span>
            </button>

            {/* Theme & Appearance Palette Button */}
            <button
              onClick={openAppearanceDrawer}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#121824] hover:bg-[#1A2A3F] border border-[#1A2A3F] text-[var(--theme-text-primary)] hover:border-[var(--theme-accent)]/40 text-xs font-bold transition-all"
              title="Open Theme & Appearance Editor"
            >
              <Paintbrush className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
              <span className="hidden xl:inline">{themeConfig.name}</span>
            </button>

            {/* Activate All Bots Button */}
            <button
              onClick={() => activateAllMutation.mutate()}
              disabled={activateAllMutation.isPending}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-xs shadow-lg transition-all ${
                activateSuccess
                  ? "bg-emerald-600 text-white shadow-emerald-600/30"
                  : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/25 active:scale-95"
              } disabled:opacity-50`}
            >
              {activateAllMutation.isPending ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
              ) : activateSuccess ? (
                <CheckCircle className="h-3.5 w-3.5 text-white" />
              ) : (
                <Zap className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
              )}
              <span className="hidden sm:inline">
                {activateAllMutation.isPending
                  ? "STARTING..."
                  : activateSuccess
                    ? "STARTED!"
                    : "START ALL"}
              </span>
            </button>

            {/* Emergency Kill Switch Button */}
            <button
              onClick={() => killSwitchMutation.mutate()}
              disabled={killSwitchMutation.isPending}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all ${
                killSwitchActive
                  ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30"
                  : "bg-red-600/90 hover:bg-red-600 text-white shadow-red-600/30 active:scale-95"
              }`}
              title="Emergency Kill Switch - Stops all bots and locks execution"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span className="hidden md:inline">
                {killSwitchActive ? "UNLOCK" : "KILL SWITCH"}
              </span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Sub-Row */}
        <nav className="w-full flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 border-t border-[#141F30]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                data-tab={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/40 shadow-sm font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* AI Bot Copilot & Self-Healing Modal */}
        <BotAssistantModal
          isOpen={isBotAssistantOpen}
          onClose={() => setIsBotAssistantOpen(false)}
        />
      </header>
    </>
  );
}

