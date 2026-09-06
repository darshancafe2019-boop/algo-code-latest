"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { OptionChainView } from "@/components/options/OptionChainView";

export default function BinanceOptionsPage() {
  return (
    <DirectPageLayout activeTab="options">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1750px] mx-auto min-w-0 font-sans">
        <OptionChainView initialSource="BINANCE" initialUnderlying="BTC" isSourceLocked={true} />
      </div>
    </DirectPageLayout>
  );
}
