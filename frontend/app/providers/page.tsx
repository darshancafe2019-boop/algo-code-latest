"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { CentralDataInfrastructureMonitor } from "@/components/market/CentralDataInfrastructureMonitor";
import { ProviderCapabilityMatrix } from "@/components/market/ProviderCapabilityMatrix";
import { MarketHealthTelemetry } from "@/components/market/MarketHealthTelemetry";

export default function ProvidersPage() {
  return (
    <DirectPageLayout activeTab="providers">
      <div className="space-y-8 pb-12">
        <CentralDataInfrastructureMonitor />
        <ProviderCapabilityMatrix />
        <MarketHealthTelemetry />
      </div>
    </DirectPageLayout>
  );
}
