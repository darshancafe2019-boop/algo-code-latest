"use client";

import React from "react";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Shield,
  Clock,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { formatPrice, formatPnL } from "@/lib/formatters";

interface JournalOpenPositionsProps {
  positions: any[];
  onSelectTrade: (trade: any) => void;
  currency?: string;
}

export function JournalOpenPositions({
  positions,
  onSelectTrade,
  currency = "$",
}: JournalOpenPositionsProps) {
  if (!positions || positions.length === 0) return null;

  return (
    <div className="p-4 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-md space-y-3 font-sans select-none">
      <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--theme-accent)] animate-ping" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-primary)]">
            Active Open Positions ({positions.length})
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[var(--theme-text-muted)]">
          Real-Time Exposure & Trailing Brackets
        </span>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs font-mono">
          <thead className="text-[10px] uppercase text-[var(--theme-text-muted)] border-b border-[var(--theme-border-subtle)]">
            <tr>
              <th className="py-2 px-2">Symbol</th>
              <th className="py-2 px-2">Side</th>
              <th className="py-2 px-2">Strategy</th>
              <th className="py-2 px-2">Entry</th>
              <th className="py-2 px-2">Qty</th>
              <th className="py-2 px-2">SL / Target</th>
              <th className="py-2 px-2">Unrealized P&L</th>
              <th className="py-2 px-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--theme-border-subtle)]">
            {positions.map((pos) => {
              const isLong = (pos.direction || pos.side || "LONG").toUpperCase().includes("BUY") || pos.direction === "LONG";
              const unPnl = Number(pos.unrealized_pnl || 0);
              const isProfit = unPnl >= 0;

              return (
                <tr key={pos.id} className="hover:bg-[var(--theme-elevated)] transition">
                  <td className="py-2.5 px-2 font-bold text-[var(--theme-text-primary)]">
                    {pos.symbol}
                    <span className="text-[9px] text-[var(--theme-text-muted)] block">#{pos.id}</span>
                  </td>
                  <td className="py-2.5 px-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isLong ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)]" : "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)]"
                    }`}>
                      {isLong ? "LONG" : "SHORT"}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-[var(--theme-text-secondary)]">
                    {pos.strategy || "Trend Confluence"}
                  </td>
                  <td className="py-2.5 px-2 tabular-nums">
                    ${formatPrice(Number(pos.entry_price || 0), "", 2)}
                  </td>
                  <td className="py-2.5 px-2 tabular-nums">
                    {pos.position_size || pos.quantity || "0.1"}
                  </td>
                  <td className="py-2.5 px-2 text-[11px] tabular-nums">
                    <span className="text-[var(--theme-loss)]">${pos.stop_loss || "—"}</span> / <span className="text-[var(--theme-profit)]">${pos.take_profit || "—"}</span>
                  </td>
                  <td className="py-2.5 px-2 font-bold tabular-nums">
                    <span className={isProfit ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}>
                      {formatPnL(unPnl, currency, 2).formatted}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectTrade(pos)}
                      className="px-2.5 py-1 rounded-lg bg-[var(--theme-elevated)] hover:bg-[var(--theme-border-subtle)] text-[11px] font-semibold text-[var(--theme-text-primary)] transition"
                    >
                      Audit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
