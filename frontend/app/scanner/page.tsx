"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { IndicatorCenter } from "@/components/indicators/IndicatorCenter";

export default function ScannerPage() {
  return (
    <DirectPageLayout activeTab="scanner">
      <IndicatorCenter />
    </DirectPageLayout>
  );
}
