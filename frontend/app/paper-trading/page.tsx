"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { BotControlTab } from "@/components/bot-control/BotControlTab";

export default function PaperTradingPage() {
  return (
    <DirectPageLayout activeTab="bot-control">
      <BotControlTab />
    </DirectPageLayout>
  );
}
