"use client";

import React, { Suspense } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { BotCreationControlPlane } from "@/components/bot-instance/BotCreationControlPlane";

export default function StrategyCreatePage() {
  return (
    <DirectPageLayout activeTab="strategies">
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400 font-mono">Loading Strategy Workspace...</div>}>
        <BotCreationControlPlane />
      </Suspense>
    </DirectPageLayout>
  );
}
