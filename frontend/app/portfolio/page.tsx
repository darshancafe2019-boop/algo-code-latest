"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { PortfolioWorkspaceView } from "@/components/portfolio/PortfolioWorkspaceView";

export default function PortfolioPage() {
  return (
    <DirectPageLayout activeTab="portfolio">
      <PortfolioWorkspaceView />
    </DirectPageLayout>
  );
}
