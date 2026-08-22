"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { OptionStrategyBuilder } from "@/components/crypto/OptionStrategyBuilder";
import { CryptoPositionsOrders } from "@/components/crypto/CryptoPositionsOrders";

export default function CryptoOptionsStudioPage() {
  return (
    <DirectPageLayout activeTab="crypto-options">
      <div className="flex flex-col gap-6">
        <OptionStrategyBuilder />
        <CryptoPositionsOrders />
      </div>
    </DirectPageLayout>
  );
}
