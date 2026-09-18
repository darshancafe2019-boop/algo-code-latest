"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { PositionIntelligenceCommandCenter } from "@/components/positions/PositionIntelligenceCommandCenter";

export default function PositionsPage() {
  return (
    <DirectPageLayout activeTab="positions">
      <div className="p-3 sm:p-4 md:p-6 max-w-[1750px] mx-auto min-w-0 font-sans">
        <PositionIntelligenceCommandCenter />
      </div>
    </DirectPageLayout>
  );
}
