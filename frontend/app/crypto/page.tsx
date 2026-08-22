"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { CryptoOverviewView } from "@/components/crypto/CryptoOverviewView";
import { CryptoPositionsOrders } from "@/components/crypto/CryptoPositionsOrders";

export default function CryptoHubPage() {
  return (
    <DirectPageLayout activeTab="crypto-derivatives">
      <div className="flex flex-col gap-6">
        <CryptoOverviewView />
        <CryptoPositionsOrders />
      </div>
    </DirectPageLayout>
  );
}
