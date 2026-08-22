"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { OptionChainView } from "@/components/options/OptionChainView";

export default function OptionsPage() {
  return (
    <DirectPageLayout activeTab="options">
      <OptionChainView />
    </DirectPageLayout>
  );
}
