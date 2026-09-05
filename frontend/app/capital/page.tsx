"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { InstitutionalCapitalSegregationTab } from "@/components/analytics/InstitutionalCapitalSegregationTab";

export default function CapitalPage() {
  return (
    <DirectPageLayout activeTab="capital-funds">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-20">
        <InstitutionalCapitalSegregationTab />
      </div>
    </DirectPageLayout>
  );
}
