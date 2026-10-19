"use client";

import React from "react";
import { MarketHealthTelemetry } from "@/components/market/MarketHealthTelemetry";
import { ProviderCapabilityMatrix } from "@/components/market/ProviderCapabilityMatrix";

export function ProviderMatrixView() {
  return (
    <div className="w-full space-y-6 pb-12 font-sans">
      <MarketHealthTelemetry />
      <ProviderCapabilityMatrix />
    </div>
  );
}
