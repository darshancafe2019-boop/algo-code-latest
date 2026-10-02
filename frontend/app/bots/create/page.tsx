"use client";

import React, { Suspense } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { BotCreationControlPlane } from "@/components/bot-instance/BotCreationControlPlane";

export default function CreateBotPage() {
  return (
    <DirectPageLayout activeTab="bots">
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400 font-mono">Loading Bot Creation Control Plane...</div>}>
        <BotCreationControlPlane />
      </Suspense>
    </DirectPageLayout>
  );
}
