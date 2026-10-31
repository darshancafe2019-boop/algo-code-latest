"use client";

import React from "react";
import { Receipt, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export interface TaxComponentItem {
  id: string;
  name: string;
  amount: number;
  status: "PAID" | "INCLUDED" | "ESTIMATED" | "NOT APPLICABLE" | "PENDING VERIFICATION";
  statutoryRef: string;
}

interface TaxBreakdownPanelProps {
  components: TaxComponentItem[];
  currency: string;
}

export function TaxBreakdownPanel({ components, currency }: TaxBreakdownPanelProps) {
  const sym = currency === "INR" ? "₹" : "$";

  const getStatusBadge = (st: TaxComponentItem["status"]) => {
    switch (st) {
      case "PAID":
        return "bg-[#00E89A]/15 text-[#00E89A] border-[#00E89A]/30";
      case "INCLUDED":
        return "bg-[#168BFF]/15 text-[#00F0FF] border-[#168BFF]/30";
      case "ESTIMATED":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "PENDING VERIFICATION":
        return "bg-purple-500/15 text-purple-400 border-purple-500/30";
      default:
        return "bg-slate-500/15 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-3.5 shadow-md select-none flex flex-col justify-between">
      <div>
        {/* Title */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#10263A]">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[#00F0FF]" />
            <span className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">
              DETAILED STATUTORY TAX BREAKDOWN
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30 font-semibold">
              12 Tax Line Items
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#7D8EA5]">
            Tax Deductibility: <span className="text-[#00E89A] font-bold">VERIFIED</span>
          </span>
        </div>

        {/* 12-Component Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase font-semibold text-[#7D8EA5] border-b border-[#10263A] h-[28px]">
                <th className="pb-1">Tax Component</th>
                <th className="pb-1">Statutory Citation</th>
                <th className="pb-1 text-center">Status</th>
                <th className="pb-1 text-right">Amount ({sym})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#10263A]/60">
              {components.map((item) => (
                <tr key={item.id} className="h-[28px] hover:bg-[#0E1E34] transition-colors">
                  <td className="font-semibold text-[#F8FAFC] text-[11px]">{item.name}</td>
                  <td className="font-mono text-[10px] text-[#7D8EA5]">{item.statutoryRef}</td>
                  <td className="text-center font-mono">
                    <span
                      className={cn(
                        "px-1.5 py-0.2 rounded text-[9px] font-mono font-bold tracking-wider border",
                        getStatusBadge(item.status)
                      )}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="text-right text-[#F8FAFC] tabular-nums font-mono font-bold text-[11px]">
                    {formatMoney(item.amount, sym)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="pt-2 mt-2 border-t border-[#10263A] flex items-center justify-between text-[10px] text-[#7D8EA5]">
        <span>Transaction Costs vs Taxes: <span className="text-[#00F0FF]">Separately Audited</span></span>
        <span>Reconciliation Ledger: <span className="text-[#00E89A]">Synchronized</span></span>
      </div>
    </div>
  );
}

