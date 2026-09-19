"use client";

import React from "react";
import { useParams } from "next/navigation";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { BotControlCenterVNext } from "@/components/bot-control/BotControlCenterVNext";

export default function BotDetailPage({ params }: { params?: { id?: string } }) {
  const routeParams = useParams();
  const botId =
    (typeof params?.id === "string" && params.id)
      ? params.id
      : (typeof routeParams?.id === "string" ? routeParams.id : Array.isArray(routeParams?.id) ? routeParams.id[0] : "");

  return (
    <DirectPageLayout activeTab="bots">
      <BotControlCenterVNext botId={botId} />
    </DirectPageLayout>
  );
}

