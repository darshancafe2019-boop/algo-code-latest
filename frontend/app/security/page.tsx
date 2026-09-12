"use client";

import React, { Suspense } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { ProductionSecurityControlCenter } from "@/components/security/ProductionSecurityControlCenter";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function SecurityPage() {
  return (
    <DirectPageLayout activeTab="security">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1750px] mx-auto min-w-0 font-sans">
        <ErrorBoundary title="Security Center Failed">
          <Suspense fallback={<div className="p-8 text-center font-mono text-slate-400">Loading security center...</div>}>
            <ProductionSecurityControlCenter />
          </Suspense>
        </ErrorBoundary>
      </div>
    </DirectPageLayout>
  );
}

