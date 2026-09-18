"use client";

import React, { use } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { BotControlCenterVNext } from "@/components/bot-control/BotControlCenterVNext";

export default function BotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
    <DirectPageLayout activeTab="bots">
      <BotControlCenterVNext botId={resolvedParams.id} />
    </DirectPageLayout>
  );
}
