"use client";

import React, { memo } from "react";
import { Plus } from "lucide-react";
import { useUIStore } from "@/lib/store/useUIStore";

export const HeaderOrderButton = memo(function HeaderOrderButton() {
  const { setOrderPlacementModalOpen, setQuickOrderSide } = useUIStore();

  const handleOpen = () => {
    setQuickOrderSide("BUY");
    setOrderPlacementModalOpen(true);
  };

  return (
    <button
      type="button"
      onClick={handleOpen}
      aria-label="Open new order ticket (⌘O)"
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 font-bold font-mono text-xs transition-all cursor-pointer shadow-xs active:scale-95 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 select-none"
      title="Create New Order (⌘O)"
    >
      <Plus className="h-3.5 w-3.5 text-emerald-400" />
      <span className="text-[11px] tracking-wide">ORDER</span>
    </button>
  );
});
