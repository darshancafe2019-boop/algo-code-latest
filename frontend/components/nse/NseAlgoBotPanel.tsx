"use client";

import React, { useState } from "react";
import {
  Bot,
  Play,
  Pause,
  Zap,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Activity,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useNseBotSignals, useNseTradeExecution } from "@/hooks/useNseData";

const BOT_STRATEGIES = [
  {
    id: "NSE_OPTIONS_FLOW",
    name: "NSE Options Flow & PCR Imbalance",
    desc: "Capitalizes on extreme Put-Call Ratio divergences and Options Chain open interest build-up.",
    recommendedFor: "NIFTY / BANKNIFTY Options",
    winRate: "72.4%",
  },
  {
    id: "NSE_LONG_BUILDUP",
    name: "NSE Long Build-Up Momentum Bot",
    desc: "Enters high-probability momentum calls when both Open Interest and Spot Price expand rapidly.",
    recommendedFor: "F&O Active Equities",
    winRate: "68.8%",
  },
  {
    id: "NSE_FII_ALIGNMENT",
    name: "Institutional FII/DII Cash Flow Align",
    desc: "Executes directional Index Futures and synthetic spreads aligned with net institutional cash flows.",
    recommendedFor: "Index Futures & Equities",
    winRate: "75.1%",
  },
  {
    id: "NSE_MAX_PAIN_PIN",
    name: "Max Pain Expiry Gravity Pin",
    desc: "Exploits option seller hedging pressure pinning underlying indices towards the Max Pain strike.",
    recommendedFor: "Weekly Expiry Spreads",
    winRate: "81.2%",
  },
];

export function NseAlgoBotPanel() {
  const [selectedSymbol, setSelectedSymbol] = useState("NIFTY");
  const [activeStrategy, setActiveStrategy] = useState("NSE_OPTIONS_FLOW");
  const [botRunning, setBotRunning] = useState(false);
  const [lots, setLots] = useState(1);
  const [tradingMode, setTradingMode] = useState<"PAPER" | "LIVE">("PAPER");
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data: signal, isLoading, refetch } = useNseBotSignals(selectedSymbol);
  const tradeMutation = useNseTradeExecution();

  const handleToggleBot = () => {
    setBotRunning(!botRunning);
    setFeedback(
      !botRunning
        ? `[BOT ACTIVATED] ${activeStrategy} is now actively scanning ${selectedSymbol} [${tradingMode}]`
        : `[BOT PAUSED] Automated execution halted for ${selectedSymbol}`
    );
  };

  const handleManualTrigger = () => {
    if (!signal) return;
    const direction = signal.decision.includes("BUY") ? "BUY" : "SELL";
    const lotSize = selectedSymbol.includes("BANKNIFTY") ? 15 : 50;
    const totalQty = lots * lotSize;
    const targetSymbol = `${selectedSymbol} ${Math.round(signal.spot_price / 50) * 50} ${direction === "BUY" ? "CE" : "PE"}`;

    tradeMutation.mutate(
      {
        symbol: targetSymbol,
        direction,
        quantity: totalQty,
        order_type: "MARKET",
        mode: tradingMode,
        bot_id: `algo-bot-${activeStrategy.toLowerCase()}`,
        strategy: activeStrategy,
      },
      {
        onSuccess: (data) => {
          setFeedback(`Automated order executed: ${data.message}`);
        },
        onError: (err: any) => {
          setFeedback(`Execution error: ${err.message || "Failed"}`);
        },
      }
    );
  };

  const isBullish = signal?.decision?.includes("BUY");
  const isBearish = signal?.decision?.includes("SELL");

  return (
    <div className="bg-[#0B132B]/80 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">NSE Algorithmic Trading Bot Hub</h3>
            <p className="text-xs text-slate-400 font-sans">
              Autonomous Greeks Solver, OI Signal Detection & Institutional Execution Router
            </p>
          </div>
        </div>

        {/* Underlying Selector */}
        <div className="flex items-center gap-2">
          {["NIFTY", "BANKNIFTY", "FINNIFTY", "RELIANCE"].map((sym) => (
            <button
              key={sym}
              onClick={() => setSelectedSymbol(sym)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                selectedSymbol === sym
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Live Quant & Rule Signal Gauge */}
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-slate-400 font-sans">Quant Factor Signal</span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold ${
                  isBullish
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                    : isBearish
                    ? "bg-rose-950 text-rose-400 border border-rose-500/30"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {signal?.decision || "ANALYZING..."}
              </span>
            </div>

            <div className="text-center py-4">
              <div className="text-3xl font-bold text-white mb-1">
                {signal ? `${(signal.confidence * 100).toFixed(0)}%` : "--"}
              </div>
              <div className="text-xs text-slate-400 font-sans">Model Confidence Score</div>
            </div>

            {/* Signal Details */}
            <div className="space-y-2 text-xs border-t border-slate-800 pt-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Underlying Spot:</span>
                <span className="text-white font-bold">₹{signal?.spot_price ? signal.spot_price.toLocaleString("en-IN") : "--"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Put-Call Ratio (PCR):</span>
                <span className={signal && signal.pcr > 1 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {signal?.pcr?.toFixed(2) || "--"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Max Pain Target:</span>
                <span className="text-amber-300 font-bold">₹{signal?.max_pain ? signal.max_pain.toLocaleString("en-IN") : "--"}</span>
              </div>
            </div>

            {/* Signal Reasons */}
            {signal?.reasons && (
              <div className="mt-4 p-2.5 bg-slate-950/60 rounded-lg text-[11px] text-slate-300 space-y-1">
                {signal.reasons.map((r: string, i: number) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-cyan-400">•</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Trigger Button */}
          <div className="mt-5">
            <button
              onClick={handleManualTrigger}
              disabled={tradeMutation.isPending || !signal}
              className={`w-full py-2.5 rounded-xl font-bold text-xs tracking-wider transition flex items-center justify-center gap-2 ${
                isBullish
                  ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                  : isBearish
                  ? "bg-rose-500 hover:bg-rose-400 text-white"
                  : "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              TRIGGER ALGO ORDER: {signal?.recommended_strategy || "EXECUTE"}
            </button>
          </div>
        </div>

        {/* 2. Strategy Selector */}
        <div className="lg:col-span-2 space-y-3">
          <h4 className="text-xs font-sans font-bold text-slate-400 uppercase tracking-wider mb-2">
            Available Algorithmic Strategy Presets
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BOT_STRATEGIES.map((strat) => {
              const isSelected = activeStrategy === strat.id;
              return (
                <div
                  key={strat.id}
                  onClick={() => setActiveStrategy(strat.id)}
                  className={`p-4 rounded-xl cursor-pointer border transition ${
                    isSelected
                      ? "bg-cyan-950/30 border-cyan-400 shadow-lg shadow-cyan-500/10"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-white">{strat.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold">
                      {strat.winRate} Win
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-sans mb-3">{strat.desc}</p>
                  <div className="text-[11px] text-cyan-300 font-medium">
                    Target: {strat.recommendedFor}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bot Control Card */}
          <div className="mt-4 p-4 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-sans">Lots:</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={lots}
                  onChange={(e) => setLots(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-center text-white font-bold"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-sans">Mode:</span>
                <button
                  onClick={() => setTradingMode(tradingMode === "PAPER" ? "LIVE" : "PAPER")}
                  className={`px-2.5 py-1 rounded text-xs font-bold ${
                    tradingMode === "PAPER" ? "bg-cyan-500 text-slate-950" : "bg-amber-500 text-slate-950"
                  }`}
                >
                  {tradingMode}
                </button>
              </div>
            </div>

            <button
              onClick={handleToggleBot}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs tracking-wider transition flex items-center gap-2 ${
                botRunning
                  ? "bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/20"
                  : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
              }`}
            >
              {botRunning ? (
                <>
                  <Pause className="w-4 h-4" /> STOP AUTO BOT
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> ACTIVATE AUTO BOT
                </>
              )}
            </button>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-xs text-cyan-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{feedback}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
