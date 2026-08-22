"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { CreateBotWizard } from "@/components/bot-instance/CreateBotWizard";

export default function CreateBotPage() {
  return (
    <DirectPageLayout activeTab="control">
      <CreateBotWizard isEditMode={false} />
    </DirectPageLayout>
  );
}
