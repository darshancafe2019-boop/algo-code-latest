"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { TradeOperationsWorkspace } from "@/components/trade/TradeOperationsWorkspace";

export default function TradePage() {
  return (
    <DirectPageLayout activeTab="trade">
      <TradeOperationsWorkspace />
    </DirectPageLayout>
  );
}
