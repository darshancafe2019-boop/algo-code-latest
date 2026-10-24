"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { HomeExecutiveOverview } from "@/components/home/HomeExecutiveOverview";

export default function DashboardPage() {
  return (
    <DirectPageLayout activeTab="dashboard">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1750px] mx-auto min-w-0 font-sans">
        <HomeExecutiveOverview />
      </div>
    </DirectPageLayout>
  );
}
