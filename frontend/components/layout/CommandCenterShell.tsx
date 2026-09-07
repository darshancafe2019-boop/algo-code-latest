"use client";

import React from "react";
import { QuantOSAppShell } from "@/components/shell/QuantOSAppShell";

interface CommandCenterShellProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabSelect?: (tabId: string) => void;
}

export function CommandCenterShell({
  children,
  activeTab,
  onTabSelect,
}: CommandCenterShellProps) {
  return (
    <QuantOSAppShell activeTab={activeTab} onTabSelect={onTabSelect}>
      {children}
    </QuantOSAppShell>
  );
}
