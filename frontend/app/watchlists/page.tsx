"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { MarketUniverse } from "@/components/market-universe/MarketUniverse";

export default function WatchlistsPage() {
  return (
    <DirectPageLayout activeTab="watchlist">
      <MarketUniverse />
    </DirectPageLayout>
  );
}
