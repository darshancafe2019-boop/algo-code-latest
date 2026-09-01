"use client";

import React, { Suspense } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { StrategyBuilder } from "@/components/strategy/StrategyBuilder";

export default function WhatIfSimulatorPage() {
  return (
    <DirectPageLayout activeTab="strategy-builder">
      <Suspense fallback={<div className="p-8 text-center text-slate-500 font-mono text-xs">Loading what-if scenario simulator...</div>}>
        <StrategyBuilder />
      </Suspense>
    </DirectPageLayout>
  );
}
