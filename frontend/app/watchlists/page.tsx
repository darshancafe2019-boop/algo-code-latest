"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { WatchlistsView } from "@/components/watchlists/WatchlistsView";

export default function WatchlistsPage() {
  return (
    <DirectPageLayout activeTab="watchlist">
      <WatchlistsView />
    </DirectPageLayout>
  );
}

