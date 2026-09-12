"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { StrategyBuilder } from "@/components/strategy/StrategyBuilder";

export default function StrategiesPage() {
  return (
    <DirectPageLayout activeTab="strategies">
      <div className="flex flex-col h-full bg-[#05101A]">
        <div className="flex-1 min-w-0">
          <StrategyBuilder />
        </div>
      </div>
    </DirectPageLayout>
  );
}
