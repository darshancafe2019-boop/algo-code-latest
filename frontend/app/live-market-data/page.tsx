"use client";

import React, { Suspense } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { LiveMarketDataTerminal } from "@/components/market-data/LiveMarketDataTerminal";

export default function LiveMarketDataPage() {
  return (
    <DirectPageLayout activeTab="live-market-data">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1750px] mx-auto min-w-0 font-sans">
        <Suspense fallback={<div className="p-8 text-center font-mono text-slate-400">Loading Live Market Data sequence...</div>}>
          <LiveMarketDataTerminal />
        </Suspense>
      </div>
    </DirectPageLayout>
  );
}
