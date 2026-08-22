"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { BotControlTab } from "@/components/bot-control/BotControlTab";

export default function BotsPage() {
  return (
    <DirectPageLayout activeTab="bots">
      <BotControlTab />
    </DirectPageLayout>
  );
}
