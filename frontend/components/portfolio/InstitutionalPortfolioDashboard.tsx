"use client";

import React, { memo } from "react";
import { PortfolioIntelligenceDashboard } from "@/components/portfolio-intelligence/PortfolioIntelligenceDashboard";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const InstitutionalPortfolioDashboard = memo(function InstitutionalPortfolioDashboard() {
  return (
    <ErrorBoundary title="Portfolio Intelligence Terminal Failed">
      <PortfolioIntelligenceDashboard />
    </ErrorBoundary>
  );
});

export { PortfolioIntelligenceDashboard };

