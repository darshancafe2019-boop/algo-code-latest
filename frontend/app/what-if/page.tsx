"use client";

import React, { Suspense } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { StrategyBotCreationWorkspace } from "@/components/strategy/StrategyBotCreationWorkspace";

export default function WhatIfSimulatorPage() {
  return (
    <DirectPageLayout activeTab="strategy-builder">
      <Suspense fallback={<div className="p-8 text-center text-slate-500 font-mono text-xs">Loading what-if scenario simulator...</div>}>
        <StrategyBotCreationWorkspace />
      </Suspense>
    </DirectPageLayout>
  );
}
