"use client";

import React, { Suspense } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { StocksUniverseView } from "@/src/features/markets/stocks";

export function StocksIntelligenceTerminal() {
  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1750px] mx-auto min-w-0 font-sans">
      <StocksUniverseView />
    </div>
  );
}

export default function StocksPage() {
  return (
    <DirectPageLayout activeTab="stocks">
      <Suspense fallback={<div className="p-8 text-center font-mono text-slate-400">Loading Stocks Screener...</div>}>
        <StocksIntelligenceTerminal />
      </Suspense>
    </DirectPageLayout>
  );
}
