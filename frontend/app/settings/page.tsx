import React, { Suspense } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { TerminalSettingsView } from "@/components/settings/TerminalSettingsView";

export default function SettingsPage() {
  return (
    <DirectPageLayout activeTab="settings">
      <Suspense fallback={<div className="p-8 text-center text-slate-500 font-mono text-xs">Loading terminal settings...</div>}>
        <TerminalSettingsView />
      </Suspense>
    </DirectPageLayout>
  );
}
