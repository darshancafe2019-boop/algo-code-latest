"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import { CommandCenterShell } from "./CommandCenterShell";
import { CANONICAL_NAV_ITEMS } from "./LeftNavigationSidebar";

interface DirectPageLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
}

export function DirectPageLayout({ children, activeTab = "terminal" }: DirectPageLayoutProps) {
  const router = useRouter();

  const handleTabSelect = useCallback(
    (tabId: string) => {
      const item = CANONICAL_NAV_ITEMS.find((n) => n.id === tabId);
      if (item && item.path) {
        router.push(item.path);
      } else {
        router.push(`/?tab=${tabId}`);
      }
    },
    [router]
  );

  return (
    <CommandCenterShell activeTab={activeTab} onTabSelect={handleTabSelect}>
      {children}
    </CommandCenterShell>
  );
}
