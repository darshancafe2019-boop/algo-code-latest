"use client";

import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { OrderExecutionCenter } from "@/components/order-execution/OrderExecutionCenter";

export default function OrdersPage() {
  return (
    <DirectPageLayout activeTab="orders">
      <OrderExecutionCenter />
    </DirectPageLayout>
  );
}
