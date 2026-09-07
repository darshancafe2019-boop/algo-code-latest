"use client";

import React, { useState } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { PerformanceAnalytics } from "@/components/analytics/PerformanceAnalytics";
import { TradeJournal } from "@/components/trade-journal/TradeJournal";
import { TaxIntelligenceTab } from "@/components/tax-intelligence/TaxIntelligenceTab";
import { WorkspaceHeader } from "@/components/shell/WorkspaceHeader";
import { WorkspaceTabs } from "@/components/shell/WorkspaceTabs";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DollarSign, BookOpen, Scale } from "lucide-react";

export default function PnlJournalPage() {
  const [activeTab, setActiveTab] = useState<"performance" | "journal" | "tax">("performance");

  const tabs = [
    { id: "performance", label: "P&L Analytics & Ledger", icon: DollarSign },
    { id: "journal", label: "Trade Journal & Review", icon: BookOpen },
    { id: "tax", label: "Tax Intelligence & Fees", icon: Scale },
  ];

  return (
    <DirectPageLayout activeTab="pnl">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1750px] mx-auto min-w-0 font-sans">
        <WorkspaceHeader
          title="P&L Journal & Accounting Desk"
          subtitle="Authoritative fill-to-ledger realized & unrealized P&L, multi-broker attribution, and fee accounting"
          category="P&L JOURNAL"
          source="CANONICAL P&L ENGINE"
        />

        <WorkspaceTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as any)}
        />

        <ErrorBoundary title="P&L Journal View Failed">
          {activeTab === "performance" && <PerformanceAnalytics />}
          {activeTab === "journal" && <TradeJournal />}
          {activeTab === "tax" && <TaxIntelligenceTab />}
        </ErrorBoundary>
      </div>
    </DirectPageLayout>
  );
}
