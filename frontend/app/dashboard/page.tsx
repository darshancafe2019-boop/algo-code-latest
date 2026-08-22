"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { RuntimeCommandCenter } from "@/components/command-center/RuntimeCommandCenter";

export default function DashboardPage() {
  return (
    <DirectPageLayout activeTab="command-center">
      <RuntimeCommandCenter />
    </DirectPageLayout>
  );
}
