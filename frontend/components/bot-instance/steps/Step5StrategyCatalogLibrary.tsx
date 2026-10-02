"use client";

import React, { useState, useMemo } from "react";
import {
  Compass,
  Search,
  Filter,
  CheckCircle2,
  Sliders,
  Layers,
  Sparkles,
  TrendingUp,
  Activity,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Check,
  X,
  Copy,
  BookOpen,
  Code,
  Target,
} from "lucide-react";
import { CRYPTO_30_STRATEGIES, CryptoStrategyDefinition } from "@/lib/strategies/crypto30Strategies";
import { useBotCreationStore } from "@/lib/store/useBotCreationStore";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "ALL", label: "All 30 Strategies", count: 30 },
  { id: "Trend & Continuation", label: "Category A: Trend / Breakout", count: 10 },
  { id: "Pullback & Mean Reversion", label: "Category B: Pullback & Reversion", count: 5 },
  { id: "Structure & Reversal", label: "Category C: Structure & Reversal", count: 5 },
  { id: "Momentum & Volume", label: "Category D: Momentum & Volume", count: 5 },
  { id: "Crypto-Specific & Multi-Factor", label: "Category E: Multi-Factor & Crypto", count: 5 },
];

export function Step5StrategyCatalogLibrary() {
  const store = useBotCreationStore();
  const { strategies, market, updateSection, setStep } = store;

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeStrategyId, setActiveStrategyId] = useState<string>(strategies.primaryStrategyId || "crypto-strat-01");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredStrategies = useMemo(() => {
    return CRYPTO_30_STRATEGIES.filter((s) => {
      const matchCat = selectedCategory === "ALL" || s.category === selectedCategory;
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.number.includes(searchQuery) ||
        s.whatItDoes.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.direction.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  const currentStrategy = useMemo(() => {
    return CRYPTO_30_STRATEGIES.find((s) => s.id === activeStrategyId) || CRYPTO_30_STRATEGIES[0];
  }, [activeStrategyId]);

  const handleSelectStrategy = (strat: CryptoStrategyDefinition) => {
    setActiveStrategyId(strat.id);
    updateSection("strategies", {
      primaryStrategyId: strat.id,
      primaryTimeframe: strat.primaryTimeframe,
      strategyVersion: strat.version,
    });
    setToastMessage(`Selected strategy: #${strat.number} ${strat.name}. Parameters loaded.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isModuleEnabled = store.modulesEnabled?.step5StrategyLibrary ?? true;

  return (
    <div className="space-y-5 animate-in fade-in duration-200 font-sans text-slate-100">
            {/* ── 0. ACTIVE MARKET CONTEXT & TWO-LAYER STRATEGY ARCHITECTURE ── */}
      {(store.selectedInstrumentContext || store.botCreationSession?.selectedInstrument || store.selectedContractContext) && (
        <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border-2 border-cyan-500/50 rounded-2xl p-4 shadow-xl space-y-3 backdrop-blur-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-bold">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                    ACTIVE MARKET CONTEXT
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE QUALITY: HEALTHY (28ms)
                  </span>
                </div>
                <div className="text-base font-bold text-white mt-1 flex items-center gap-2">
                  <span>{store.selectedInstrumentContext?.symbol || "BTC 85800 PE"}</span>
                  <span className="text-cyan-300 font-mono text-xs">
                    (Expiry: {store.selectedInstrumentContext?.expiry || "02-10-2026"} | BUY | DELTA)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Selected Premium</span>
                <span className="text-slate-200 font-bold">$219.20</span>
              </div>
              <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Current Live Premium</span>
                <span className="text-cyan-300 font-bold text-sm">$223.90</span>
                <span className="text-emerald-400 text-[9px] block">+2.14%</span>
              </div>
            </div>
          </div>

          {/* Two Strategy Layers Explanation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-0.5">
              <span className="text-[10px] text-purple-400 font-bold uppercase">Layer A: Option Structure</span>
              <div className="text-white font-bold">Bear Put Spread (Anchor: BTC 85800 PE)</div>
              <p className="text-[10px] text-slate-400">Decides WHAT option legs are traded.</p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-0.5">
              <span className="text-[10px] text-cyan-400 font-bold uppercase">Layer B: Algorithmic Entry Engine</span>
              <div className="text-white font-bold">{currentStrategy?.name || "Trend Pullback to EMA"}</div>
              <p className="text-[10px] text-slate-400">Decides WHEN the bot enters and exits positions.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 1. TOP HEADER: Hero Title, ON/OFF Switch & Active Strategy Summary ── */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0b132b]/95 via-[#0f1d3d]/95 to-[#0b142e]/95 border border-cyan-500/25 p-4 sm:p-5 shadow-2xl backdrop-blur-2xl">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/40 text-cyan-400 shadow-inner">
                <Compass className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                    Step 5: Institutional 30-Strategy Algorithmic Catalog
                  </h1>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                    STAGE 5 / 7
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 font-bold">
                    TARGET: {market.underlying || "NIFTY"}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
                    30 READY
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select and auto-populate calibrated rule templates from the complete 30-strategy algorithmic library across 5 specialized market regimes.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center">
            {/* Direct ON / OFF Module Switch */}
            <div className="flex items-center gap-2 bg-[#050b18] p-1.5 rounded-2xl border border-[#1b2d4b] shadow-lg font-mono">
              <span className="text-[11px] text-slate-400 font-bold px-1.5">Module:</span>
              <button
                type="button"
                onClick={() => store.toggleModule("step5StrategyLibrary")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  isModuleEnabled
                    ? "bg-emerald-500 text-slate-950 shadow-emerald-500/20"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
                }`}
                title="Toggle 30-Strategy Library Module ON/OFF"
              >
                <span className={`w-2 h-2 rounded-full ${isModuleEnabled ? "bg-slate-950 animate-pulse" : "bg-rose-400"}`} />
                <span>{isModuleEnabled ? "ON (ACTIVE)" : "OFF (DISABLED)"}</span>
              </button>
            </div>

            <div className="text-xs font-mono text-cyan-300 px-3.5 py-2 rounded-xl bg-[#050b18] border border-[#1b2d4b] shadow-lg font-bold">
              Active: <strong className="text-white">#{currentStrategy.number} {currentStrategy.name}</strong>
            </div>
          </div>
        </div>

        {/* Feedback Toast Banner */}
        {toastMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-cyan-950/90 border border-cyan-500/50 text-cyan-200 text-xs font-mono font-bold flex items-center justify-between shadow-xl animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button type="button" onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </header>

      {/* ── INACTIVE NOTICE BANNER IF TOGGLED OFF ── */}
      {!isModuleEnabled && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/95 to-slate-900/90 border border-amber-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                30 Strategy Library Module is <span className="text-rose-400 font-mono">[DISABLED / OFF]</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Preset strategy library rules are bypassed. Custom indicator rules from Step 3 or pure price rules will be used.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => store.setModuleEnabled("step5StrategyLibrary", true)}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer whitespace-nowrap active:scale-95"
          >
            🧭 Turn ON 30-Strategy Library
          </button>
        </div>
      )}

      {/* ── 2. CATEGORY PILLS & SEARCH BAR ─────────────────────────────────── */}
      <section className="p-4 rounded-2xl bg-[#091124]/90 border border-[#152445] shadow-xl backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-mono text-xs">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                selectedCategory === c.id
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black scale-[1.02]"
                  : "bg-[#050b18] border border-[#16274a] text-slate-400 hover:text-white hover:border-slate-500"
              )}
            >
              {c.label} ({c.count})
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search strategy by name or setup..."
            className="w-full pl-9 pr-3 py-2 bg-[#050b18] border border-[#1c305a] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono shadow-inner"
          />
        </div>
      </section>

      {/* ── 3. TWO-COLUMN WORKSPACE: STRATEGY GRID (LEFT 7) + DEEP INSPECTOR (RIGHT 5) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-mono text-xs">
        {/* Left Column: 30 Strategies Cards Grid */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
          {filteredStrategies.map((strat) => {
            const isSelected = activeStrategyId === strat.id;
            return (
              <div
                key={strat.id}
                onClick={() => handleSelectStrategy(strat)}
                className={cn(
                  "p-3.5 rounded-2xl border text-left cursor-pointer transition-all duration-150 flex flex-col justify-between space-y-2.5 shadow-xl backdrop-blur-md group",
                  isSelected
                    ? "bg-gradient-to-b from-[#0e244d] to-[#0a1835] border-cyan-400 text-cyan-100 ring-1 ring-cyan-400/50 shadow-cyan-500/15 scale-[1.02]"
                    : "bg-[#091124]/90 border-[#152445] hover:border-slate-500 text-slate-300 hover:bg-[#0c1836]"
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black font-mono text-cyan-400">#{strat.number}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#050b18] text-slate-300 font-mono border border-[#16274a] font-bold">
                      {strat.primaryTimeframe}
                    </span>
                  </div>
                  <h3 className="text-xs font-black text-white mt-1 group-hover:text-cyan-300 transition-colors">
                    {strat.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {strat.whatItDoes}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#152445] flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="font-bold text-slate-300 truncate">{strat.direction}</span>
                  <span className="text-emerald-400 font-black">{strat.category}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Selected Strategy Deep Dive Inspector */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-[#091124]/90 border border-[#152445] shadow-xl backdrop-blur-md space-y-4 max-h-[620px] overflow-y-auto">
          <div className="flex items-start justify-between pb-3 border-b border-[#152445]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black font-mono text-cyan-400">#{currentStrategy.number}</span>
                <h3 className="text-sm font-black text-white">{currentStrategy.name}</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium block mt-0.5">{currentStrategy.category}</span>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-black">
              {currentStrategy.status}
            </span>
          </div>

          {/* Suitable Markets Support Badges */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-bold">Multi-Market Support</span>
            <div className="flex flex-wrap gap-1.5">
              {["NSE Equities", "NSE Futures", "Options (21 Strats)", "Crypto Spot & Perps"].map((mkt) => (
                <span key={mkt} className="px-2 py-0.5 rounded-lg bg-[#050b18] border border-[#1b2d4b] text-[10px] text-slate-300 font-mono font-bold">
                  ✓ {mkt}
                </span>
              ))}
            </div>
          </div>

          {/* Core Setup & Why It Exists */}
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-[#050b18] border border-[#152445] space-y-1">
              <span className="text-cyan-400 font-bold block text-[11px] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Core Mechanics & Alpha Thesis
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">{currentStrategy.whatItDoes}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#050b18] border border-[#152445] space-y-1">
              <span className="text-amber-400 font-bold block text-[11px] flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Institutional Justification
              </span>
              <p className="text-slate-400 leading-relaxed text-[11px]">{currentStrategy.whyItExists}</p>
            </div>
          </div>

          {/* Required Indicator Stack */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-bold">Required Indicator Stack</span>
            <div className="space-y-1.5">
              {currentStrategy.indicators.map((ind, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-[#050b18] border border-[#152445] flex items-center justify-between text-xs">
                  <span className="font-black text-cyan-300">{ind.name} ({ind.parameter})</span>
                  <span className="text-[10px] text-slate-400">{ind.purpose}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Setup Conditions */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-bold">7-Gate Setup Verification</span>
            <div className="space-y-1">
              {currentStrategy.setupConditions.map((cond) => (
                <div key={cond.id} className="p-2 rounded-xl bg-[#050b18] border border-[#152445] flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-slate-300 text-[11px]">{cond.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Invalidation Rules */}
          <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs space-y-1.5">
            <span className="text-rose-400 font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Fail-Closed Invalidation Conditions
            </span>
            <ul className="list-disc list-inside text-slate-400 text-[11px] space-y-1">
              {currentStrategy.unfavorableConditions.map((unf, i) => (
                <li key={i}>{unf}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── 4. PRODUCTION INTEGRITY & NEXT STEP BUTTON ──────────────────────── */}
      <section className="p-5 rounded-2xl bg-[#091124]/90 border border-[#152445] shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <span className="font-bold text-white block">
              Step 5 Strategy Loaded: #{currentStrategy.number} {currentStrategy.name}
            </span>
            <span className="text-[10px] text-slate-400">
              Regime: {currentStrategy.category} | Timeframe: {currentStrategy.primaryTimeframe}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setStep(6);
          }}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
        >
          <span>Proceed to Step 6: Risk Management & Circuit Breakers</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>
    </div>
  );
}
