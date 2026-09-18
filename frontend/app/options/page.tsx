"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import OptionsCommandCenter from "@/components/options/OptionsCommandCenter";

export default function OptionsPage() {
  return (
    <DirectPageLayout activeTab="options">
      <div className="w-full min-w-0">
        <OptionsCommandCenter />
      </div>
    </DirectPageLayout>
  );
}
