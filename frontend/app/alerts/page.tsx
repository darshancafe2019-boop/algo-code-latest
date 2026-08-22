"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { AlertsMonitoring } from "@/components/alerts/AlertsMonitoring";

export default function AlertsPage() {
  return (
    <DirectPageLayout activeTab="alerts">
      <AlertsMonitoring />
    </DirectPageLayout>
  );
}
