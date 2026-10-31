"use client";

import React from "react";
import { ShieldAlert, Landmark, Wallet, Layers, PiggyBank, ShieldCheck } from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface TaxReserveBarProps {
  totalEquity: number;
  marginDeployed: number;
  taxReserveAmount: number;
  freeCapital: number;
  currency: string;
}

export function TaxReserveBar({
  totalEquity,
  marginDeployed,
  taxReserveAmount,
  freeCapital,
  currency,
}: TaxReserveBarProps) {
  const sym = currency === "INR" ? "₹" : "$";
  const safeTotal = Math.max(1, totalEquity);

  const marginPct = Math.min(100, Math.max(0, (marginDeployed / safeTotal) * 100));
  const taxPct = Math.min(100 - marginPct, Math.max(0, (taxReserveAmount / safeTotal) * 100));
  const freePct = Math.max(0, 100 - marginPct - taxPct);

  return (
    <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-4 shadow-md select-none">
      {/* Title & Safeguard Note */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#10263A]">
        <div className="flex items-center gap-2">
          <PiggyBank className="h-4 w-4 text-[#00F0FF]" />
          <span className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">
            LIVE CAPITAL & STATUTORY TAX RESERVE SEGREGATION
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#00E89A]/10 text-[#00E89A] border border-[#00E89A]/30 font-semibold">
            Zero Double-Counting Safeguard
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#7D8EA5]">
          Statutory Capital Solvency: <span className="text-[#00E89A] font-bold">OPTIMAL</span>
        </span>
      </div>

      {/* Multi-Segment Horizontal Allocation Bar */}
      <div className="space-y-1.5 my-3">
        <div className="h-3 w-full rounded-[4px] bg-[#06101B] overflow-hidden border border-[#10263A] flex">
          {marginPct > 0 && (
            <div
              className="h-full bg-[#00F0FF] transition-all duration-300"
              style={{ width: `${marginPct}%` }}
              title={`Margin Deployed: ${marginPct.toFixed(1)}%`}
            />
          )}
          {taxPct > 0 && (
            <div
              className="h-full bg-amber-400 transition-all duration-300"
              style={{ width: `${taxPct}%` }}
              title={`Tax Reserve: ${taxPct.toFixed(1)}%`}
            />
          )}
          {freePct > 0 && (
            <div
              className="h-full bg-[#00E89A] transition-all duration-300"
              style={{ width: `${freePct}%` }}
              title={`Free Distributable: ${freePct.toFixed(1)}%`}
            />
          )}
        </div>

        {/* Bar Legend */}
        <div className="flex items-center justify-between text-[10px] font-mono text-[#7D8EA5]">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#00F0FF]" />
            <span>Margin Deployed ({marginPct.toFixed(1)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span>Statutory Tax Reserve ({taxPct.toFixed(1)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#00E89A]" />
            <span>Free Distributable Capital ({freePct.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      {/* Numerical Indicators Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
        <div className="p-2 rounded-[6px] bg-[#06101B] border border-[#10263A]">
          <span className="text-[10px] text-[#7D8EA5] block uppercase">Total Portfolio Equity</span>
          <span className="text-sm font-bold font-mono text-[#F8FAFC]">{formatMoney(totalEquity, sym)}</span>
        </div>
        <div className="p-2 rounded-[6px] bg-[#06101B] border border-[#10263A]">
          <span className="text-[10px] text-[#7D8EA5] block uppercase">Margin Deployed</span>
          <span className="text-sm font-bold font-mono text-[#00F0FF]">{formatMoney(marginDeployed, sym)}</span>
        </div>
        <div className="p-2 rounded-[6px] bg-[#06101B] border border-[#10263A]">
          <span className="text-[10px] text-[#7D8EA5] block uppercase">Statutory Tax Reserve</span>
          <span className="text-sm font-bold font-mono text-amber-400">{formatMoney(taxReserveAmount, sym)}</span>
        </div>
        <div className="p-2 rounded-[6px] bg-[#06101B] border border-[#10263A]">
          <span className="text-[10px] text-[#7D8EA5] block uppercase">Free Distributable</span>
          <span className="text-sm font-bold font-mono text-[#00E89A]">{formatMoney(freeCapital, sym)}</span>
        </div>
        <div className="p-2 rounded-[6px] bg-[#06101B] border border-[#10263A]">
          <span className="text-[10px] text-[#7D8EA5] block uppercase">Reserve Rate</span>
          <span className="text-sm font-bold font-mono text-amber-400">{taxPct.toFixed(1)}% of Capital</span>
        </div>
        <div className="p-2 rounded-[6px] bg-[#06101B] border border-[#10263A]">
          <span className="text-[10px] text-[#7D8EA5] block uppercase">Reserve Buffer</span>
          <span className="text-sm font-bold font-mono text-[#00E89A]">100% Fully Backed</span>
        </div>
      </div>
    </div>
  );
}

