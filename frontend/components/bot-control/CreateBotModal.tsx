"use client";

import React from "react";
import { useUIStore } from "@/lib/store/useUIStore";
import { CreateBotWizardModal } from "./CreateBotWizardModal";

/**
 * Universal Unified Bot Creation Modal
 * Connects directly to the institutional 6-step CreateBotWizardModal engine
 * guaranteeing 100% feature parity, multi-timeframe indicator confluence,
 * derivatives/options routing, and automated preflight integrity checks.
 */
export function CreateBotModal() {
  const { isCreateBotModalOpen, setCreateBotModalOpen } = useUIStore();

  return (
    <CreateBotWizardModal
      isOpen={isCreateBotModalOpen}
      onClose={() => setCreateBotModalOpen(false)}
    />
  );
}
