"use client";

import React from "react";
import dynamic from "next/dynamic";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";

const StrategyCenter = dynamic(
  () => import("@/components/strategy/StrategyCenter").then((mod) => mod.StrategyCenter),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 text-center text-xs text-[#7D8EA5] font-mono animate-pulse">
        Loading Quant.OS Strategy Center...
      </div>
    ),
  }
);

export default function StrategyRoutePage() {
  return (
    <DirectPageLayout activeTab="strategies">
      <StrategyCenter />
    </DirectPageLayout>
  );
}
