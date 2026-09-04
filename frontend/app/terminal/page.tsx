"use client";

import React from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { TradingTerminal } from "@/components/terminal/TradingTerminal";

export default function TerminalPage() {
  return (
    <DirectPageLayout activeTab="terminal">
      <TradingTerminal />
    </DirectPageLayout>
  );
}
