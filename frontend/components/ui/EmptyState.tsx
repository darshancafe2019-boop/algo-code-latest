"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  message?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export function EmptyState({
  title,
  message = "No records or active items found.",
  action,
  icon: Icon = Inbox,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-8 px-4 text-center rounded-lg border border-dashed border-[#213047] bg-[#0E1624]/40 my-2 select-none",
        className
      )}
    >
      <div className="p-2.5 rounded-full bg-[#121C2C] border border-[#213047] text-[#64748B] mb-2.5">
        <Icon className="h-5 w-5" />
      </div>
      {title && <h4 className="text-xs font-semibold text-[#F4F7FA] font-sans mb-1">{title}</h4>}
      <p className="text-[11px] text-[#94A3B8] font-mono max-w-sm">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
