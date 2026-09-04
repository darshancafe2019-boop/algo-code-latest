"use client";

import React, { useState } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { OptionChainView } from "@/components/options/OptionChainView";
import { NseMarketStrip } from "@/components/nse/NseMarketStrip";
import { NseAlgoBotPanel } from "@/components/nse/NseAlgoBotPanel";
import { NseOptionChainTerminal } from "@/components/nse/NseOptionChainTerminal";
import { NseComprehensiveIntelligence } from "@/components/nse/NseComprehensiveIntelligence";
import { NseDerivativesHub } from "@/components/nse/NseDerivativesHub";
import { Globe, Sparkles } from "lucide-react";

export default function OptionChainPage() {
  const [assetClass, setAssetClass] = useState<"NSE" | "CRYPTO">("NSE");

  return (
    <DirectPageLayout activeTab="options">
      <div className="p-4 md:p-6 space-y-6 max-w-[1700px] mx-auto">
        {/* Asset Class Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#0B132B]/90 border border-slate-800 rounded-2xl backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono text-white tracking-wide">
                Institutional Option Chain Terminal
              </h1>
              <p className="text-xs text-slate-400">
                Greeks Solver, Strike Analytics, PCR, Max Pain & 1-Click Execution
              </p>
            </div>
          </div>

          {/* Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs">
            <button
              onClick={() => setAssetClass("NSE")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
                assetClass === "NSE"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              NSE India (NIFTY / F&O)
            </button>
            <button
              onClick={() => setAssetClass("CRYPTO")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
                assetClass === "CRYPTO"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Crypto Options (BTC / ETH)
            </button>
          </div>
        </div>

        {/* Content View */}
        {assetClass === "NSE" ? (
          <div className="space-y-6">
            <NseMarketStrip />
            <NseAlgoBotPanel />
            <NseOptionChainTerminal />
            <NseComprehensiveIntelligence />
            <NseDerivativesHub />
          </div>
        ) : (
          <OptionChainView />
        )}
      </div>
    </DirectPageLayout>
  );
}
