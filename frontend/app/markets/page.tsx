"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { MarketUniverse } from "@/components/market-universe/MarketUniverse";

export default function MarketsPage() {
  return (
    <DirectPageLayout activeTab="markets">
      <MarketUniverse />
    </DirectPageLayout>
  );
}
