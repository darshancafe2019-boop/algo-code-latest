"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { StrategyBuilder } from "@/components/strategy/StrategyBuilder";

export default function StrategiesPage() {
  return (
    <DirectPageLayout activeTab="strategies">
      <StrategyBuilder />
    </DirectPageLayout>
  );
}
