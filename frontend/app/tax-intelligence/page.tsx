"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { TaxIntelligenceTab } from "@/components/tax-intelligence/TaxIntelligenceTab";

export default function TaxIntelligencePage() {
  return (
    <DirectPageLayout activeTab="tax">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1750px] mx-auto min-w-0 font-sans">
        <TaxIntelligenceTab />
      </div>
    </DirectPageLayout>
  );
}

