"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { BotWizardVNext } from "@/components/bot-instance/BotWizardVNext";

export default function CreateBotPage() {
  return (
    <DirectPageLayout activeTab="control">
      <BotWizardVNext />
    </DirectPageLayout>
  );
}
