"use client";

import React, { Suspense } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { StrategyBotCreationWorkspace } from "@/components/strategy/StrategyBotCreationWorkspace";

export default function StrategyBuilderPage() {
  return (
    <DirectPageLayout activeTab="strategies">
      <Suspense fallback={<div className="p-8 text-center text-xs text-[#7D8EA5] font-mono">Loading Strategy Workspace...</div>}>
        <StrategyBotCreationWorkspace />
      </Suspense>
    </DirectPageLayout>
  );
}
