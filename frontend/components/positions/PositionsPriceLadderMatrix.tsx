"use client";

import React from "react";
import {
  Shield,
  Target,
  Sliders,
  Radio,
  Flame,
  ArrowRight,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PositionRecord } from "@/types/positions";

interface PositionsPriceLadderMatrixProps {
  positions: PositionRecord[];
  onSelectPosition: (pos: PositionRecord) => void;
  onModifyProtection: (pos: PositionRecord) => void;
  onSquareOff: (pos: PositionRecord) => void;
  onMoveToBreakeven: (pos: PositionRecord) => void;
}

export function PositionsPriceLadderMatrix({
  positions,
  onSelectPosition,
  onModifyProtection,
  onSquareOff,
  onMoveToBreakeven,
}: PositionsPriceLadderMatrixProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 font-sans select-none">
      {positions.map((pos) => {
        const isLong = (pos.direction || pos.side || "LONG").toUpperCase().includes("LONG") || (pos.direction || pos.side || "LONG").toUpperCase().includes("BUY");
        const isProfit = pos.unrealized_pnl >= 0;
        const entryP = Number(pos.entry_price || 0);
        const currP = Number(pos.current_price || pos.mark_price || entryP);
        const slP = Number(pos.stop_loss || (isLong ? entryP * 0.98 : entryP * 1.02));
        const tpP = Number(pos.take_profit || (isLong ? entryP * 1.04 : entryP * 0.96));
        const liqP = Number(pos.liquidation_price || (isLong ? entryP * 0.85 : entryP * 1.15));

        // Multi-level TP targets
        const tpDelta = Math.abs(tpP - entryP);
        const tp2 = isLong ? round2(entryP + tpDelta * 1.5) : round2(entryP - tpDelta * 1.5);
        const tp3 = isLong ? round2(entryP + tpDelta * 2.0) : round2(entryP - tpDelta * 2.0);
        const trailingSl = Number(pos.trailing_stop || slP);
        const isAtBreakeven = Math.abs(slP - entryP) < (entryP * 0.001);

        function round2(v: number) {
          return Math.round(v * 100) / 100;
        }

        return (
          <div
            key={pos.id}
            onClick={() => onSelectPosition(pos)}
            className="p-5 rounded-3xl bg-[var(--theme-surface)]/90 backdrop-blur-md border border-[var(--theme-border)] shadow-xl space-y-4 cursor-pointer hover:border-[var(--theme-accent)]/50 transition-all group"
          >
            {/* Header: Symbol & Float P&L */}
            <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-[var(--theme-text-primary)] group-hover:text-[var(--theme-accent)] transition-colors">
                  {pos.symbol}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-lg text-xs font-mono font-extrabold border ${
                    isLong
                      ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border-[var(--theme-profit)]/30"
                      : "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/30"
                  }`}
                >
                  {isLong ? "LONG" : "SHORT"} {pos.leverage || 5}x
                </span>
              </div>

              <div className="text-right font-mono tabular-nums">
                <span
                  className={`text-sm font-black block ${
                    isProfit ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"
                  }`}
                >
                  {isProfit ? "+" : ""}${pos.unrealized_pnl.toFixed(2)} ({pos.unrealized_pnl_pct.toFixed(2)}%)
                </span>
                <span className="text-[10px] text-[var(--theme-text-muted)]">
                  Live Mark: ${currP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Vertical Price Ladder Stack */}
            <div className="space-y-2 font-mono text-xs">
              {/* Level: Extended Take Profit Target (TP3) */}
              <div className="p-2.5 rounded-2xl bg-[var(--theme-elevated)]/40 border border-[var(--theme-profit)]/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--theme-profit)]/40" />
                  <span className="text-[11px] text-[var(--theme-profit)]/80 font-bold">TP 3 (Runner Target)</span>
                </div>
                <div className="text-right tabular-nums">
                  <span className="font-bold text-[var(--theme-text-secondary)]">
                    ${tp3.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-[var(--theme-profit)] ml-1.5 font-bold">
                    +{Math.abs(((tp3 - entryP) / entryP) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Level: Extended Take Profit Target (TP2) */}
              <div className="p-2.5 rounded-2xl bg-[var(--theme-elevated)]/70 border border-[var(--theme-profit)]/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--theme-profit)]/80" />
                  <span className="text-[11px] text-[var(--theme-profit)] font-bold">TP 2 (Extension Target)</span>
                </div>
                <div className="text-right tabular-nums">
                  <span className="font-bold text-[var(--theme-text-primary)]">
                    ${tp2.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-[var(--theme-profit)] ml-1.5 font-bold">
                    +{Math.abs(((tp2 - entryP) / entryP) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Level: Primary Take Profit (TP1) */}
              <div className="p-2.5 rounded-2xl bg-[var(--theme-profit)]/15 border border-[var(--theme-profit)]/50 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-[var(--theme-profit)]" />
                  <span className="text-[11px] text-[var(--theme-profit)] font-extrabold">TP 1 (Primary Target)</span>
                </div>
                <div className="text-right tabular-nums">
                  <span className="font-black text-[var(--theme-profit)]">
                    ${tpP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-[var(--theme-profit)] ml-1.5 font-extrabold">
                    +{pos.tp_distance_pct?.toFixed(2) || "4.00"}%
                  </span>
                </div>
              </div>

              {/* Level: Current Mark Price (ACTIVE TICK) */}
              <div className="p-3 rounded-2xl bg-[var(--theme-accent)]/15 border-2 border-[var(--theme-accent)] shadow-md flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-[var(--theme-accent)] animate-pulse" />
                  <span className="text-xs text-[var(--theme-text-primary)] font-bold font-sans">
                    CURRENT MARKET MARK
                  </span>
                </div>
                <div className="text-right tabular-nums">
                  <span className="text-sm font-black text-[var(--theme-text-primary)]">
                    ${currP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span
                    className={`text-xs ml-2 font-black ${
                      isProfit ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"
                    }`}
                  >
                    {isProfit ? "+" : ""}${pos.unrealized_pnl.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Level: Entry Price & Breakeven */}
              <div className="p-2.5 rounded-2xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] flex items-center justify-between text-[var(--theme-text-muted)]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--theme-text-muted)]" />
                  <span className="text-[11px] font-semibold">ENTRY / BASIS</span>
                </div>
                <div className="text-right tabular-nums text-[var(--theme-text-primary)] font-bold">
                  ${entryP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Level: Trailing Stop Level */}
              {trailingSl !== slP && (
                <div className="p-2 rounded-2xl bg-[var(--theme-elevated)] border border-[var(--theme-warning)]/30 flex items-center justify-between text-[var(--theme-warning)]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--theme-warning)]" />
                    <span className="text-[11px] font-bold">DYNAMIC TRAILING STOP</span>
                  </div>
                  <div className="text-right tabular-nums font-bold">
                    ${trailingSl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}

              {/* Level: Stop Loss Boundary */}
              <div className="p-2.5 rounded-2xl bg-[var(--theme-loss)]/10 border border-[var(--theme-loss)]/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-[var(--theme-loss)]" />
                  <span className="text-[11px] text-[var(--theme-loss)] font-bold">STOP LOSS BOUNDARY</span>
                  {isAtBreakeven && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--theme-accent)]/20 text-[var(--theme-accent)] font-sans font-bold">
                      BREAKEVEN
                    </span>
                  )}
                </div>
                <div className="text-right tabular-nums">
                  <span className="font-black text-[var(--theme-loss)]">
                    ${slP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-[var(--theme-loss)] ml-1.5 font-bold">
                    -{pos.sl_distance_pct?.toFixed(2) || "2.00"}%
                  </span>
                </div>
              </div>

              {/* Level: Liquidation Risk Price */}
              <div className="p-2 rounded-2xl bg-[var(--theme-elevated)]/40 border border-[var(--theme-border-subtle)] flex items-center justify-between text-[var(--theme-text-muted)] text-[10px]">
                <div className="flex items-center gap-1.5">
                  <Flame className="h-3 w-3 text-[var(--theme-loss)]" />
                  <span>ESTIMATED LIQUIDATION</span>
                </div>
                <span className="font-bold text-[var(--theme-warning)] tabular-nums">
                  ${liqP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Bottom Action Controls */}
            <div
              className="flex items-center justify-between border-t border-[var(--theme-border-subtle)] pt-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1.5">
                {!isAtBreakeven && (
                  <button
                    onClick={() => onMoveToBreakeven(pos)}
                    className="px-3 py-1.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-accent)]/20 text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] border border-[var(--theme-border-subtle)] text-xs font-bold transition"
                  >
                    MOVE TO BE
                  </button>
                )}
                <button
                  onClick={() => onModifyProtection(pos)}
                  className="px-3 py-1.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] border border-[var(--theme-border-subtle)] text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>ADJUST SL / TP</span>
                </button>
              </div>

              <button
                onClick={() => onSquareOff(pos)}
                className="px-4 py-1.5 rounded-xl bg-[var(--theme-loss)]/15 hover:bg-[var(--theme-loss)] text-[var(--theme-loss)] hover:text-white border border-[var(--theme-loss)]/30 text-xs font-extrabold font-mono transition active:scale-95"
              >
                SQUARE OFF
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
