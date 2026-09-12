"use client";

import React, { useState } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { BacktestingLab } from "@/components/backtesting/BacktestingLab";
import { WorkspaceHeader } from "@/components/shell/WorkspaceHeader";
import { WorkspaceTabs } from "@/components/shell/WorkspaceTabs";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Brain, FlaskConical, Database, LineChart, Sparkles } from "lucide-react";

export default function ResearchPage() {
  const [activeTab, setActiveTab] = useState<"backtesting" | "walkforward" | "datasets">("backtesting");

  const tabs = [
    { id: "backtesting", label: "Backtest Lab & Simulations", icon: FlaskConical },
    { id: "walkforward", label: "Walk-Forward & Monte Carlo", icon: LineChart },
    { id: "datasets", label: "Historical Market Datasets", icon: Database },
  ];

  return (
    <DirectPageLayout activeTab="research">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1750px] mx-auto min-w-0 font-sans">
        <WorkspaceHeader
          title="Quantitative Research & Strategy Lab"
          subtitle="Multi-timeframe historical backtesting, walk-forward validation, and Monte Carlo risk simulations"
          category="RESEARCH"
          source="QUANTITATIVE RESEARCH ENGINE"
        />

        <WorkspaceTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as any)}
        />

        <ErrorBoundary title="Research View Failed">
          {activeTab === "backtesting" && <BacktestingLab />}

          {activeTab === "walkforward" && (
            <div className="p-6 rounded-2xl bg-[#0F172A]/80 border border-[#1A2A3F] space-y-4 font-mono">
              <div className="flex items-center gap-2 text-sky-400">
                <Sparkles className="h-5 w-5" />
                <h3 className="font-bold text-sm text-white">Walk-Forward Optimization & Out-of-Sample Validation</h3>
              </div>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Walk-forward analysis validates parameter stability across non-overlapping in-sample training windows and out-of-sample forward test splits.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">OPTIMIZATION WINDOW</span>
                  <span className="text-sm font-bold text-white">6 Months In-Sample</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">TESTING HORIZON</span>
                  <span className="text-sm font-bold text-sky-400">1 Month Forward</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">OVERFITTING COEFFICIENT</span>
                  <span className="text-sm font-bold text-emerald-400">0.12 (LOW RISK)</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "datasets" && (
            <div className="p-6 rounded-2xl bg-[#0F172A]/80 border border-[#1A2A3F] space-y-4 font-mono">
              <div className="flex items-center gap-2 text-sky-400">
                <Database className="h-5 w-5" />
                <h3 className="font-bold text-sm text-white">Institutional Market Datasets & Candle Repository</h3>
              </div>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Standardized tick, 1-minute, 5-minute, and daily OHLCV bars stored in high-performance SQLite / TimescaleDB with zero lookahead bias.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">BINANCE FUTURES</span>
                  <span className="text-sm font-bold text-emerald-400">142 Tickers (1m - 1d)</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">DELTA OPTIONS</span>
                  <span className="text-sm font-bold text-sky-400">BTC / ETH Expiries</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">NSE EQUITIES</span>
                  <span className="text-sm font-bold text-purple-400">NIFTY 50 Stocks</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">TOTAL REPOSITORY</span>
                  <span className="text-sm font-bold text-white">4.8 GB Indexed</span>
                </div>
              </div>
            </div>
          )}
        </ErrorBoundary>
      </div>
    </DirectPageLayout>
  );
}
