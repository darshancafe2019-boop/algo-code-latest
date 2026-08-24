"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { NseMarketStrip } from "@/components/nse/NseMarketStrip";
import { NseAlgoBotPanel } from "@/components/nse/NseAlgoBotPanel";
import { NseCandleTerminal } from "@/components/nse/NseCandleTerminal";
import { NseOptionChainTerminal } from "@/components/nse/NseOptionChainTerminal";
import { NseComprehensiveIntelligence } from "@/components/nse/NseComprehensiveIntelligence";
import { NseDerivativesHub } from "@/components/nse/NseDerivativesHub";
import { Sparkles } from "lucide-react";

export default function NseTerminalPage() {
  return (
    <DirectPageLayout activeTab="options">
      <div className="p-4 md:p-6 space-y-6 max-w-[1700px] mx-auto">
        {/* Header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#0B132B]/90 border border-slate-800 rounded-2xl backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono text-white tracking-wide">
                NSE India Market & Algorithmic Trading Bot Terminal
              </h1>
              <p className="text-xs text-slate-400">
                Authoritative Live NIFTY/BANKNIFTY Multi-Timeframe Candlesticks, Greeks Solver, OI Spurts & Automated Bots
              </p>
            </div>
          </div>
        </div>

        {/* 1. Market Overview Strip */}
        <NseMarketStrip />

        {/* 2. Automated Algorithmic Trading Bot Hub */}
        <NseAlgoBotPanel />

        {/* 3. Multi-Timeframe Candlestick Feed & Scrip Search */}
        <NseCandleTerminal />

        {/* 4. Live Option Chain Terminal & Greeks Solver */}
        <NseOptionChainTerminal />

        {/* 5. Comprehensive Market Matrix (Valuation, Pre-Market, OI Spurts, Insiders) */}
        <NseComprehensiveIntelligence />

        {/* 6. Derivatives Hub & Corporate Events */}
        <NseDerivativesHub />
      </div>
    </DirectPageLayout>
  );
}
