"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { ProviderCapabilityMatrix } from "@/components/market/ProviderCapabilityMatrix";
import { MarketHealthTelemetry } from "@/components/market/MarketHealthTelemetry";

export default function ProvidersPage() {
  return (
    <DirectPageLayout activeTab="providers">
      <div className="space-y-6">
        <MarketHealthTelemetry />
        <ProviderCapabilityMatrix />
      </div>
    </DirectPageLayout>
  );
}
