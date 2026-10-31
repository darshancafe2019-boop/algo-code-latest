"use client";

import React from "react";
import { Layers, ShieldCheck, Info } from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export interface AssetClassTaxRowData {
  assetClass: string;
  categoryName: string;
  statutoryRule: string;
  taxRateLabel: string;
  totalTrades: number;
  realizedPnl: number;
  taxablePnl: number;
  estimatedTax: number;
}

interface AssetClassTaxTableProps {
  assetClassesData: AssetClassTaxRowData[];
  currency: string;
}

export function AssetClassTaxTable({
  assetClassesData,
  currency,
}: AssetClassTaxTableProps) {
  const sym = currency === "INR" ? "₹" : "$";

  // Calculate Overall Totals
  const totals = assetClassesData.reduce(
    (acc, a) => {
      acc.totalTrades += a.totalTrades;
      acc.realizedPnl += a.realizedPnl;
      acc.taxablePnl += a.taxablePnl;
      acc.estimatedTax += a.estimatedTax;
      return acc;
    },
    { totalTrades: 0, realizedPnl: 0, taxablePnl: 0, estimatedTax: 0 }
  );

  return (
    <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-3.5 shadow-md select-none flex flex-col justify-between">
      <div>
        {/* Table Title & Summary */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#10263A]">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#00F0FF]" />
            <span className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">
              REALIZED P&L BY ASSET CLASS
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#168BFF]/10 text-[#22D3EE] border border-[#168BFF]/30 font-semibold">
              Distinct Statutory Rates
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#7D8EA5]">
            Tax Regime: <span className="text-[#00F0FF] font-bold">Finance Act 2024</span>
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase font-semibold text-[#7D8EA5] border-b border-[#10263A] h-[28px]">
                <th className="pb-1">Asset Class</th>
                <th className="pb-1">Statutory Rule / Section</th>
                <th className="pb-1 text-center">Tax Rate</th>
                <th className="pb-1 text-right">Trades</th>
                <th className="pb-1 text-right">Realized P&L</th>
                <th className="pb-1 text-right">Taxable P&L</th>
                <th className="pb-1 text-right">Estimated Tax</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#10263A]/60">
              {assetClassesData.map((row) => {
                const isRealizedProfit = row.realizedPnl >= 0;
                return (
                  <tr
                    key={row.assetClass}
                    className="h-[34px] hover:bg-[#0E1E34] transition-colors"
                  >
                    <td className="font-semibold text-[#F8FAFC]">
                      <div>
                        <span>{row.assetClass}</span>
                        <span className="text-[9px] font-mono text-[#7D8EA5] block leading-none mt-0.5">
                          {row.categoryName}
                        </span>
                      </div>
                    </td>
                    <td className="font-mono text-[10px] text-[#22D3EE]">
                      {row.statutoryRule}
                    </td>
                    <td className="text-center font-mono">
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                        {row.taxRateLabel}
                      </span>
                    </td>
                    <td className="text-right text-[#7D8EA5] tabular-nums font-mono text-[11px]">
                      {row.totalTrades.toLocaleString()}
                    </td>
                    <td
                      className={cn(
                        "text-right tabular-nums font-mono font-semibold",
                        isRealizedProfit ? "text-[#00E89A]" : "text-[#FF3B5C]"
                      )}
                    >
                      {isRealizedProfit ? "+" : ""}
                      {formatMoney(row.realizedPnl, sym)}
                    </td>
                    <td className="text-right text-[#F8FAFC] tabular-nums font-mono font-medium">
                      {formatMoney(row.taxablePnl, sym)}
                    </td>
                    <td className="text-right text-amber-400 tabular-nums font-mono font-bold">
                      {formatMoney(row.estimatedTax, sym)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Total Row */}
            <tfoot>
              <tr className="border-t-2 border-[#122A42] bg-[#06101B]/80 font-bold h-[34px]">
                <td className="text-[#F8FAFC] pl-1 font-mono uppercase text-[11px]" colSpan={3}>
                  ASSET CLASS OVERALL TOTALS
                </td>
                <td className="text-right text-[#F8FAFC] font-mono tabular-nums">
                  {totals.totalTrades.toLocaleString()}
                </td>
                <td
                  className={cn(
                    "text-right font-mono tabular-nums",
                    totals.realizedPnl >= 0 ? "text-[#00E89A]" : "text-[#FF3B5C]"
                  )}
                >
                  {totals.realizedPnl >= 0 ? "+" : ""}
                  {formatMoney(totals.realizedPnl, sym)}
                </td>
                <td className="text-right text-[#F8FAFC] font-mono tabular-nums">
                  {formatMoney(totals.taxablePnl, sym)}
                </td>
                <td className="text-right text-amber-400 font-mono tabular-nums">
                  {formatMoney(totals.estimatedTax, sym)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div className="pt-2 mt-2 border-t border-[#10263A] flex items-center justify-between text-[10px] text-[#7D8EA5]">
        <span>Statutory Rule Isolation: <span className="text-[#00E89A]">STRICT ZERO CONTAMINATION</span></span>
        <span>Loss Set-off Guard: <span className="text-[#F8FAFC]">Active (VDA Losses Isolated)</span></span>
      </div>
    </div>
  );
}

