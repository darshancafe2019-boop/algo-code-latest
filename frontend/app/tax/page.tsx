"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { InstitutionalTaxIntelligenceTerminal } from "@/components/tax-intelligence/InstitutionalTaxIntelligenceTerminal";

export default function TaxPage() {
  return (
    <DirectPageLayout activeTab="tax">
      <div className="w-full min-h-screen bg-[#020B14]">
        <InstitutionalTaxIntelligenceTerminal />
      </div>
    </DirectPageLayout>
  );
}

