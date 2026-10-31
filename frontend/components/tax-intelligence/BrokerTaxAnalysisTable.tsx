"use client";

import React from "react";
import { Landmark, CheckCircle2, ShieldCheck, ChevronRight } from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export interface BrokerTaxRowData {
  broker: string;
  sourceName: string;
  totalTrades: number;
  realizedPnl: number;
  taxablePnl: number;
  estimatedTax: number;
  netAfterTax: number;
  fees: number;
  reconciliationStatus: "RECONCILED" | "SYNCHRONIZED" | "PENDING";
}

interface BrokerTaxAnalysisTableProps {
  brokersData: BrokerTaxRowData[];
  currency: string;
  onSelectBroker?: (b: string) => void;
}

export function BrokerTaxAnalysisTable({
  brokersData,
  currency,
  onSelectBroker,
}: BrokerTaxAnalysisTableProps) {
  const sym = currency === "INR" ? "₹" : "$";

  // Calculate Combined Totals
  const combined = brokersData.reduce(
    (acc, b) => {
      acc.totalTrades += b.totalTrades;
      acc.realizedPnl += b.realizedPnl;
      acc.taxablePnl += b.taxablePnl;
      acc.estimatedTax += b.estimatedTax;
      acc.netAfterTax += b.netAfterTax;
      acc.fees += b.fees;
      return acc;
    },
    { totalTrades: 0, realizedPnl: 0, taxablePnl: 0, estimatedTax: 0, netAfterTax: 0, fees: 0 }
  );

  return (
    <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-3.5 shadow-md select-none flex flex-col justify-between">
      <div>
        {/* Table Title & Summary */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#10263A]">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-[#00F0FF]" />
            <span className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">
              REALIZED P&L BY BROKER
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#00E89A]/10 text-[#00E89A] border border-[#00E89A]/30 font-semibold">
              4 Brokers Segregated
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#7D8EA5]">
            Consolidated Ledger Status: <span className="text-[#00E89A] font-bold">100% RECONCILED</span>
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase font-semibold text-[#7D8EA5] border-b border-[#10263A] h-[28px]">
                <th className="pb-1">Broker</th>
                <th className="pb-1 text-center">Reconciliation</th>
                <th className="pb-1 text-right">Total Trades</th>
                <th className="pb-1 text-right">Realized P&L</th>
                <th className="pb-1 text-right">Taxable P&L</th>
                <th className="pb-1 text-right">Estimated Tax</th>
                <th className="pb-1 text-right">Net After Tax</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#10263A]/60">
              {brokersData.map((row) => {
                const isRealizedProfit = row.realizedPnl >= 0;
                const isNetProfit = row.netAfterTax >= 0;
                return (
                  <tr
                    key={row.broker}
                    onClick={() => onSelectBroker && onSelectBroker(row.broker)}
                    className="h-[34px] hover:bg-[#0E1E34] transition-colors cursor-pointer"
                  >
                    <td className="font-semibold text-[#F8FAFC]">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#00E89A]" />
                        <span>{row.broker}</span>
                        <span className="text-[9px] font-mono text-[#7D8EA5] hidden sm:inline">
                          ({row.sourceName})
                        </span>
                      </div>
                    </td>
                    <td className="text-center font-mono">
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#00E89A]/10 text-[#00E89A] border border-[#00E89A]/20 font-bold">
                        {row.reconciliationStatus}
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
                    <td className="text-right text-amber-400 tabular-nums font-mono font-semibold">
                      {formatMoney(row.estimatedTax, sym)}
                    </td>
                    <td
                      className={cn(
                        "text-right tabular-nums font-mono font-bold",
                        isNetProfit ? "text-[#00E89A]" : "text-[#FF3B5C]"
                      )}
                    >
                      {isNetProfit ? "+" : ""}
                      {formatMoney(row.netAfterTax, sym)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Total Row */}
            <tfoot>
              <tr className="border-t-2 border-[#122A42] bg-[#06101B]/80 font-bold h-[34px]">
                <td className="text-[#F8FAFC] pl-1 font-mono uppercase text-[11px]">
                  COMBINED TOTAL
                </td>
                <td className="text-center">
                  <span className="text-[9px] text-[#00E89A] font-mono uppercase">ALL PASS</span>
                </td>
                <td className="text-right text-[#F8FAFC] font-mono tabular-nums">
                  {combined.totalTrades.toLocaleString()}
                </td>
                <td
                  className={cn(
                    "text-right font-mono tabular-nums",
                    combined.realizedPnl >= 0 ? "text-[#00E89A]" : "text-[#FF3B5C]"
                  )}
                >
                  {combined.realizedPnl >= 0 ? "+" : ""}
                  {formatMoney(combined.realizedPnl, sym)}
                </td>
                <td className="text-right text-[#F8FAFC] font-mono tabular-nums">
                  {formatMoney(combined.taxablePnl, sym)}
                </td>
                <td className="text-right text-amber-400 font-mono tabular-nums">
                  {formatMoney(combined.estimatedTax, sym)}
                </td>
                <td
                  className={cn(
                    "text-right font-mono tabular-nums",
                    combined.netAfterTax >= 0 ? "text-[#00E89A]" : "text-[#FF3B5C]"
                  )}
                >
                  {combined.netAfterTax >= 0 ? "+" : ""}
                  {formatMoney(combined.netAfterTax, sym)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div className="pt-2 mt-2 border-t border-[#10263A] flex items-center justify-between text-[10px] text-[#7D8EA5]">
        <span>Brokerage & Charges Deductible: <span className="text-[#F8FAFC] font-mono font-semibold">{formatMoney(combined.fees, sym)}</span></span>
        <span>Reconciliation Frequency: <span className="text-[#00F0FF]">Per-Trade Execution</span></span>
      </div>
    </div>
  );
}

