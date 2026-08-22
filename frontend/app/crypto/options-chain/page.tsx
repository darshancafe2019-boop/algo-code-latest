"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { CryptoOptionChainTerminal } from "@/components/crypto/CryptoOptionChainTerminal";

export default function CryptoOptionChainPage({
  searchParams,
}: {
  searchParams?: { underlying?: string };
}) {
  const initialUnderlying = searchParams?.underlying || "BTC";

  return (
    <DirectPageLayout activeTab="crypto-options-chain">
      <div className="flex flex-col gap-6">
        <CryptoOptionChainTerminal initialUnderlying={initialUnderlying} />
      </div>
    </DirectPageLayout>
  );
}
