"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { PnlJournalCommandDesk } from "@/components/pnl-journal/desk/PnlJournalCommandDesk";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function PnlJournalPage() {
  return (
    <DirectPageLayout activeTab="pnl">
      <div className="p-3 sm:p-4 md:p-6 min-w-0 font-sans">
        <ErrorBoundary title="P&L Journal Desk Error">
          <PnlJournalCommandDesk initialTab="OVERVIEW" />
        </ErrorBoundary>
      </div>
    </DirectPageLayout>
  );
}
