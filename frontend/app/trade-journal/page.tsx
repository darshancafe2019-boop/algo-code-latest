"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { PnlJournalCommandDesk } from "@/components/pnl-journal/desk/PnlJournalCommandDesk";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function TradeJournalPage() {
  return (
    <DirectPageLayout activeTab="trade-journal">
      <div className="p-3 sm:p-4 md:p-6 min-w-0 font-sans">
        <ErrorBoundary title="Trade Journal Error">
          <PnlJournalCommandDesk initialTab="JOURNAL" />
        </ErrorBoundary>
      </div>
    </DirectPageLayout>
  );
}
