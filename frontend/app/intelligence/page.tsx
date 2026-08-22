"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { TradingIntelligenceWorkspace } from "@/components/intelligence/TradingIntelligenceWorkspace";

export default function IntelligencePage() {
  return (
    <DirectPageLayout activeTab="intelligence">
      <TradingIntelligenceWorkspace />
    </DirectPageLayout>
  );
}
