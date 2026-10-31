"use client";

import React from "react";
import { CheckCircle2, Filter, ShieldCheck, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type TaxBrokerFilter = "ALL" | "DHAN" | "UPSTOX" | "DELTA EXCHANGE" | "PAPER SIMULATOR";

interface TaxFilterBarProps {
  selectedBroker: TaxBrokerFilter;
  onBrokerChange: (broker: TaxBrokerFilter) => void;
  financialYear: string;
  isEngineActive: boolean;
  totalTransactionsCount: number;
}

export function TaxFilterBar({
  selectedBroker,
  onBrokerChange,
  financialYear,
  isEngineActive,
  totalTransactionsCount,
}: TaxFilterBarProps) {
  const brokers: { id: TaxBrokerFilter; label: string }[] = [
    { id: "ALL", label: "ALL BROKERS" },
    { id: "DHAN", label: "DHAN" },
    { id: "UPSTOX", label: "UPSTOX" },
    { id: "DELTA EXCHANGE", label: "DELTA EXCHANGE" },
    { id: "PAPER SIMULATOR", label: "PAPER SIMULATOR" },
  ];

  return (
    <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-3 shadow-md select-none flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      {/* Left: Command Center Title & Validation Indicators */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">
          TAX INTELLIGENCE COMMAND CENTER
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-bold bg-[#00E89A]/10 text-[#00E89A] border border-[#00E89A]/30">
          <CheckCircle2 className="h-3 w-3 text-[#00E89A]" />
          CONFIRMED INPUTS
        </span>
        <span className="text-[11px] font-mono text-[#7D8EA5] hidden sm:inline">
          • IT Act 1961 / Finance Act 2024 ({financialYear})
        </span>
      </div>

      {/* Right: Broker Filter Pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="flex items-center gap-1 bg-[#06101B] p-0.5 rounded-[6px] border border-[#122A42]">
          {brokers.map((b) => {
            const isSelected = selectedBroker === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onBrokerChange(b.id)}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-mono font-bold rounded-[4px] transition-colors cursor-pointer",
                  isSelected
                    ? "bg-[#168BFF] text-white shadow-sm"
                    : "text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#10263A]"
                )}
              >
                {b.label}
              </button>
            );
          })}
        </div>
        <span className="text-[10px] font-mono text-[#7D8EA5] px-2 py-1 rounded bg-[#06101B] border border-[#122A42] hidden lg:inline">
          {totalTransactionsCount} Reconciled Trades
        </span>
      </div>
    </div>
  );
}

