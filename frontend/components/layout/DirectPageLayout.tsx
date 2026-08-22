"use client";

import React from "react";
import { CommandCenterShell } from "./CommandCenterShell";

interface DirectPageLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
}

export function DirectPageLayout({ children, activeTab = "terminal" }: DirectPageLayoutProps) {
  return (
    <CommandCenterShell activeTab={activeTab}>
      {children}
    </CommandCenterShell>
  );
}
