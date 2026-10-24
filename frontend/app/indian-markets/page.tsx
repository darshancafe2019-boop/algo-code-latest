"use client";

import React, { Suspense } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { NseMarketStrip } from "@/components/nse/NseMarketStrip";
import { NseAlgoBotPanel } from "@/components/nse/NseAlgoBotPanel";
import { NseOptionChainTerminal } from "@/components/nse/NseOptionChainTerminal";
import { NseComprehensiveIntelligence } from "@/components/nse/NseComprehensiveIntelligence";
import { NseDerivativesHub } from "@/components/nse/NseDerivativesHub";
import { UpstoxMarketDataPanel } from "@/components/upstox/UpstoxMarketDataPanel";
import { UpstoxDevTestPanel } from "@/components/upstox/UpstoxDevTestPanel";
import { Sparkles, Activity } from "lucide-react";

export function IndianMarketsTerminal() {
  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6 max-w-[1750px] mx-auto min-w-0 font-sans text-slate-100 select-none">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#0A1422] border border-[#12304A] rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#22D3EE]/10 border border-[#22D3EE]/30 text-[#22D3EE]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono text-white tracking-wide">
                INDIAN MARKETS INTELLIGENCE
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#00E89A]/10 text-[#00E89A] border border-[#00E89A]/30 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00E89A] animate-pulse" />
                NSE / BSE AUTHORITATIVE
              </span>
            </div>
            <p className="text-xs text-[#7D8EA5]">
              Real-time NIFTY 50, BANKNIFTY, FINNIFTY, SENSEX, Equities, Derivatives, OI Spurts & Greeks Solver
            </p>
          </div>
        </div>
      </div>

      {/* 1. Market Overview Strip */}
      <NseMarketStrip />

      {/* Upstox & Dhan Live Feed Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpstoxMarketDataPanel />
        <UpstoxDevTestPanel />
      </div>

      {/* 2. Automated Algorithmic Trading Hub */}
      <NseAlgoBotPanel />

      {/* 3. Live Option Chain Terminal & Greeks Solver */}
      <NseOptionChainTerminal />

      {/* 4. Comprehensive Market Matrix (Valuation, Pre-Market, OI Spurts) */}
      <NseComprehensiveIntelligence />

      {/* 5. Derivatives Hub & Corporate Events */}
      <NseDerivativesHub />
    </div>
  );
}

export default function IndianMarketsPage() {
  return (
    <DirectPageLayout activeTab="indian-markets">
      <Suspense fallback={<div className="p-8 text-center font-mono text-slate-400">Loading Indian Markets Terminal...</div>}>
        <IndianMarketsTerminal />
      </Suspense>
    </DirectPageLayout>
  );
}
