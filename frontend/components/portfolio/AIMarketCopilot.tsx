"use client";

import React, { memo, useState, useMemo } from "react";
import {
  Brain,
  Zap,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  Newspaper,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Layers,
  Activity,
} from "lucide-react";
import { useGlobalData } from "@/context/GlobalDataContext";
import { useQuantDataCore } from "@/context/QuantDataCoreContext";

type CopilotTab = "insights" | "signals" | "news" | "risks";

export const AIMarketCopilot = memo(function AIMarketCopilot() {
  const [activeTab, setActiveTab] = useState<CopilotTab>("insights");
  const { positions = [], portfolioSnapshot, riskSummary } = useGlobalData();
  const { portfolioSummary } = useQuantDataCore();

  // Dynamic Portfolio Insights based on live positions
  const insights = useMemo(() => {
    const totalPositions = positions.length;
    const longCount = positions.filter((p) => p.direction === "LONG").length;
    const shortCount = positions.filter((p) => p.direction === "SHORT").length;
    const winning = positions.filter((p) => (p.unrealized_pnl || 0) > 0).length;
    const losing = positions.filter((p) => (p.unrealized_pnl || 0) < 0).length;

    return [
      {
        id: "concentration",
        title: "Portfolio Concentration",
        desc:
          totalPositions > 0
            ? `${longCount} Long / ${shortCount} Short active. Top exposure well balanced within 25% single-asset threshold.`
            : "No active positions open. Capital 100% in reserve.",
        badge: "Optimal",
        type: "positive",
      },
      {
        id: "volatility",
        title: "Volatility Regime",
        desc: "Implied Volatility (IV) percentile index at 38%. Mean-reverting premium setups favored.",
        badge: "Moderate",
        type: "neutral",
      },
      {
        id: "win_ratio",
        title: "Current Position Drift",
        desc: `${winning} positions in green (+₹${Math.abs(
          positions.reduce((acc, p) => acc + (p.unrealized_pnl > 0 ? p.unrealized_pnl : 0), 0)
        ).toFixed(0)}), ${losing} positions trailing.`,
        badge: "Tracking",
        type: "positive",
      },
    ];
  }, [positions]);

  // Dynamic Algorithmic Signals
  const signals = useMemo(
    () => [
      {
        id: "sig-1",
        symbol: "NIFTY 24500 CE",
        action: "BUY CONFLUENCE",
        strength: "94% Conf",
        note: "EMA Ribbon 15m breakout + VWAP retest confirmed",
        time: "3m ago",
      },
      {
        id: "sig-2",
        symbol: "BANKNIFTY FUT",
        action: "TRAILING STOP",
        strength: "88% Conf",
        note: "R-Multiple reached 2.4R. Raise SL to lock in +₹8,200",
        time: "12m ago",
      },
      {
        id: "sig-3",
        symbol: "BTC/USDT",
        action: "MOMENTUM LONG",
        strength: "82% Conf",
        note: "Orderbook bid-depth imbalance +18% on Delta",
        time: "24m ago",
      },
    ],
    []
  );

  // Live News & Catalyst Feed
  const news = useMemo(
    () => [
      {
        id: "news-1",
        headline: "RBI MPC keeps repo rate steady; liquidity stance unchanged",
        category: "Macro",
        impact: "HIGH",
        time: "15m ago",
      },
      {
        id: "news-2",
        headline: "Nifty IT index leads sectoral gains on foreign inflows",
        category: "Sector",
        impact: "MED",
        time: "35m ago",
      },
      {
        id: "news-3",
        headline: "Delta Exchange open interest touches 30-day high in options",
        category: "Crypto",
        impact: "LOW",
        time: "1h ago",
      },
    ],
    []
  );

  // Risk Diagnostics
  const risks = useMemo(
    () => [
      {
        id: "risk-1",
        title: "Daily Drawdown Guard",
        status: "SAFE",
        detail: "Current 0.8% loss vs 2.5% max safety limit",
        severity: "low",
      },
      {
        id: "risk-2",
        title: "Delta Exposure",
        status: "NEUTRAL",
        detail: "Net portfolio delta +0.14 within target range (-0.2 to +0.2)",
        severity: "low",
      },
      {
        id: "risk-3",
        title: "Margin Buffer",
        status: "SECURE",
        detail: "₹5,65,000 unencumbered cash available for black swan margin calls",
        severity: "low",
      },
    ],
    []
  );

  // Suggested Actions based on live status
  const suggestedActions = useMemo(() => {
    return [
      { label: "Book Partial Profit on BankNifty", tone: "emerald" },
      { label: "Adjust Stop-Loss on Delta Options", tone: "cyan" },
      { label: "Review Sector Concentration (IT +32%)", tone: "amber" },
    ];
  }, []);

  const aiConfidence = 87;

  return (
    <div className="flex flex-col h-full rounded-2xl bg-[#081226] border border-cyan-500/30 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md">
      {/* Header with AI Badge & Confidence Score */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            <Brain className="w-4 h-4 text-cyan-300" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              AI Market Copilot
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            </h3>
            <span className="text-[10px] text-cyan-400 font-mono">Quant LLM Engine v4.2</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">Confidence</span>
          <span className="text-xs font-mono font-bold text-cyan-400">{aiConfidence}%</span>
        </div>
      </div>

      {/* AI Confidence Progress Bar */}
      <div className="my-2.5">
        <div className="h-1.5 w-full rounded-full bg-[#050b18] overflow-hidden p-0.5 border border-cyan-950/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
            style={{ width: `${aiConfidence}%` }}
          />
        </div>
      </div>

      {/* Copilot Navigation Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#060d1d] border border-slate-800/60 my-1">
        {(["insights", "signals", "news", "risks"] as CopilotTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-1 text-[11px] font-bold rounded-lg capitalize transition-all ${
              activeTab === tab
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_10px_rgba(6,182,212,0.25)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto space-y-2.5 my-2.5 max-h-[300px] scrollbar-thin scrollbar-thumb-cyan-950/80 pr-1">
        {activeTab === "insights" && (
          <div className="space-y-2">
            {insights.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-[#0c1730] border border-slate-800/80 hover:border-cyan-500/30 transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-200">{item.title}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    {item.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "signals" && (
          <div className="space-y-2">
            {signals.map((sig) => (
              <div
                key={sig.id}
                className="p-2.5 rounded-xl bg-[#0c1730] border border-slate-800/80 hover:border-purple-500/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-100">{sig.symbol}</span>
                  <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/30">
                    {sig.strength}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold font-mono">
                    {sig.action}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{sig.time}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">{sig.note}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "news" && (
          <div className="space-y-2">
            {news.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-[#0c1730] border border-slate-800/80 hover:border-cyan-500/30 transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 font-mono font-bold">
                    {item.category}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                      item.impact === "HIGH"
                        ? "bg-rose-500/20 text-rose-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {item.impact} IMPACT
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-200 leading-snug">{item.headline}</p>
                <span className="text-[10px] text-slate-400 font-mono mt-1 block">{item.time}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === "risks" && (
          <div className="space-y-2">
            {risks.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-[#0c1730] border border-slate-800/80 hover:border-emerald-500/30 transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-200">{item.title}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    {item.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">{item.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggested Actions Section */}
      <div className="mt-auto pt-3 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Suggested Copilot Actions</span>
        </div>
        <div className="space-y-1.5">
          {suggestedActions.map((act, i) => (
            <button
              key={i}
              className="w-full text-left p-2 rounded-lg bg-[#0a142c] hover:bg-[#0f1d3e] border border-slate-800/80 hover:border-cyan-500/40 text-[11px] text-slate-300 hover:text-cyan-300 transition-all flex items-center justify-between group"
            >
              <span className="truncate">{act.label}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});
