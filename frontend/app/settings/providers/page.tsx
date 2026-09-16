"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { ProviderManagerFullView } from "@/components/providers/ProviderManagerFullView";

export default function SettingsProvidersPage() {
  return (
    <DirectPageLayout activeTab="settings">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <ProviderManagerFullView />
      </div>
    </DirectPageLayout>
  );
}
