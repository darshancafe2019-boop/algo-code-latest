"use client";

import React, { useState, useMemo } from "react";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Filter, ChevronRight, Eye } from "lucide-react";

export interface TaxableTradeRecord {
  id: string;
  timestamp: string;
  symbol: string;
  market: string;
  broker: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  realizedPnl: number;
  taxablePnl: number;
  category: "EQUITY" | "FNO" | "COMMODITY" | "CRYPTO" | "INTRADAY";
  taxClassification: string;
  statutoryRate: string;
}

interface TopTaxableTradesTableProps {
  trades: TaxableTradeRecord[];
  currency: string;
  selectedBroker?: string;
}

// ── Timezone Helper (Asia/Kolkata 12-hour IST) ───────────────────────────────
function formatIST(dateOrIso?: string | number | Date | null): string {
  if (!dateOrIso) return "—";
  try {
    const d = typeof dateOrIso === "string" || typeof dateOrIso === "number" ? new Date(dateOrIso) : dateOrIso;
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(d) + " IST";
  } catch {
    return "—";
  }
}

export function TopTaxableTradesTable({
  trades,
  currency,
  selectedBroker = "ALL",
}: TopTaxableTradesTableProps) {
  const sym = currency === "INR" ? "₹" : "$";
  const [activeTab, setActiveTab] = useState<"gains" | "losses" | "intraday" | "fno" | "mcx" | "crypto">("gains");

  const filteredTrades = useMemo(() => {
    let list = trades.filter((t) => {
      if (selectedBroker !== "ALL" && t.broker.toLowerCase() !== selectedBroker.toLowerCase()) {
        return false;
      }
      return true;
    });

    switch (activeTab) {
      case "gains":
        return list.filter((t) => t.realizedPnl > 0).sort((a, b) => b.realizedPnl - a.realizedPnl);
      case "losses":
        return list.filter((t) => t.realizedPnl < 0).sort((a, b) => a.realizedPnl - b.realizedPnl);
      case "intraday":
        return list.filter((t) => t.category === "INTRADAY").sort((a, b) => Math.abs(b.realizedPnl) - Math.abs(a.realizedPnl));
      case "fno":
        return list.filter((t) => t.category === "FNO").sort((a, b) => Math.abs(b.realizedPnl) - Math.abs(a.realizedPnl));
      case "mcx":
        return list.filter((t) => t.category === "COMMODITY").sort((a, b) => Math.abs(b.realizedPnl) - Math.abs(a.realizedPnl));
      case "crypto":
        return list.filter((t) => t.category === "CRYPTO").sort((a, b) => Math.abs(b.realizedPnl) - Math.abs(a.realizedPnl));
      default:
        return list;
    }
  }, [trades, selectedBroker, activeTab]);

  return (
    <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-3.5 shadow-md select-none flex flex-col justify-between">
      <div>
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2.5 mb-2.5 border-b border-[#10263A] gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#00F0FF]" />
            <span className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">
              TOP TAXABLE TRADES
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#00E89A]/10 text-[#00E89A] border border-[#00E89A]/30 font-semibold">
              Reconciled Ledger Fills
            </span>
          </div>

          <div className="flex items-center gap-1 bg-[#06101B] p-0.5 rounded-[6px] border border-[#10263A] overflow-x-auto">
            {(
              [
                { id: "gains", label: "Highest Gains" },
                { id: "losses", label: "Highest Losses" },
                { id: "intraday", label: "Intraday" },
                { id: "fno", label: "F&O" },
                { id: "mcx", label: "MCX" },
                { id: "crypto", label: "Crypto" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-mono font-bold rounded-[4px] transition-colors whitespace-nowrap cursor-pointer",
                  activeTab === tab.id
                    ? "bg-[#168BFF] text-white"
                    : "text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#10263A]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase font-semibold text-[#7D8EA5] border-b border-[#10263A] h-[28px]">
                <th className="pb-1">Date & Time (IST)</th>
                <th className="pb-1">Symbol</th>
                <th className="pb-1">Broker / Market</th>
                <th className="pb-1 text-right">Qty</th>
                <th className="pb-1 text-right">Buy Price</th>
                <th className="pb-1 text-right">Sell Price</th>
                <th className="pb-1 text-right">Realized P&L</th>
                <th className="pb-1 text-right">Taxable P&L</th>
                <th className="pb-1 text-center">Statutory Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#10263A]/60">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-xs text-[#7D8EA5]">
                    No trades match active filter ({activeTab.toUpperCase()})
                  </td>
                </tr>
              ) : (
                filteredTrades.slice(0, 7).map((t) => {
                  const isProfit = t.realizedPnl >= 0;
                  return (
                    <tr key={t.id} className="h-[32px] hover:bg-[#0E1E34] transition-colors">
                      <td className="text-[10px] font-mono text-[#7D8EA5]">
                        {formatIST(t.timestamp)}
                      </td>
                      <td className="font-semibold text-[#F8FAFC]">
                        {t.symbol}
                      </td>
                      <td className="text-[10px] font-mono text-[#22D3EE]">
                        <span>{t.broker}</span>
                        <span className="text-[#7D8EA5] text-[9px] ml-1">({t.market})</span>
                      </td>
                      <td className="text-right text-[#F8FAFC] tabular-nums font-mono text-[10px]">
                        {t.quantity.toLocaleString()}
                      </td>
                      <td className="text-right text-[#7D8EA5] tabular-nums font-mono text-[10px]">
                        {formatMoney(t.buyPrice, sym)}
                      </td>
                      <td className="text-right text-[#F8FAFC] tabular-nums font-mono text-[10px]">
                        {formatMoney(t.sellPrice, sym)}
                      </td>
                      <td
                        className={cn(
                          "text-right tabular-nums font-mono font-bold text-[11px]",
                          isProfit ? "text-[#00E89A]" : "text-[#FF3B5C]"
                        )}
                      >
                        {isProfit ? "+" : ""}
                        {formatMoney(t.realizedPnl, sym)}
                      </td>
                      <td className="text-right text-[#F8FAFC] tabular-nums font-mono font-bold text-[11px]">
                        {formatMoney(t.taxablePnl, sym)}
                      </td>
                      <td className="text-center font-mono">
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                          {t.statutoryRate}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="pt-2 mt-2 border-t border-[#10263A] flex items-center justify-between text-[10px] text-[#7D8EA5]">
        <span>Trade Matching Method: <span className="text-[#00F0FF]">Statutory FIFO Method</span></span>
        <span>Showing {Math.min(7, filteredTrades.length)} of {filteredTrades.length} Taxable Records</span>
      </div>
    </div>
  );
}

