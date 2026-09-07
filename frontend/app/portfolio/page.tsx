"use client";

import React, { useState } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { InstitutionalCapitalSegregationTab } from "@/components/analytics/InstitutionalCapitalSegregationTab";
import { EcoPositionsView } from "@/components/positions/EcoPositionsView";
import { OrderExecutionCenter } from "@/components/order-execution/OrderExecutionCenter";
import { WorkspaceHeader } from "@/components/shell/WorkspaceHeader";
import { WorkspaceTabs } from "@/components/shell/WorkspaceTabs";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Landmark, CheckCircle2, DollarSign, Send } from "lucide-react";

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState<"accounts" | "positions" | "capital" | "orders">("accounts");

  const tabs = [
    { id: "accounts", label: "Broker Accounts & Balances", icon: Landmark },
    { id: "positions", label: "Open Positions & Exposure", icon: CheckCircle2 },
    { id: "capital", label: "Fund Segregation & Limits", icon: DollarSign },
    { id: "orders", label: "Orders & OMS Lifecycle", icon: Send },
  ];

  return (
    <DirectPageLayout activeTab="portfolio">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1750px] mx-auto min-w-0 font-sans">
        <WorkspaceHeader
          title="Portfolio & Capital Desk"
          subtitle="Strict multi-broker capital segregation, live position exposure, and OMS order routing"
          category="PORTFOLIO"
          source="DHAN • UPSTOX • DELTA • BINANCE"
        />

        <WorkspaceTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as any)}
        />

        <ErrorBoundary title="Portfolio View Failed">
          {activeTab === "accounts" && (
            <div className="space-y-4">
              <InstitutionalCapitalSegregationTab />
            </div>
          )}
          {activeTab === "positions" && <EcoPositionsView />}
          {activeTab === "capital" && <InstitutionalCapitalSegregationTab />}
          {activeTab === "orders" && <OrderExecutionCenter />}
        </ErrorBoundary>
      </div>
    </DirectPageLayout>
  );
}
