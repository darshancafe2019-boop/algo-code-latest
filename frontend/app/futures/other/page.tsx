"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { FuturesOtherProvidersView } from "@/src/features/markets/futures";

export default function OtherFuturesProvidersPage() {
  return (
    <DirectPageLayout activeTab="futures">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1750px] mx-auto min-w-0 font-sans">
        <FuturesOtherProvidersView />
      </div>
    </DirectPageLayout>
  );
}
