"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { OptionChainTerminal } from "@/components/options/terminal/OptionChainTerminal";

export default function TradingOptionsPage() {
  return (
    <DirectPageLayout activeTab="options">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1750px] mx-auto min-w-0 font-sans">
        <OptionChainTerminal initialSource="DHAN" initialUnderlying="NIFTY" isSourceLocked={false} />
      </div>
    </DirectPageLayout>
  );
}
