"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { PerformanceAnalytics } from "@/components/analytics/PerformanceAnalytics";

export default function PortfolioPnlPage() {
  return (
    <DirectPageLayout activeTab="pnl">
      <PerformanceAnalytics />
    </DirectPageLayout>
  );
}
