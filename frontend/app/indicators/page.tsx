"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { IndicatorCenter } from "@/components/indicators/IndicatorCenter";

export default function IndicatorsPage() {
  return (
    <DirectPageLayout activeTab="indicators">
      <IndicatorCenter />
    </DirectPageLayout>
  );
}
