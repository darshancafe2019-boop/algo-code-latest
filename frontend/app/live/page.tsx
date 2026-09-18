"use client";

import React, { Suspense } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { MarketCommandCenter } from "@/components/live/MarketCommandCenter";

export default function LiveMarketDataPage() {
  return (
    <DirectPageLayout activeTab="live">
      <Suspense fallback={<div className="p-8 text-center text-slate-400 font-mono">Loading Multi-Provider Live Market Command Center...</div>}>
        <MarketCommandCenter />
      </Suspense>
    </DirectPageLayout>
  );
}
