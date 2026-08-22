"use client";

import { useParams } from "next/navigation";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { CreateBotWizard } from "@/components/bot-instance/CreateBotWizard";

export default function EditBotPage() {
  const params = useParams();
  const botId = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : undefined;

  return (
    <DirectPageLayout activeTab="control">
      <CreateBotWizard botId={botId} isEditMode={true} />
    </DirectPageLayout>
  );
}
