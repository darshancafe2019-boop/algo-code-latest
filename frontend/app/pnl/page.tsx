"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { PerformanceAnalytics } from "@/components/analytics/PerformanceAnalytics";

export default function PnlPage() {
  return (
    <DirectPageLayout activeTab="pnl">
      <PerformanceAnalytics />
    </DirectPageLayout>
  );
}
