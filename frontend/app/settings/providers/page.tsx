"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { ProviderManagerFullView } from "@/components/providers/ProviderManagerFullView";

export default function SettingsProvidersPage() {
  return (
    <DirectPageLayout activeTab="settings">
      <div className="w-full pb-12">
        <ProviderManagerFullView />
      </div>
    </DirectPageLayout>
  );
}
