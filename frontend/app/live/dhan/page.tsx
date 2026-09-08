"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { DhanLiveMarketFeed } from "@/components/live/DhanLiveMarketFeed";

export default function DhanLiveMarketPage() {
  return (
    <DirectPageLayout activeTab="live">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1750px] mx-auto min-w-0 font-sans">
        <DhanLiveMarketFeed />
      </div>
    </DirectPageLayout>
  );
}
