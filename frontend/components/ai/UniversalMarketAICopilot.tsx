"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Sparkles,
  Bot,
  TrendingUp,
  TrendingDown,
  Layers,
  Zap,
  Activity,
  ShieldCheck,
  CheckCircle2,
  X,
  Send,
  RefreshCw,
  BarChart2,
  Newspaper,
  Compass,
  Sliders,
  DollarSign,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Globe2,
} from "lucide-react";
import { useUIStore } from "@/lib/store/useUIStore";
import { useActiveBot } from "@/context/ActiveBotContext";

type MarketUniverse = "CRYPTO_OPTIONS" | "CRYPTO_SPOT" | "INDIAN_EQUITIES" | "US_EQUITIES" | "FOREX_COMMODITIES";
type CopilotToolMode = "SIGNAL" | "OPTIONS_ARCHITECT" | "SENTIMENT" | "BOT_GENERATOR" | "CHAT";

interface CopilotData {
  status: string;
  symbol: string;
  marketType: string;
  signal: {
    direction: "LONG" | "SHORT" | "NEUTRAL";
    confidence: number;
    targetSymbol: string;
    currentPrice: number;
    recommendedEntry: number;
    stopLoss: number;
    takeProfit: number;
    riskRewardRatio: string;
    regime: string;
    rationale: string;
    activeFiltersPassed: string[];
  };
  options: {
    underlyingSymbol: string;
    underlyingPrice: number;
    recommendedStrategy: string;
    strategyCategory: string;
    impliedVolatilityPct: number;
    ivRank: number;
    atmStrike: number;
    recommendedLegs: Array<{
      side: string;
      optionType: string;
      strike: number;
      expiry: string;
      delta: number;
      theta: number;
      gamma: number;
      vega: number;
      estPremium: string;
    }>;
    netDebitCredit: string;
    maxProfit: string;
    maxRisk: string;
    profitProbability: string;
    greeksProfile: {
      portfolioDelta: string;
      portfolioTheta: string;
      portfolioVega: string;
    };
  };
  sentiment: {
    score: number;
    label: string;
    topHeadlines: Array<{
      title: string;
      url: string;
      summary: string;
    }>;
  };
  botBlueprint: {
    botName: string;
    symbol: string;
    timeframe: string;
    executionMode: string;
    allocatedCapital: number;
    riskPerTradePct: number;
    stopLossPct: number;
    takeProfitPct: number;
    rules: Array<{ left: string; op: string; right: string }>;
  };
  aiChatAnswer: string;
}

export function UniversalMarketAICopilot() {
  const queryClient = useQueryClient();
  const { isAICopilotOpen, setAICopilotOpen, activeSymbol, setActiveSymbol } = useUIStore();
  const { activeSymbol: contextSymbol } = useActiveBot();

  const currentSymbol = activeSymbol || contextSymbol || "BTC/USDT";

  // State
  const [selectedUniverse, setSelectedUniverse] = useState<MarketUniverse>(
    currentSymbol.includes("OPTIONS") ? "CRYPTO_OPTIONS" :
    currentSymbol.includes("NIFTY") || currentSymbol.includes("RELIANCE") ? "INDIAN_EQUITIES" :
    currentSymbol === "AAPL" || currentSymbol === "MSFT" || currentSymbol === "NVDA" ? "US_EQUITIES" :
    currentSymbol.includes("EUR") ? "FOREX_COMMODITIES" : "CRYPTO_SPOT"
  );
  const [activeTool, setActiveTool] = useState<CopilotToolMode>("SIGNAL");
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ sender: "user" | "ai"; text: string }>>([]);
  const [deployNotification, setDeployNotification] = useState<string | null>(null);

  // Keyboard shortcut listener (Cmd+J / Ctrl+J or Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setAICopilotOpen(!isAICopilotOpen);
      }
      if (e.key === "Escape" && isAICopilotOpen) {
        setAICopilotOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAICopilotOpen, setAICopilotOpen]);

  // AI Copilot Synthesis Mutation
  const copilotMutation = useMutation({
    mutationFn: async (payload: { symbol: string; marketType: string; toolMode: string; prompt?: string }) => {
      const res = await fetch("/api/ai/copilot/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to synthesize AI Copilot query");
      return (await res.json()) as CopilotData;
    },
  });

  // Fetch analysis on open or symbol change
  useEffect(() => {
    if (isAICopilotOpen) {
      copilotMutation.mutate({
        symbol: currentSymbol,
        marketType: selectedUniverse,
        toolMode: activeTool,
      });
    }
  }, [isAICopilotOpen, currentSymbol, selectedUniverse, activeTool]);

  if (!isAICopilotOpen) return null;

  const data = copilotMutation.data;
  const isLoading = copilotMutation.isPending;

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatPrompt.trim()) return;

    const userText = chatPrompt.trim();
    setChatHistory((prev) => [...prev, { sender: "user", text: userText }]);
    setChatPrompt("");

    copilotMutation.mutate(
      {
        symbol: currentSymbol,
        marketType: selectedUniverse,
        toolMode: "CHAT",
        prompt: userText,
      },
      {
        onSuccess: (resData) => {
          setChatHistory((prev) => [...prev, { sender: "ai", text: resData.aiChatAnswer }]);
        },
      }
    );
  };

  const handleDeployAIBot = async () => {
    if (!data?.botBlueprint) return;
    try {
      const res = await fetch("/api/bots/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.botBlueprint.botName,
          symbol: data.botBlueprint.symbol,
          timeframe: data.botBlueprint.timeframe,
          execution_mode: "PAPER",
          strategy_type: "DETERMINISTIC_RULES",
          allocated_capital: data.botBlueprint.allocatedCapital,
          stop_loss_pct: data.botBlueprint.stopLossPct,
          profit_target_pct: data.botBlueprint.takeProfitPct,
        }),
      });

      if (res.ok) {
        setDeployNotification(`✅ AI Bot '${data.botBlueprint.botName}' deployed successfully in PAPER mode!`);
        queryClient.invalidateQueries({ queryKey: ["botsList"] });
        queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
        setTimeout(() => setDeployNotification(null), 5000);
      } else {
        setDeployNotification("❌ Failed to deploy bot. Ensure backend is healthy.");
      }
    } catch (err: any) {
      setDeployNotification(`❌ Deploy error: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-300 font-sans text-xs flex flex-col max-h-[90vh] overflow-hidden">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/40 text-purple-300 shadow-md">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                  Universal AI Market Copilot
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                  ALL MARKETS ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                AI Signals, Options Greeks Architect, News Sentiment &amp; 1-Click Bot Deployment.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                copilotMutation.mutate({
                  symbol: currentSymbol,
                  marketType: selectedUniverse,
                  toolMode: activeTool,
                })
              }
              disabled={isLoading}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50"
              title="Refresh AI Analysis"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-purple-400" : ""}`} />
            </button>
            <button
              onClick={() => setAICopilotOpen(false)}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1. Market Universe Selector Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 no-scrollbar">
          {[
            { id: "CRYPTO_OPTIONS", label: "⚡ Crypto Options (BTC/ETH)", defaultSym: "BTC-OPTIONS" },
            { id: "CRYPTO_SPOT", label: "🪙 Crypto Spot & Futures", defaultSym: "BTC/USDT" },
            { id: "INDIAN_EQUITIES", label: "🇮🇳 Indian Equities/F&O (NIFTY)", defaultSym: "NIFTY" },
            { id: "US_EQUITIES", label: "🇺🇸 US Tech (Alpha Vantage)", defaultSym: "AAPL" },
            { id: "FOREX_COMMODITIES", label: "💱 Forex & Gold", defaultSym: "EURUSD" },
          ].map((univ) => (
            <button
              key={univ.id}
              onClick={() => {
                setSelectedUniverse(univ.id as MarketUniverse);
                setActiveSymbol(univ.defaultSym);
              }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition border ${
                selectedUniverse === univ.id
                  ? "bg-purple-600/20 text-purple-300 border-purple-500/50 shadow-sm"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              {univ.label}
            </button>
          ))}
        </div>

        {/* 2. AI Tool Options Mode Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-slate-950/80 border border-slate-800/90 rounded-xl shrink-0">
          {[
            { id: "SIGNAL", label: "🎯 AI Trade Signal", icon: Zap },
            { id: "OPTIONS_ARCHITECT", label: "📊 Options Architect", icon: BarChart2 },
            { id: "SENTIMENT", label: "📰 News Sentiment", icon: Newspaper },
            { id: "BOT_GENERATOR", label: "🤖 1-Click Bot", icon: Bot },
            { id: "CHAT", label: "💬 AI Market Chat", icon: HelpCircle },
          ].map((tool) => {
            const Icon = tool.icon;
            const isSelected = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id as CopilotToolMode)}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-bold transition font-mono ${
                  isSelected
                    ? "bg-purple-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{tool.label}</span>
              </button>
            );
          })}
        </div>

        {/* Deploy Notification */}
        {deployNotification && (
          <div className="p-3 rounded-xl bg-purple-950/50 border border-purple-500/40 text-purple-200 font-mono text-xs animate-in fade-in">
            {deployNotification}
          </div>
        )}

        {/* Tool Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">
          {isLoading && !data ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
              <p className="font-mono text-xs">Synthesizing AI Market Intelligence for {currentSymbol}...</p>
            </div>
          ) : activeTool === "SIGNAL" ? (
            /* 🎯 Tool 1: AI Trade Signal & Confluence */
            <div className="space-y-3">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-xl border font-bold text-sm ${
                      data?.signal.direction === "LONG"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-red-500/10 text-red-400 border-red-500/30"
                    }`}
                  >
                    {data?.signal.direction === "LONG" ? "STRONG BUY / LONG" : "STRONG SELL / SHORT"}
                  </div>
                  <div>
                    <div className="text-base font-bold text-white font-mono">
                      {currentSymbol} • ${data?.signal.currentPrice.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                      Model Confluence Score: <strong className="text-purple-400">{data?.signal.confidence}% Confidence</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Stop Loss</span>
                    <span className="text-red-400 font-bold">${data?.signal.stopLoss.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Take Profit</span>
                    <span className="text-emerald-400 font-bold">${data?.signal.takeProfit.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Risk / Reward</span>
                    <span className="text-cyan-400 font-bold">{data?.signal.riskRewardRatio}</span>
                  </div>
                </div>
              </div>

              {/* Rationale & Active Filters */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block">
                  AI Quantitative Thesis
                </span>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">{data?.signal.rationale}</p>
                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                  {data?.signal.activeFiltersPassed?.map((filter, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {filter}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTool === "OPTIONS_ARCHITECT" ? (
            /* 📊 Tool 2: Options Architect & Greeks */
            <div className="space-y-3">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white font-mono">{data?.options.recommendedStrategy}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {data?.options.strategyCategory}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                    Underlying Price: <strong>${data?.options.underlyingPrice.toLocaleString()}</strong> • Implied Volatility:{" "}
                    <strong className="text-cyan-400">{data?.options.impliedVolatilityPct}% (IV Rank: {data?.options.ivRank})</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 block uppercase">Max Profit</span>
                    <span className="text-emerald-400 font-bold">{data?.options.maxProfit}</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 block uppercase">Max Risk</span>
                    <span className="text-red-400 font-bold">{data?.options.maxRisk}</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 block uppercase">Win Probability</span>
                    <span className="text-purple-300 font-bold">{data?.options.profitProbability}</span>
                  </div>
                </div>
              </div>

              {/* Recommended Multi-Leg Structure */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block">
                  Recommended Multi-Leg Execution Structure
                </span>
                <div className="space-y-2">
                  {data?.options.recommendedLegs.map((leg, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg font-mono text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            leg.side === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {leg.side}
                        </span>
                        <span className="text-white font-bold">
                          {leg.optionType} Strike ${leg.strike}
                        </span>
                        <span className="text-slate-400 text-[11px]">({leg.expiry})</span>
                      </div>
                      <div className="flex items-center gap-4 text-slate-300">
                        <span>Delta: {leg.delta}</span>
                        <span>Theta: {leg.theta}</span>
                        <span className="text-cyan-300 font-bold">Est Premium: ${leg.estPremium}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTool === "SENTIMENT" ? (
            /* 📰 Tool 3: News & Sentiment Scanner */
            <div className="space-y-3">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono font-bold text-sm">
                    {data?.sentiment.label.toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white font-mono">Alpha Vantage News Sentiment Engine</span>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                      Sentiment Composite Score: <strong className="text-blue-400">+{data?.sentiment.score} / 1.0</strong>
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono">
                  ALPHA VANTAGE REST ACTIVE
                </span>
              </div>

              {/* Top Headlines */}
              <div className="space-y-2">
                {data?.sentiment.topHeadlines.map((news, i) => (
                  <div key={i} className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
                    <h5 className="font-bold text-xs text-slate-100 hover:text-blue-300 transition cursor-pointer">
                      {news.title}
                    </h5>
                    <p className="text-[11px] text-slate-400 font-sans leading-relaxed">{news.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTool === "BOT_GENERATOR" ? (
            /* 🤖 Tool 4: 1-Click AI Bot Deployer */
            <div className="space-y-3">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white font-mono">{data?.botBlueprint.botName}</h4>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                      Auto-tuned quantitative configuration for {currentSymbol} ({data?.botBlueprint.timeframe} timeframe)
                    </p>
                  </div>
                  <button
                    onClick={handleDeployAIBot}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-mono font-bold text-xs shadow-lg transition active:scale-95 flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Deploy AI Bot to Fleet</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 font-mono text-xs">
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Allocated Capital</span>
                    <span className="text-white font-bold">${data?.botBlueprint.allocatedCapital.toLocaleString()}</span>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Risk Per Trade</span>
                    <span className="text-yellow-400 font-bold">{data?.botBlueprint.riskPerTradePct}%</span>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Stop Loss</span>
                    <span className="text-red-400 font-bold">{data?.botBlueprint.stopLossPct}%</span>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Take Profit Target</span>
                    <span className="text-emerald-400 font-bold">{data?.botBlueprint.takeProfitPct}%</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 💬 Tool 5: Interactive AI Market Chat */
            <div className="space-y-3 flex flex-col h-64">
              <div className="flex-1 overflow-y-auto space-y-2.5 p-3 bg-slate-950/60 rounded-xl border border-slate-800 font-sans text-xs no-scrollbar">
                <div className="p-2.5 bg-purple-950/30 border border-purple-500/20 rounded-lg text-purple-200">
                  {data?.aiChatAnswer || "Ask me anything about market structure, Greeks, volatility, or quantitative entry setups."}
                </div>
                {chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-slate-800/80 text-white ml-8 font-mono"
                        : "bg-purple-950/40 text-purple-200 border border-purple-500/20 mr-8"
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendChat} className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  placeholder={`Ask AI Copilot for ${currentSymbol} trade recommendations or risk checks...`}
                  className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={!chatPrompt.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold font-mono text-xs transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-500 font-mono shrink-0">
          <span>Active Universe: {selectedUniverse} • Live quotes &amp; Alpha Vantage fed</span>
          <span>Shortcut: ⌘J / Ctrl+J</span>
        </div>
      </div>
    </div>
  );
}
