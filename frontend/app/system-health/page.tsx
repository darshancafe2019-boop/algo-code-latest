"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { SystemHealthHub } from "@/components/system-health/SystemHealthHub";

export default function SystemHealthPage() {
  return (
    <DirectPageLayout activeTab="system-health">
      <SystemHealthHub />
    </DirectPageLayout>
  );
}
