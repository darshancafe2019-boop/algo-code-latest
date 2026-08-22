"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { TradeJournal } from "@/components/trade-journal/TradeJournal";

export default function TradeJournalPage() {
  return (
    <DirectPageLayout activeTab="trade-journal">
      <TradeJournal />
    </DirectPageLayout>
  );
}
