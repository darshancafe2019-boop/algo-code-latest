"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { RiskManagement } from "@/components/risk-management/RiskManagement";

export default function RiskPage() {
  return (
    <DirectPageLayout activeTab="risk">
      <RiskManagement />
    </DirectPageLayout>
  );
}
