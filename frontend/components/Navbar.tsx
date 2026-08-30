"use client";

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
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { executeCommand } from "@/lib/commandClient";
import { apiClient } from "@/lib/apiClient";
import { useActiveBot } from "@/context/ActiveBotContext";
import { useTheme } from "@/context/ThemeContext";
import { MarketAnalystDrawer } from "@/components/analyst/MarketAnalystDrawer";

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

  const [isMarketAnalystOpen, setIsMarketAnalystOpen] = useState(false);
  const [ticker, setTicker] = useState<TickerData>({
    symbol: activeSymbol || "BTC/USDT",
    last: 65420.0,
    change_pct: 0.55,
    change_val: 350.0,
    high: 66000.0,
    low: 64500.0,
    volume: 1250.0,
  });

  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);
  const prevPriceRef = useRef<number>(65420.0);

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
        if (newPrice > prevPriceRef.current) {
          setPriceFlash("up");
        } else if (newPrice < prevPriceRef.current) {
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
        high: data.high || newPrice * 1.02,
        low: data.low || newPrice * 0.98,
        volume: data.volume || 1000,
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
    { id: "markets", label: "🌐 Markets", icon: Globe },
    { id: "command-center", label: "⚡ Command Center", icon: Terminal },
    { id: "terminal", label: "🖥️ Terminal", icon: Activity },
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
    { id: "performance", label: "📈 Analytics", icon: TrendingUp },
    { id: "trade-journal", label: "📘 Trade Journal", icon: BookOpen },
    { id: "alerts", label: "🔔 Alerts", icon: Bell },
    { id: "logs", label: "📜 Audit Logs", icon: Terminal },
    { id: "settings", label: "⚙️ Settings", icon: Sliders },
    { id: "account-security", label: "🔒 Security", icon: Shield },
  ];

  const isPositive = (Number(ticker?.change_pct) || 0) >= 0;

  return (
    <header className="w-full bg-[#0B0F17] border-b border-[#1E293B] sticky top-0 z-40 shadow-xl">
      {/* Top Header Strip */}
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-[#1A2333]">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
              ALPHA ALGO TERMINAL
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                PRO 2.0
              </span>
            </h1>
          </div>
        </div>

        {/* Center Real-Time Market Ticker */}
        <div className="flex items-center gap-3 bg-[#121824] px-3.5 py-1 rounded-xl border border-[#1E293B]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300">{ticker?.symbol || "BTC/USDT"}</span>
            <span
              className={`text-xs sm:text-sm font-mono font-bold transition-colors duration-300 ${
                priceFlash === "up"
                  ? "text-emerald-400 bg-emerald-950/80 px-1.5 rounded"
                  : priceFlash === "down"
                  ? "text-red-400 bg-red-950/80 px-1.5 rounded"
                  : "text-white"
              }`}
            >
              ${(Number(ticker?.last) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div
            className={`flex items-center gap-0.5 text-xs font-semibold ${
              isPositive ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            <span>
              {isPositive ? "+" : ""}
              {(Number(ticker?.change_pct) || 0).toFixed(2)}%
            </span>
          </div>

          <div className="hidden xl:flex items-center gap-3 text-[11px] text-slate-400 border-l border-slate-800 pl-3">
            <span>24h H: <strong className="text-slate-200">${(Number(ticker?.high) || 0).toLocaleString()}</strong></span>
            <span>24h L: <strong className="text-slate-200">${(Number(ticker?.low) || 0).toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Right Top Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Market Analyst Copilot Quick Trigger */}
          <button
            onClick={() => setIsMarketAnalystOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition shadow-sm"
            title="Open Read-Only GPT Market Analyst Copilot"
          >
            <BrainCircuit className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Market Analyst</span>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
              GPT
            </span>
          </button>

          {/* Command Palette Quick Trigger */}
          <button
            onClick={() => onOpenCommandPalette?.()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition"
            title="Open Command Palette"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Commands</span>
            <kbd className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
              Ctrl+K
            </kbd>
          </button>

          {/* Theme & Appearance Palette Button */}
          <button
            onClick={openAppearanceDrawer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121824] hover:bg-[#1E293B] border border-[#1E293B] text-[var(--theme-text-primary)] hover:border-[var(--theme-accent)]/40 text-xs font-bold transition-all"
            title="Open Theme & Appearance Editor"
          >
            <Paintbrush className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
            <span className="hidden lg:inline">{themeConfig.name}</span>
          </button>

          {/* Guided Tutorial Button */}
          <button
            onClick={() => onOpenTutorial?.()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121824] hover:bg-[#1E293B] border border-[#1E293B] text-cyan-300 hover:text-cyan-200 text-xs font-bold transition-colors"
            title="17-Step In-App Tutorial Walkthrough"
          >
            <HelpCircle className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden md:inline">How to Use</span>
          </button>

          {/* Activate All Bots Button */}
          <button
            onClick={() => activateAllMutation.mutate()}
            disabled={activateAllMutation.isPending}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-lg transition-all ${
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
                ? "ACTIVATING..."
                : activateSuccess
                ? "ALL ACTIVATED!"
                : "ACTIVATE ALL"}
            </span>
          </button>

          {/* Emergency Kill Switch Button */}
          <button
            onClick={() => killSwitchMutation.mutate()}
            disabled={killSwitchMutation.isPending}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all ${
              killSwitchActive
                ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30"
                : "bg-red-600/90 hover:bg-red-600 text-white shadow-red-600/30 active:scale-95"
            }`}
            title="Emergency Kill Switch - Stops all bots and locks execution"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span className="hidden md:inline">
              {killSwitchActive ? "UNLOCK KILL SWITCH" : "KILL SWITCH"}
            </span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <nav className="px-4 flex items-center gap-1 overflow-x-auto scrollbar-none py-1 bg-[#0A0E17]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              data-tab={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
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

      {/* Market Analyst Copilot Modal/Drawer */}
      <MarketAnalystDrawer
        isOpen={isMarketAnalystOpen}
        onClose={() => setIsMarketAnalystOpen(false)}
        symbol={ticker?.symbol || activeSymbol || "BTC/USDT"}
        assetClass="crypto"
        exchange="binance"
      />
    </header>
  );
}
