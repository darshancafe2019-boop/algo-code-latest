"use client";

import React from "react";
import { Clock, CheckCircle2, ChevronRight, Activity } from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export interface RecentTradeItem {
  id: string;
  time: string | Date;
  symbol: string;
  market: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  realizedPnl: number;
  status: "FILLED" | "PENDING" | "REJECTED" | "CANCELLED";
}

interface RecentTradesTaxTableProps {
  trades: RecentTradeItem[];
  currency: string;
}

function formatIST(dateOrIso?: string | number | Date | null): string {
  if (!dateOrIso) return "—";
  try {
    const d = typeof dateOrIso === "string" || typeof dateOrIso === "number" ? new Date(dateOrIso) : dateOrIso;
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(d) + " IST";
  } catch {
    return "—";
  }
}

export function RecentTradesTaxTable({ trades, currency }: RecentTradesTaxTableProps) {
  const sym = currency === "INR" ? "₹" : "$";

  return (
    <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-3.5 shadow-md select-none flex flex-col justify-between">
      <div>
        {/* Title */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#10263A]">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#00F0FF]" />
            <span className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">
              RECENT TRADES — ALL MARKETS
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#168BFF]/10 text-[#168BFF] border border-[#168BFF]/30 font-semibold">
              Live OMS Fills
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#7D8EA5]">
            Cross-Asset Sync: <span className="text-[#00E89A] font-bold">ACTIVE</span>
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase font-semibold text-[#7D8EA5] border-b border-[#10263A] h-[28px]">
                <th className="pb-1">Time (IST)</th>
                <th className="pb-1">Symbol</th>
                <th className="pb-1">Market</th>
                <th className="pb-1 text-center">Side</th>
                <th className="pb-1 text-right">Qty</th>
                <th className="pb-1 text-right">Price</th>
                <th className="pb-1 text-right">Realized P&L</th>
                <th className="pb-1 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#10263A]/60">
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-xs text-[#7D8EA5]">
                    No recent execution records found
                  </td>
                </tr>
              ) : (
                trades.slice(0, 6).map((t) => {
                  const isBuy = String(t.side || "").toUpperCase() === "BUY";
                  const isFilled = String(t.status || "").toUpperCase() === "FILLED";
                  const isProfit = Number(t.realizedPnl || 0) >= 0;
                  const symStr = typeof t.symbol === "object" && t.symbol ? ((t.symbol as any).symbol || (t.symbol as any).name || "—") : String(t.symbol || "—");
                  const marketStr = typeof t.market === "object" && t.market ? ((t.market as any).exchange || (t.market as any).market_type || (t.market as any).symbol || "NSE") : String(t.market || "NSE");
                  return (
                    <tr key={t.id} className="h-[30px] hover:bg-[#0E1E34] transition-colors">
                      <td className="text-[10px] font-mono text-[#7D8EA5]">
                        {formatIST(t.time)}
                      </td>
                      <td className="font-semibold text-[#F8FAFC] text-[11px]">{symStr}</td>
                      <td className="text-[10px] font-mono text-[#22D3EE]">{marketStr}</td>
                      <td className="text-center font-mono">
                        <span
                          className={cn(
                            "px-1 py-0.2 rounded text-[9px] font-bold",
                            isBuy ? "bg-[#00E89A]/15 text-[#00E89A]" : "bg-[#FF3B5C]/15 text-[#FF3B5C]"
                          )}
                        >
                          {t.side}
                        </span>
                      </td>
                      <td className="text-right text-[#F8FAFC] tabular-nums font-mono text-[10px]">
                        {t.quantity.toLocaleString()}
                      </td>
                      <td className="text-right text-[#F8FAFC] tabular-nums font-mono text-[10px]">
                        {formatMoney(t.price, sym)}
                      </td>
                      <td
                        className={cn(
                          "text-right tabular-nums font-mono font-bold text-[10px]",
                          isProfit ? "text-[#00E89A]" : "text-[#FF3B5C]"
                        )}
                      >
                        {isProfit ? "+" : ""}
                        {formatMoney(t.realizedPnl, sym)}
                      </td>
                      <td className="text-center font-mono">
                        <span
                          className={cn(
                            "px-1.5 py-0.2 rounded text-[9px] font-bold border",
                            isFilled
                              ? "bg-[#00E89A]/10 text-[#00E89A] border-[#00E89A]/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          )}
                        >
                          {t.status}
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
        <span>Central Ledger Sync Latency: <span className="text-[#00E89A]">14ms</span></span>
        <span>Reconciled Orders: <span className="text-[#F8FAFC]">{trades.length}</span></span>
      </div>
    </div>
  );
}

