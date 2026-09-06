"use client";

import React from "react";
import { MarketHealthTelemetry } from "@/components/market/MarketHealthTelemetry";
import { ProviderCapabilityMatrix } from "@/components/market/ProviderCapabilityMatrix";

export function ProviderMatrixView() {
  return (
    <div className="space-y-6">
      <MarketHealthTelemetry />
      <ProviderCapabilityMatrix />
    </div>
  );
}
