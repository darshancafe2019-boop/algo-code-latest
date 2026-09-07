"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { OptionsUniverseView } from "@/src/features/markets/options";

export default function DeltaOptionsPage() {
  return (
    <DirectPageLayout activeTab="options">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1750px] mx-auto min-w-0 font-sans">
        <OptionsUniverseView initialSource="DELTA_INDIA" initialUnderlying="BTC" isSourceLocked={true} initialTab="CHAIN" />
      </div>
    </DirectPageLayout>
  );
}
