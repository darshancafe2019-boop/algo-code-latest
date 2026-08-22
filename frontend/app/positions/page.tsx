"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { EcoPositionsView } from "@/components/positions/EcoPositionsView";

export default function PositionsPage() {
  return (
    <DirectPageLayout activeTab="positions">
      <EcoPositionsView />
    </DirectPageLayout>
  );
}
