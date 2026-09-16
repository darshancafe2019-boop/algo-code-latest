"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { CryptoHubView } from "@/components/crypto/CryptoHubView";

export default function CryptoHubPage() {
  return (
    <DirectPageLayout activeTab="crypto-derivatives">
      <CryptoHubView />
    </DirectPageLayout>
  );
}
