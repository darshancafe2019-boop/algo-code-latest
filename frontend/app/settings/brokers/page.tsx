"use client";

import React, { Suspense } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { UpstoxConnectionCard } from "@/components/settings/UpstoxConnectionCard";
import { SimpleConnectionsSection } from "@/components/settings/SimpleConnectionsSection";

export default function BrokerSettingsPage() {
  return (
    <DirectPageLayout activeTab="settings">
      <div className="space-y-6 max-w-[1400px] mx-auto min-w-0 font-sans pb-12">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Broker &amp; Exchange Connections
          </h1>
          <p className="text-xs text-slate-400">
            Configure live brokerage OAuth sessions and API keys for algorithmic execution.
          </p>
        </div>

        <Suspense fallback={<div className="p-8 text-center text-slate-500 font-mono text-xs">Loading broker settings...</div>}>
          <SimpleConnectionsSection />
        </Suspense>
      </div>
    </DirectPageLayout>
  );
}
