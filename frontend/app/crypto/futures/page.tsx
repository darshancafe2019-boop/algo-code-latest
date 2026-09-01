"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { FuturesUniverseView } from "@/src/features/markets/futures";

export default function CryptoFuturesPage() {
  return (
    <DirectPageLayout activeTab="futures">
      <div className="flex flex-col gap-6">
        <FuturesUniverseView />
      </div>
    </DirectPageLayout>
  );
}
