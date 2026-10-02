"use client";

import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { BotCreationControlPlane } from "@/components/bot-instance/BotCreationControlPlane";

export default function EditBotPage() {
  const params = useParams();
  const botId = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : undefined;

  return (
    <DirectPageLayout activeTab="control">
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400 font-mono">Loading Edit Bot Workspace...</div>}>
        <BotCreationControlPlane botId={botId} isEditMode={true} />
      </Suspense>
    </DirectPageLayout>
  );
}
