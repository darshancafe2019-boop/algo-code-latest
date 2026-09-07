"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { FuturesUniverseView } from "@/src/features/markets/futures";

export default function GlobalFuturesPage() {
  return (
    <DirectPageLayout activeTab="futures">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1750px] mx-auto min-w-0 font-sans">
        <FuturesUniverseView
          initialSource="CME"
          initialTab="UNIVERSE"
          lockSource={true}
          providerTitle="CME / Global Futures (Index, Commodities & FX)"
        />
      </div>
    </DirectPageLayout>
  );
}
