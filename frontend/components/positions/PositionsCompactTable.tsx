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
  Clock,
  AlertTriangle,
  Flame,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PositionRecord, formatPositionDuration } from "@/types/positions";

interface PositionsCompactTableProps {
  positions: PositionRecord[];
  onSelectPosition: (pos: PositionRecord) => void;
  onModifyProtection: (pos: PositionRecord) => void;
  onSquareOff: (pos: PositionRecord) => void;
  onPartialClose: (pos: PositionRecord) => void;
  onMoveToBreakeven: (pos: PositionRecord) => void;
}

export function PositionsCompactTable({
  positions,
  onSelectPosition,
  onModifyProtection,
  onSquareOff,
  onPartialClose,
  onMoveToBreakeven,
}: PositionsCompactTableProps) {
  const router = useRouter();

  return (
    <div className="w-full overflow-x-auto rounded-3xl bg-[var(--theme-surface)]/90 backdrop-blur-md border border-[var(--theme-border)] shadow-xl font-sans select-none">
      <table className="w-full text-left text-xs border-collapse">
        {/* Table Header */}
        <thead>
          <tr className="border-b border-[var(--theme-border)] bg-[var(--theme-elevated)]/70 text-[var(--theme-text-muted)] font-mono text-[11px] uppercase tracking-wider">
            <th className="py-3.5 px-4 font-bold">Instrument & Bot</th>
            <th className="py-3.5 px-3 font-bold">Side & Lev</th>
            <th className="py-3.5 px-3 font-bold text-right">Entry / Mark</th>
            <th className="py-3.5 px-3 font-bold text-right">Size / Value</th>
            <th className="py-3.5 px-3 font-bold text-right">Stop Loss</th>
            <th className="py-3.5 px-3 font-bold text-right">Take Profit</th>
            <th className="py-3.5 px-3 font-bold text-right">Floating P&L</th>
            <th className="py-3.5 px-3 font-bold text-center">R-Multiple</th>
            <th className="py-3.5 px-3 font-bold text-center">Duration</th>
            <th className="py-3.5 px-4 font-bold text-right">Quick Actions</th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-[var(--theme-border-subtle)] font-mono">
          {positions.map((pos) => {
            const isLong = (pos.direction || pos.side || "LONG").toUpperCase().includes("LONG") || (pos.direction || pos.side || "LONG").toUpperCase().includes("BUY");
            const isProfit = pos.unrealized_pnl >= 0;
            const entryP = Number(pos.entry_price || 0);
            const currP = Number(pos.current_price || pos.mark_price || entryP);
            const slP = Number(pos.stop_loss || 0);
            const tpP = Number(pos.take_profit || 0);
            const qty = Number(pos.position_size || pos.quantity || 0);
            const notional = pos.current_notional || entryP * qty;
            const lev = pos.leverage || 5;
            const rMult = pos.r_multiple || 0;
            const hasWarnings = pos.risk_warnings && pos.risk_warnings.length > 0;
            const isAtBreakeven = Math.abs(slP - entryP) < (entryP * 0.001);

            return (
              <tr
                key={pos.id}
                className="hover:bg-[var(--theme-elevated)]/60 transition-colors group cursor-pointer"
                onClick={() => onSelectPosition(pos)}
              >
                {/* 1. Instrument & Bot Origin */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[var(--theme-text-primary)] font-sans group-hover:text-[var(--theme-accent)] transition-colors">
                      {pos.symbol}
                    </span>
                    {hasWarnings && (
                      <span title={pos.risk_warnings?.join(", ")}>
                        <AlertTriangle className="h-3.5 w-3.5 text-[var(--theme-warning)] shrink-0 animate-bounce" />
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--theme-text-secondary)] truncate max-w-[150px] font-sans">
                    {pos.bot_name || pos.bot_id || "Fleet OMS"} • {pos.strategy || "Confluence"}
                  </div>
                </td>

                {/* 2. Side & Leverage */}
                <td className="py-3.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${
                        isLong
                          ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border-[var(--theme-profit)]/30"
                          : "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/30"
                      }`}
                    >
                      {isLong ? "LONG" : "SHORT"}
                    </span>
                    <span className="text-[10px] text-[var(--theme-text-muted)] bg-[var(--theme-elevated)] px-1.5 py-0.5 rounded border border-[var(--theme-border-subtle)] font-bold">
                      {lev}x
                    </span>
                  </div>
                </td>

                {/* 3. Entry / Current Mark Price */}
                <td className="py-3.5 px-3 text-right tabular-nums">
                  <div className="font-extrabold text-[var(--theme-text-primary)]">
                    ${currP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-[var(--theme-text-muted)]">
                    Entry: ${entryP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </td>

                {/* 4. Quantity & Notional */}
                <td className="py-3.5 px-3 text-right tabular-nums">
                  <div className="text-[var(--theme-text-primary)] font-bold">{qty}</div>
                  <div className="text-[10px] text-[var(--theme-text-muted)]">
                    ${notional.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                </td>

                {/* 5. Stop Loss & Breakeven Status */}
                <td className="py-3.5 px-3 text-right tabular-nums">
                  <div className="text-[var(--theme-loss)] font-bold flex items-center justify-end gap-1">
                    {isAtBreakeven && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--theme-accent)]/20 text-[var(--theme-accent)] border border-[var(--theme-accent)]/30 font-sans">
                        BE
                      </span>
                    )}
                    <span>${slP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                    className={`text-sm font-black flex items-center justify-end gap-0.5 ${
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
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold border ${
                      rMult >= 1.0
                        ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border-[var(--theme-profit)]/30"
                        : rMult <= -1.0
                        ? "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/30"
                        : "bg-[var(--theme-elevated)] text-[var(--theme-text-secondary)] border-[var(--theme-border-subtle)]"
                    }`}
                  >
                    {rMult >= 0 ? "+" : ""}{rMult.toFixed(2)} R
                  </span>
                </td>

                {/* 9. Holding Duration */}
                <td className="py-3.5 px-3 text-center text-[11px] text-[var(--theme-text-secondary)]">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3 text-[var(--theme-text-muted)]" />
                    <span>{formatPositionDuration(pos.duration_seconds)}</span>
                  </div>
                </td>

                {/* 10. Quick Action Controls */}
                <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    {/* 1-Click Breakeven Button */}
                    {!isAtBreakeven && (
                      <button
                        onClick={() => onMoveToBreakeven(pos)}
                        className="px-2 py-1 rounded-lg bg-[var(--theme-elevated)] hover:bg-[var(--theme-accent)]/20 text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] border border-[var(--theme-border-subtle)] text-[10px] font-extrabold transition shadow-sm"
                        title="Move Stop Loss to Breakeven (Entry Price)"
                      >
                        BE
                      </button>
                    )}

                    {/* Protection SL/TP Modifier */}
                    <button
                      onClick={() => onModifyProtection(pos)}
                      className="p-1.5 rounded-lg bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] border border-[var(--theme-border-subtle)] transition shadow-sm"
                      title="Adjust SL / TP Protection Limits"
                    >
                      <Sliders className="h-3.5 w-3.5" />
                    </button>

                    {/* Chart Navigation */}
                    <button
                      onClick={() => router.push(`/charts?symbol=${encodeURIComponent(pos.symbol)}`)}
                      className="p-1.5 rounded-lg bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border-subtle)] transition shadow-sm"
                      title="Open Terminal Chart"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>

                    {/* Scale-Out Exit */}
                    <button
                      onClick={() => onPartialClose(pos)}
                      className="px-2 py-1 rounded-lg bg-[var(--theme-elevated)] hover:bg-[var(--theme-warning)]/20 text-[var(--theme-text-secondary)] hover:text-[var(--theme-warning)] border border-[var(--theme-border-subtle)] text-[10px] font-extrabold transition shadow-sm"
                      title="Partial Scale Close"
                    >
                      SCALE
                    </button>

                    {/* Full Square Off */}
                    <button
                      onClick={() => onSquareOff(pos)}
                      className="px-2.5 py-1 rounded-lg bg-[var(--theme-loss)]/15 hover:bg-[var(--theme-loss)] text-[var(--theme-loss)] hover:text-white border border-[var(--theme-loss)]/30 text-[10px] font-extrabold transition shadow-sm active:scale-95"
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
