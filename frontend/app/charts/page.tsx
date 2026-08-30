"use client";

import React, { Suspense } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { MarketUniverse } from "@/components/market-universe/MarketUniverse";

export default function ChartsPage() {
  return (
    <DirectPageLayout activeTab="markets">
      <Suspense fallback={<div className="p-8 text-center font-mono text-slate-400">Loading charts...</div>}>
        <MarketUniverse />
      </Suspense>
    </DirectPageLayout>
  );
}
