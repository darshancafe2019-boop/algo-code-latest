"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Radio } from "lucide-react";

export type ProviderFilterId =
  | "ALL"
  | "UPSTOX"
  | "DELTA"
  | "BINANCE"
  | "OANDA"
  | "GLOBAL"
  | "PAPER";

interface ProviderOption {
  id: ProviderFilterId;
  label: string;
  status: "LIVE" | "CONNECTED" | "DELAYED" | "SIMULATED" | "ACTIVE";
  indicatorColor: string;
}

const PROVIDERS: ProviderOption[] = [
  { id: "ALL", label: "ALL FEEDS", status: "LIVE", indicatorColor: "bg-[#00D6A0]" },
  { id: "UPSTOX", label: "UPSTOX V3", status: "LIVE", indicatorColor: "bg-[#00D6A0]" },
  { id: "DELTA", label: "DELTA INDIA", status: "LIVE", indicatorColor: "bg-[#00D6A0]" },
  { id: "BINANCE", label: "BINANCE", status: "LIVE", indicatorColor: "bg-[#00D6A0]" },
  { id: "OANDA", label: "OANDA FOREX", status: "LIVE", indicatorColor: "bg-[#00D6A0]" },
  { id: "GLOBAL", label: "GLOBAL DATA", status: "DELAYED", indicatorColor: "bg-[#F5B942]" },
  { id: "PAPER", label: "PAPER SIM", status: "SIMULATED", indicatorColor: "bg-[#00C9E8]" },
];

interface MarketProviderBarProps {
  selectedProvider: ProviderFilterId;
  onSelectProvider: (provider: ProviderFilterId) => void;
}

export function MarketProviderBar({ selectedProvider, onSelectProvider }: MarketProviderBarProps) {
  return (
    <div className="w-full flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
      <div className="text-[10px] font-mono uppercase tracking-wider text-[#91A7C1] font-semibold flex items-center gap-1 mr-1.5 shrink-0">
        <Radio className="h-3 w-3 text-[#00C9E8]" />
        <span>PROVIDERS:</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {PROVIDERS.map((prov) => {
          const isSelected = selectedProvider === prov.id;
          return (
            <button
              key={prov.id}
              type="button"
              onClick={() => onSelectProvider(prov.id)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium transition-all duration-150 border shrink-0",
                isSelected
                  ? "bg-[#00C9E8]/15 border-[#00C9E8] text-[#EAF3FF] shadow-sm shadow-[#00C9E8]/20"
                  : "bg-[#071426] border-[#15304A] text-[#91A7C1] hover:text-[#EAF3FF] hover:border-[#1F4264]"
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", prov.indicatorColor, isSelected && "ring-2 ring-[#00C9E8]/30")} />
              <span>{prov.label}</span>
              <span className={cn("text-[9px] px-1 py-0.1 rounded text-[8px]", isSelected ? "text-[#00C9E8]" : "text-[#91A7C1]/70")}>
                {prov.status}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

