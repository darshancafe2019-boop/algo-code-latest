"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { InstitutionalCapitalSegregationTab } from "@/components/analytics/InstitutionalCapitalSegregationTab";

export default function CapitalFundsPageRoute() {
  return (
    <DirectPageLayout activeTab="capital-funds">
      <div className="w-full pb-12">
        <InstitutionalCapitalSegregationTab />
      </div>
    </DirectPageLayout>
  );
}
