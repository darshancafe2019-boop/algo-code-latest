"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { TerminalSettingsView } from "@/components/settings/TerminalSettingsView";

export default function SettingsPage() {
  return (
    <DirectPageLayout activeTab="settings">
      <TerminalSettingsView />
    </DirectPageLayout>
  );
}
