"use client";

import React from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Target,
  Sliders,
  XCircle,
  ExternalLink,
  Info,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";

export interface PositionRecord {
  id: number;
  trade_id?: number | string;
  symbol: string;
  direction: string;
  side: string;
  entry_price: number;
  current_price: number;
  mark_price?: number;
  position_size: number;
  quantity?: number;
  notional_value?: number;
  current_notional?: number;
  margin_used?: number;
  leverage?: number;
  stop_loss?: number;
  take_profit?: number;
  trailing_stop?: number;
  liquidation_price?: number;
  sl_distance_price?: number;
  sl_distance_pct?: number;
  tp_distance_price?: number;
  tp_distance_pct?: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  planned_risk?: number;
  planned_reward?: number;
  risk_reward_ratio?: number;
  r_multiple?: number;
  entry_timestamp?: string;
  duration_seconds?: number;
  bot_id?: string;
  bot_name?: string;
  strategy?: string;
  execution_mode?: string;
  risk_warnings?: string[];
  broker_status?: string;
}

interface PositionsCompactTableProps {
  positions: PositionRecord[];
  onSelectPosition: (pos: PositionRecord) => void;
  onModifyProtection: (pos: PositionRecord) => void;
  onSquareOff: (pos: PositionRecord) => void;
  onPartialClose: (pos: PositionRecord) => void;
}

export function PositionsCompactTable({
  positions,
  onSelectPosition,
  onModifyProtection,
  onSquareOff,
  onPartialClose,
}: PositionsCompactTableProps) {
  const router = useRouter();

  function formatDuration(sec?: number): string {
    if (!sec || sec <= 0) return "Just now";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-md font-sans select-none">
      <table className="w-full text-left text-xs border-collapse">
        {/* Table Header */}
        <thead>
          <tr className="border-b border-[var(--theme-border)] bg-[var(--theme-elevated)]/60 text-[var(--theme-text-muted)] font-mono text-[11px] uppercase">
            <th className="py-3 px-4 font-semibold">Instrument & Bot</th>
            <th className="py-3 px-3 font-semibold">Side & Lev</th>
            <th className="py-3 px-3 font-semibold text-right">Entry / Mark</th>
            <th className="py-3 px-3 font-semibold text-right">Size / Value</th>
            <th className="py-3 px-3 font-semibold text-right">Stop Loss</th>
            <th className="py-3 px-3 font-semibold text-right">Take Profit</th>
            <th className="py-3 px-3 font-semibold text-right">Floating P&L</th>
            <th className="py-3 px-3 font-semibold text-center">R-Multiple</th>
            <th className="py-3 px-3 font-semibold text-center">Duration</th>
            <th className="py-3 px-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-[var(--theme-border-subtle)] font-mono">
          {positions.map((pos) => {
            const isLong = pos.direction.includes("LONG") || pos.direction.includes("BUY");
            const isProfit = pos.unrealized_pnl >= 0;
            const entryP = Number(pos.entry_price || 0);
            const currP = Number(pos.current_price || pos.mark_price || entryP);
            const slP = Number(pos.stop_loss || 0);
            const tpP = Number(pos.take_profit || 0);
            const qty = Number(pos.position_size || pos.quantity || 0);
            const notional = pos.current_notional || entryP * qty;
            const lev = pos.leverage || 5;
            const rMult = pos.r_multiple || 0;
            const hasWarnings = (pos.risk_warnings && pos.risk_warnings.length > 0);

            return (
              <tr
                key={pos.id}
                className="hover:bg-[var(--theme-elevated)]/50 transition-colors group cursor-pointer"
                onClick={() => onSelectPosition(pos)}
              >
                {/* 1. Instrument & Bot */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[var(--theme-text-primary)] font-sans">
                      {pos.symbol}
                    </span>
                    {hasWarnings && (
                      <span title={pos.risk_warnings?.join(", ")}>
                        <AlertTriangle className="h-3.5 w-3.5 text-[var(--theme-warning)] shrink-0" />
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--theme-text-secondary)] truncate max-w-[140px] font-sans">
                    {pos.bot_name || pos.bot_id || "Bot-1"} • {pos.strategy || "Confluence"}
                  </div>
                </td>

                {/* 2. Side & Leverage */}
                <td className="py-3.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isLong
                          ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border-[var(--theme-profit)]/30"
                          : "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/30"
                      }`}
                    >
                      {isLong ? "LONG" : "SHORT"}
                    </span>
                    <span className="text-[10px] text-[var(--theme-text-muted)] bg-[var(--theme-elevated)] px-1.5 py-0.5 rounded border border-[var(--theme-border-subtle)]">
                      {lev}x
                    </span>
                  </div>
                </td>

                {/* 3. Entry / Mark Price */}
                <td className="py-3.5 px-3 text-right tabular-nums">
                  <div className="font-bold text-[var(--theme-text-primary)]">
                    ${currP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-[var(--theme-text-muted)]">
                    Entry: ${entryP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </td>

                {/* 4. Size & Notional Value */}
                <td className="py-3.5 px-3 text-right tabular-nums">
                  <div className="text-[var(--theme-text-primary)] font-bold">{qty}</div>
                  <div className="text-[10px] text-[var(--theme-text-muted)]">
                    ${notional.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                </td>

                {/* 5. Stop Loss */}
                <td className="py-3.5 px-3 text-right tabular-nums">
                  <div className="text-[var(--theme-loss)] font-bold">
                    ${slP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-[var(--theme-loss)] opacity-80">
                    -{pos.sl_distance_pct?.toFixed(2) || "2.00"}%
                  </div>
                </td>

                {/* 6. Take Profit */}
                <td className="py-3.5 px-3 text-right tabular-nums">
                  <div className="text-[var(--theme-profit)] font-bold">
                    ${tpP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-[var(--theme-profit)] opacity-80">
                    +{pos.tp_distance_pct?.toFixed(2) || "4.00"}%
                  </div>
                </td>

                {/* 7. Floating P&L */}
                <td className="py-3.5 px-3 text-right tabular-nums">
                  <div
                    className={`text-sm font-extrabold flex items-center justify-end gap-0.5 ${
                      isProfit ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"
                    }`}
                  >
                    {isProfit ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    <span>{isProfit ? "+" : ""}${pos.unrealized_pnl.toFixed(2)}</span>
                  </div>
                  <div
                    className={`text-[10px] font-bold ${
                      isProfit ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"
                    }`}
                  >
                    {isProfit ? "+" : ""}{pos.unrealized_pnl_pct.toFixed(2)}%
                  </div>
                </td>

                {/* 8. R-Multiple */}
                <td className="py-3.5 px-3 text-center tabular-nums">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      rMult >= 1.0
                        ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)]"
                        : rMult <= -1.0
                        ? "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)]"
                        : "bg-[var(--theme-elevated)] text-[var(--theme-text-secondary)]"
                    }`}
                  >
                    {rMult >= 0 ? "+" : ""}{rMult.toFixed(2)} R
                  </span>
                </td>

                {/* 9. Holding Duration */}
                <td className="py-3.5 px-3 text-center text-[11px] text-[var(--theme-text-secondary)]">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3 text-[var(--theme-text-muted)]" />
                    <span>{formatDuration(pos.duration_seconds)}</span>
                  </div>
                </td>

                {/* 10. Actions Bar */}
                <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Modify Protection Button */}
                    <button
                      onClick={() => onModifyProtection(pos)}
                      className="p-1.5 rounded-lg bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] border border-[var(--theme-border-subtle)] transition"
                      title="Adjust Stop Loss / Take Profit"
                    >
                      <Sliders className="h-3.5 w-3.5" />
                    </button>

                    {/* Open Chart Button */}
                    <button
                      onClick={() => router.push(`/charts?symbol=${encodeURIComponent(pos.symbol)}`)}
                      className="p-1.5 rounded-lg bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border-subtle)] transition"
                      title="Open Terminal Chart"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>

                    {/* Partial Close Button */}
                    <button
                      onClick={() => onPartialClose(pos)}
                      className="px-2 py-1 rounded-lg bg-[var(--theme-elevated)] hover:bg-[var(--theme-warning)]/20 text-[var(--theme-text-secondary)] hover:text-[var(--theme-warning)] border border-[var(--theme-border-subtle)] text-[10px] font-bold transition"
                      title="Partial Close Position"
                    >
                      SCALE
                    </button>

                    {/* Full Square Off Button */}
                    <button
                      onClick={() => onSquareOff(pos)}
                      className="px-2.5 py-1 rounded-lg bg-[var(--theme-loss)]/15 hover:bg-[var(--theme-loss)] text-[var(--theme-loss)] hover:text-white border border-[var(--theme-loss)]/30 text-[10px] font-bold transition"
                      title="Full Market Square Off"
                    >
                      CLOSE
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
