"use client";

import React, { useState } from "react";
import { Building2, Search, Calendar, CheckCircle2, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CorporateAction {
  id: string;
  symbol: string;
  companyName: string;
  type: "DIVIDEND" | "BONUS" | "SPLIT" | "EARNINGS" | "RIGHTS";
  purpose: string;
  exDate: string;
  recordDate: string;
  amountOrRatio: string;
}

const CORPORATE_ACTIONS: CorporateAction[] = [
  {
    id: "ca1",
    symbol: "RELIANCE",
    companyName: "Reliance Industries Limited",
    type: "BONUS",
    purpose: "Issue of Bonus shares in the ratio of 1:1",
    exDate: "28-OCT-2026",
    recordDate: "29-OCT-2026",
    amountOrRatio: "1:1",
  },
  {
    id: "ca2",
    symbol: "INFY",
    companyName: "Infosys Limited",
    type: "DIVIDEND",
    purpose: "Interim Dividend of ₹21 per equity share",
    exDate: "29-OCT-2026",
    recordDate: "30-OCT-2026",
    amountOrRatio: "₹ 21.00 / share",
  },
  {
    id: "ca3",
    symbol: "TCS",
    companyName: "Tata Consultancy Services Limited",
    type: "DIVIDEND",
    purpose: "Second Interim Dividend of ₹10 per share",
    exDate: "18-OCT-2026",
    recordDate: "19-OCT-2026",
    amountOrRatio: "₹ 10.00 / share",
  },
  {
    id: "ca4",
    symbol: "HDFCBANK",
    companyName: "HDFC Bank Limited",
    type: "EARNINGS",
    purpose: "Board meeting to consider Q2 FY26 Financial Results",
    exDate: "19-OCT-2026",
    recordDate: "—",
    amountOrRatio: "Q2 Financials",
  },
  {
    id: "ca5",
    symbol: "ICICIBANK",
    companyName: "ICICI Bank Limited",
    type: "EARNINGS",
    purpose: "Financial Results for the half year ended September 30, 2026",
    exDate: "26-OCT-2026",
    recordDate: "—",
    amountOrRatio: "Q2 Financials",
  },
  {
    id: "ca6",
    symbol: "IRCTC",
    companyName: "Indian Railway Catering And Tourism Corp Ltd",
    type: "DIVIDEND",
    purpose: "Interim Dividend for FY 2025-26",
    exDate: "14-NOV-2026",
    recordDate: "15-NOV-2026",
    amountOrRatio: "₹ 4.00 / share",
  },
];

export function MarketCorporateActionsView({ onSelectSymbol }: { onSelectSymbol?: (symbol: string) => void }) {
  const [filterType, setFilterType] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const filtered = CORPORATE_ACTIONS.filter((ca) => {
    if (filterType !== "ALL" && ca.type !== filterType) return false;
    if (search && !ca.symbol.toLowerCase().includes(search.toLowerCase()) && !ca.companyName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="w-full bg-[#071426] border border-[#15304A] rounded-lg p-4 font-sans select-none space-y-4 shadow-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#15304A] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/30">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#EAF3FF] uppercase tracking-wider">Corporate Actions, Dividends & Earnings Schedule</h3>
            <span className="text-[10px] text-[#91A7C1]">Exchange filings for dividends, bonus issues, stock splits, and earnings boards</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#91A7C1]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbol..."
              className="pl-7 pr-3 py-1 text-[10px] bg-[#030B16] border border-[#15304A] rounded text-[#EAF3FF] focus:outline-none focus:border-[#00C9E8]"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#09182B] p-0.5 rounded border border-[#15304A]">
            {(["ALL", "DIVIDEND", "BONUS", "SPLIT", "EARNINGS"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={cn(
                  "px-2 py-0.5 text-[9px] font-mono font-bold rounded transition-colors",
                  filterType === t ? "bg-[#0878FF] text-white" : "text-[#91A7C1] hover:text-[#EAF3FF]"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px] font-sans">
          <thead className="bg-[#09182B] text-[#91A7C1] text-[10px] font-mono uppercase font-bold border-b border-[#15304A]">
            <tr className="h-[30px]">
              <th className="px-3 py-1">Symbol</th>
              <th className="px-3 py-1">Company Name</th>
              <th className="px-3 py-1 text-center">Action Type</th>
              <th className="px-3 py-1">Purpose / Details</th>
              <th className="px-3 py-1 text-right">Ratio / Value</th>
              <th className="px-3 py-1 text-right font-mono">Ex-Date</th>
              <th className="px-3 py-1 text-right font-mono">Record Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#15304A]/60">
            {filtered.map((item) => (
              <tr key={item.id} className="h-[36px] hover:bg-[#09182B] transition-colors">
                <td className="px-3 py-1 font-mono font-bold text-[#00C9E8]">
                  <button
                    type="button"
                    onClick={() => onSelectSymbol?.(item.symbol)}
                    className="hover:underline flex items-center gap-1"
                  >
                    <span>{item.symbol}</span>
                    <ArrowUpRight className="h-2.5 w-2.5 opacity-60" />
                  </button>
                </td>
                <td className="px-3 py-1 text-[#EAF3FF]">{item.companyName}</td>
                <td className="px-3 py-1 text-center">
                  <span className={cn(
                    "px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase",
                    item.type === "DIVIDEND" ? "bg-[#00D6A0]/15 text-[#00D6A0] border border-[#00D6A0]/30" :
                    item.type === "BONUS" ? "bg-[#00C9E8]/15 text-[#00C9E8] border border-[#00C9E8]/30" :
                    item.type === "EARNINGS" ? "bg-[#0878FF]/15 text-[#0878FF] border border-[#0878FF]/30" :
                    "bg-[#F5B942]/15 text-[#F5B942] border border-[#F5B942]/30"
                  )}>
                    {item.type}
                  </span>
                </td>
                <td className="px-3 py-1 text-[#91A7C1] max-w-[260px] truncate">{item.purpose}</td>
                <td className="px-3 py-1 text-right font-mono font-semibold text-[#EAF3FF]">{item.amountOrRatio}</td>
                <td className="px-3 py-1 text-right font-mono text-[#EAF3FF]">{item.exDate}</td>
                <td className="px-3 py-1 text-right font-mono text-[#91A7C1]">{item.recordDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

