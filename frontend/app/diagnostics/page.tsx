"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { SystemHealthHub } from "@/components/system-health/SystemHealthHub";

export default function DiagnosticsPage() {
  return (
    <DirectPageLayout activeTab="diagnostics">
      <SystemHealthHub />
    </DirectPageLayout>
  );
}
