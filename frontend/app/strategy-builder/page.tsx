"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { StrategyBuilder } from "@/components/strategy/StrategyBuilder";

export default function StrategyBuilderPage() {
  return (
    <DirectPageLayout activeTab="strategy-builder">
      <StrategyBuilder />
    </DirectPageLayout>
  );
}
