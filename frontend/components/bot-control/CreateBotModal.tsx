"use client";

import React, { Suspense } from "react";
import { useUIStore } from "@/lib/store/useUIStore";
import { BotCreationControlPlane } from "@/components/bot-instance/BotCreationControlPlane";

/**
 * Universal Unified Bot Creation Modal
 * Connects directly to the authoritative 10-step BotCreationControlPlane engine
 * guaranteeing 100% feature parity, multi-timeframe indicator confluence,
 * derivatives/options routing, and automated preflight integrity checks.
 */
export function CreateBotModal() {
  const { isCreateBotModalOpen, setCreateBotModalOpen } = useUIStore();

  if (!isCreateBotModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-7xl max-h-[96vh] overflow-y-auto rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl">
        <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400 font-mono">Loading Control Plane...</div>}>
          <BotCreationControlPlane
            isModal={true}
            onClose={() => setCreateBotModalOpen(false)}
          />
        </Suspense>
      </div>
    </div>
  );
}
