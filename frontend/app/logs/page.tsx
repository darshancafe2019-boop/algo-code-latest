"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { LogsDebugging } from "@/components/logs/LogsDebugging";

export default function LogsPage() {
  return (
    <DirectPageLayout activeTab="logs">
      <LogsDebugging />
    </DirectPageLayout>
  );
}
