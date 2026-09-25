"use client";

import React, { Suspense } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { OptionChainTerminal } from "@/components/options/terminal/OptionChainTerminal";

export default function TradingOptionsPage() {
  return (
    <DirectPageLayout activeTab="options">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1750px] mx-auto min-w-0 font-sans">
        <Suspense fallback={<div className="p-8 text-center font-mono text-slate-400">Loading Option Chain Terminal...</div>}>
          <OptionChainTerminal initialSource="DHAN" initialUnderlying="NIFTY" isSourceLocked={false} />
        </Suspense>
      </div>
    </DirectPageLayout>
  );
}
