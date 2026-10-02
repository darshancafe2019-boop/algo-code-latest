"use client";

import React, { Suspense } from "react";
import { BotCreationControlPlane } from "./BotCreationControlPlane";

/**
 * Authoritative Bot Creation Control Plane wrapper.
 */
export function BotWizardVNext() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400 font-mono">Loading Control Plane...</div>}>
      <BotCreationControlPlane />
    </Suspense>
  );
}
