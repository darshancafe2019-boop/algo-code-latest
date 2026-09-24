"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { FuturesWorkspace } from "@/src/features/markets/futures";

export default function BinanceUsdmFuturesPage() {
  return (
    <DirectPageLayout activeTab="futures">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1750px] mx-auto min-w-0 font-sans">
        <FuturesWorkspace
          activeBoard="BINANCE_USDM"
          boardTitle="Binance USDⓈ-M Futures"
          lockProvider={true}
        />
      </div>
    </DirectPageLayout>
  );
}
