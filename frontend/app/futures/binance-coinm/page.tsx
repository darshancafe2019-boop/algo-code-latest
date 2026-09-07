"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { FuturesUniverseView } from "@/src/features/markets/futures";

export default function BinanceCOINMFuturesPage() {
  return (
    <DirectPageLayout activeTab="futures">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1750px] mx-auto min-w-0 font-sans">
        <FuturesUniverseView
          initialSource="BINANCE"
          initialTab="UNIVERSE"
          lockSource={true}
          providerTitle="Binance Futures (USD-M & COIN-M)"
          isBinanceUnified={true}
        />
      </div>
    </DirectPageLayout>
  );
}
