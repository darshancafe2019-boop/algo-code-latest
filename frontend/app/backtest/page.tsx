"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { BacktestingLab } from "@/components/backtesting/BacktestingLab";

export default function BacktestPage() {
  return (
    <DirectPageLayout activeTab="backtesting">
      <BacktestingLab />
    </DirectPageLayout>
  );
}
