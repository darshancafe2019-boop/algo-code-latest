"use client";

import React, { Suspense } from "react";
import { BotCreationControlPlane } from "./BotCreationControlPlane";

interface CreateBotWizardProps {
  botId?: string;
  isEditMode?: boolean;
}

/**
 * Legacy compatibility wrapper forwarding directly to BotCreationControlPlane.
 */
export function CreateBotWizard({ botId, isEditMode = false }: CreateBotWizardProps) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400 font-mono">Loading Control Plane...</div>}>
      <BotCreationControlPlane botId={botId} isEditMode={isEditMode} />
    </Suspense>
  );
}
