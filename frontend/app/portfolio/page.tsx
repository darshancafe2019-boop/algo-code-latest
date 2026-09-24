"use client";

import React, { useState } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { InstitutionalPortfolioDashboard } from "@/components/portfolio/InstitutionalPortfolioDashboard";
import { InstitutionalCapitalSegregationTab } from "@/components/analytics/InstitutionalCapitalSegregationTab";
import { EcoPositionsView } from "@/components/positions/EcoPositionsView";
import { OrderExecutionCenter } from "@/components/order-execution/OrderExecutionCenter";
import { WorkspaceHeader } from "@/components/shell/WorkspaceHeader";
import { WorkspaceTabs } from "@/components/shell/WorkspaceTabs";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QuantDataCorePortfolioView } from "@/components/portfolio/QuantDataCorePortfolioView";
import { LiveStreamObservatory } from "@/components/stream/LiveStreamObservatory";
import {
  LayoutDashboard,
  Landmark,
  CheckCircle2,
  DollarSign,
  Send,
  Activity,
} from "lucide-react";

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "accounts" | "positions" | "capital" | "orders" | "stream"
  >("overview");

  const tabs = [
    { id: "overview", label: "Quant Terminal Overview", icon: LayoutDashboard },
    { id: "accounts", label: "Broker Accounts & Balances", icon: Landmark },
    { id: "positions", label: "Open Positions & Exposure", icon: CheckCircle2 },
    { id: "capital", label: "Fund Segregation & Limits", icon: DollarSign },
    { id: "orders", label: "Orders & OMS Lifecycle", icon: Send },
    { id: "stream", label: "Live Event Stream", icon: Activity },
  ];

  return (
    <DirectPageLayout activeTab="portfolio">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1750px] mx-auto min-w-0 font-sans">
        <WorkspaceHeader
          title="Institutional Portfolio & Terminal Desk"
          subtitle="Authoritative QuantDataCore multi-broker capital aggregation, live MTM risk engine, OMS execution routing & factor attribution"
          category="PORTFOLIO"
          source="DHAN • UPSTOX • ANGEL • DELTA • BINANCE • PAPER"
        />

        <WorkspaceTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as any)}
        />

        <ErrorBoundary title="Portfolio View Failed">
          {activeTab === "overview" && <InstitutionalPortfolioDashboard />}
          {activeTab === "accounts" && <QuantDataCorePortfolioView />}
          {activeTab === "positions" && <EcoPositionsView />}
          {activeTab === "capital" && <InstitutionalCapitalSegregationTab />}
          {activeTab === "orders" && <OrderExecutionCenter />}
          {activeTab === "stream" && <LiveStreamObservatory />}
        </ErrorBoundary>
      </div>
    </DirectPageLayout>
  );
}
