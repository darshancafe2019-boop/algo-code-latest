"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { OrderBookDepthView } from "@/components/orderbook/OrderBookDepthView";

export default function OrderBookPage() {
  return (
    <DirectPageLayout activeTab="orderbook">
      <OrderBookDepthView />
    </DirectPageLayout>
  );
}
