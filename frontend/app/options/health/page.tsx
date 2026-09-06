"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { OptionsHealthView } from "@/src/features/markets/options";

export default function OptionsHealthPage() {
  return (
    <DirectPageLayout activeTab="options">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1750px] mx-auto min-w-0 font-sans">
        <OptionsHealthView />
      </div>
    </DirectPageLayout>
  );
}
