"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { CryptoFuturesTerminal } from "@/components/crypto/CryptoFuturesTerminal";
import { CryptoPositionsOrders } from "@/components/crypto/CryptoPositionsOrders";

export default function CryptoFuturesPage({
  searchParams,
}: {
  searchParams?: { underlying?: string };
}) {
  const initialUnderlying = searchParams?.underlying || "BTC";

  return (
    <DirectPageLayout activeTab="futures">
      <div className="flex flex-col gap-6">
        <CryptoFuturesTerminal initialUnderlying={initialUnderlying} />
      </div>
    </DirectPageLayout>
  );
}
