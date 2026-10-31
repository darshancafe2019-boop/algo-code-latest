"use client";

import React, { useState } from "react";
import { TrendingUp, TrendingDown, Calendar, Layers, ShieldCheck } from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface RealizedPnlViewProps {
  currency: string;
  totalRealized: number;
  taxableRealized: number;
}

export function RealizedPnlView({
  currency,
  totalRealized,
  taxableRealized,
}: RealizedPnlViewProps) {
  const sym = currency === "INR" ? "₹" : "$";
  const [timeframe, setTimeframe] = useState<"monthly" | "quarterly" | "daily">("monthly");

  const monthlyRecords = [
    { period: "October 2026", trades: 142, grossGains: 58400, allowableLosses: 12200, netRealized: 46200, taxable: 46200, stt: 640 },
    { period: "September 2026", trades: 218, grossGains: 84200, allowableLosses: 31000, netRealized: 53200, taxable: 53200, stt: 980 },
    { period: "August 2026", trades: 195, grossGains: 42100, allowableLosses: 19500, netRealized: 22600, taxable: 22600, stt: 720 },
    { period: "July 2026", trades: 164, grossGains: 63500, allowableLosses: 24800, netRealized: 38700, taxable: 38700, stt: 810 },
    { period: "June 2026", trades: 180, grossGains: 51200, allowableLosses: 18400, netRealized: 32800, taxable: 32800, stt: 690 },
    { period: "May 2026", trades: 155, grossGains: 39800, allowableLosses: 14200, netRealized: 25600, taxable: 25600, stt: 540 },
    { period: "April 2026", trades: 110, grossGains: 28400, allowableLosses: 10500, netRealized: 17900, taxable: 17900, stt: 410 },
  ];

  return (
    <div className="space-y-4 select-none animate-fadeIn">
      {/* Header bar */}
      <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#00F0FF]" />
            <h2 className="text-sm font-bold text-[#F8FAFC] tracking-wider uppercase">
              REALIZED P&L RECONCILIATION & LEDGER PERIODS
            </h2>
          </div>
          <p className="text-xs text-[#7D8EA5] mt-0.5">
            Monthly and quarterly closed-trade realized profit / loss reconciliation under Section 70/71 set-off rules.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#06101B] p-0.5 rounded-[6px] border border-[#122A42]">
          {(["monthly", "quarterly", "daily"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTimeframe(t)}
              className={cn(
                "px-3 py-1 text-xs font-mono font-semibold rounded-[4px] capitalize transition-colors cursor-pointer",
                timeframe === t ? "bg-[#168BFF] text-white" : "text-[#7D8EA5] hover:text-[#F8FAFC]"
              )}
            >
              {t} Breakdown
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-4 shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase font-semibold text-[#7D8EA5] border-b border-[#10263A] h-[30px]">
                <th className="pb-1">Financial Period</th>
                <th className="pb-1 text-right">Trades Count</th>
                <th className="pb-1 text-right">Gross Gains</th>
                <th className="pb-1 text-right">Allowable Losses</th>
                <th className="pb-1 text-right">Net Realized P&L</th>
                <th className="pb-1 text-right">Taxable P&L</th>
                <th className="pb-1 text-right">STT Withheld</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#10263A]/60">
              {monthlyRecords.map((m) => (
                <tr key={m.period} className="h-[36px] hover:bg-[#0E1E34] transition-colors">
                  <td className="font-semibold text-[#F8FAFC] font-mono">{m.period}</td>
                  <td className="text-right text-[#7D8EA5] font-mono tabular-nums">{m.trades}</td>
                  <td className="text-right text-[#00E89A] font-mono tabular-nums font-semibold">+{formatMoney(m.grossGains, sym)}</td>
                  <td className="text-right text-[#FF3B5C] font-mono tabular-nums font-semibold">-{formatMoney(m.allowableLosses, sym)}</td>
                  <td className="text-right text-[#F8FAFC] font-mono tabular-nums font-bold">+{formatMoney(m.netRealized, sym)}</td>
                  <td className="text-right text-[#00F0FF] font-mono tabular-nums font-bold">+{formatMoney(m.taxable, sym)}</td>
                  <td className="text-right text-amber-400 font-mono tabular-nums">{formatMoney(m.stt, sym)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#122A42] bg-[#06101B] font-bold h-[36px] text-xs">
                <td className="text-[#F8FAFC] font-mono pl-1 uppercase">FY 2025-26 CUMULATIVE</td>
                <td className="text-right text-[#F8FAFC] font-mono">1,164</td>
                <td className="text-right text-[#00E89A] font-mono">+{formatMoney(367600, sym)}</td>
                <td className="text-right text-[#FF3B5C] font-mono">-{formatMoney(130300, sym)}</td>
                <td className="text-right text-[#F8FAFC] font-mono">+{formatMoney(237300, sym)}</td>
                <td className="text-right text-[#00F0FF] font-mono">+{formatMoney(237300, sym)}</td>
                <td className="text-right text-amber-400 font-mono">{formatMoney(4790, sym)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

