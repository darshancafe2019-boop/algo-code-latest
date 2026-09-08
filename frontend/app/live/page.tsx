"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { DhanLiveMarketFeed } from "@/components/live/DhanLiveMarketFeed";
import { DeltaLiveMarketFeed } from "@/components/live/DeltaLiveMarketFeed";
import { Radio, Coins, TrendingUp } from "lucide-react";

export default function LiveMarketDataPage() {
  const searchParams = useSearchParams();
  const initialProvider = (searchParams.get("provider") || "dhan").toLowerCase();
  const [activeProvider, setActiveProvider] = useState<"dhan" | "delta">(
    initialProvider === "delta" ? "delta" : "dhan"
  );

  return (
    <DirectPageLayout activeTab="live">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1750px] mx-auto min-w-0 font-sans">
        {/* Provider Switcher Tabs */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#080E20] border border-[#213047] w-fit shadow-lg">
          <button
            type="button"
            onClick={() => setActiveProvider("dhan")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
              activeProvider === "dhan"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-900/40 border border-cyan-400/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#142036]"
            }`}
          >
            <span className="text-sm">🇮🇳</span>
            <span>DHAN HQ (NSE / BSE)</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-black/40 text-cyan-300">EQUITY</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveProvider("delta")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
              activeProvider === "delta"
                ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-900/40 border border-amber-400/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#142036]"
            }`}
          >
            <Coins className="h-3.5 w-3.5 text-amber-300" />
            <span>DELTA EXCHANGE</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-black/40 text-amber-300 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              24/7 LIVE
            </span>
          </button>
        </div>

        {/* Live Feed Components */}
        {activeProvider === "dhan" ? (
          <DhanLiveMarketFeed />
        ) : (
          <DeltaLiveMarketFeed />
        )}
      </div>
    </DirectPageLayout>
  );
}
