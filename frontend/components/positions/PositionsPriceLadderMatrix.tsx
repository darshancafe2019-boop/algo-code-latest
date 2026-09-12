"use client";

import React from "react";
import {
  Shield,
  Target,
  Sliders,
  Radio,
  Flame,
} from "lucide-react";
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
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-sans select-none">
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
            className="p-5 rounded-xl bg-[#0A1422] border border-[#1A2A3F] shadow-sm space-y-4 cursor-pointer hover:border-[#29415F] transition-all group"
          >
            {/* Header: Symbol & Float P&L */}
            <div className="flex items-center justify-between border-b border-[#122033] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-[#F7FAFC] group-hover:text-[#19C5FF] transition-colors">
                  {pos.symbol}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${
                    isLong
                      ? "bg-[#00E890]/15 text-[#00E890] border-[#00E890]/30"
                      : "bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/30"
                  }`}
                >
                  {isLong ? "LONG" : "SHORT"} {pos.leverage || 5}x
                </span>
              </div>

              <div className="text-right tabular-nums">
                <span
                  className={`text-sm font-bold block ${
                    isProfit ? "text-[#00E890]" : "text-[#FF3B5C]"
                  }`}
                >
                  {isProfit ? "+" : ""}${pos.unrealized_pnl.toFixed(2)} ({pos.unrealized_pnl_pct.toFixed(2)}%)
                </span>
                <span className="text-xs text-[#52627A]">
                  Live Mark: ${currP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Vertical Price Ladder Stack */}
            <div className="space-y-2 text-xs">
              {/* Level: Extended Take Profit Target (TP3) */}
              <div className="p-2.5 rounded-lg bg-[#0D1727] border border-[#00E890]/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00E890]/40" />
                  <span className="text-xs text-[#00E890]/80 font-medium">TP 3 (Runner Target)</span>
                </div>
                <div className="text-right tabular-nums">
                  <span className="font-semibold text-[#7C8CA3]">
                    ${tp3.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-[#00E890] ml-1.5 font-semibold">
                    +{Math.abs(((tp3 - entryP) / entryP) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Level: Extended Take Profit Target (TP2) */}
              <div className="p-2.5 rounded-lg bg-[#0D1727] border border-[#00E890]/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00E890]/80" />
                  <span className="text-xs text-[#00E890] font-medium">TP 2 (Extension Target)</span>
                </div>
                <div className="text-right tabular-nums">
                  <span className="font-semibold text-[#F7FAFC]">
                    ${tp2.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-[#00E890] ml-1.5 font-semibold">
                    +{Math.abs(((tp2 - entryP) / entryP) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Level: Primary Take Profit (TP1) */}
              <div className="p-2.5 rounded-lg bg-[#00E890]/10 border border-[#00E890]/40 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-[#00E890]" />
                  <span className="text-xs text-[#00E890] font-semibold">TP 1 (Primary Target)</span>
                </div>
                <div className="text-right tabular-nums">
                  <span className="font-bold text-[#00E890]">
                    ${tpP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-[#00E890] ml-1.5 font-semibold">
                    +{pos.tp_distance_pct?.toFixed(2) || "4.00"}%
                  </span>
                </div>
              </div>

              {/* Level: Current Mark Price (ACTIVE TICK) */}
              <div className="p-3 rounded-lg bg-[#2563EB]/15 border border-[#2563EB] shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-[#19C5FF] animate-pulse" />
                  <span className="text-xs text-[#F7FAFC] font-semibold">
                    Current Market Mark
                  </span>
                </div>
                <div className="text-right tabular-nums">
                  <span className="text-sm font-bold text-[#F7FAFC]">
                    ${currP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span
                    className={`text-xs ml-2 font-bold ${
                      isProfit ? "text-[#00E890]" : "text-[#FF3B5C]"
                    }`}
                  >
                    {isProfit ? "+" : ""}${pos.unrealized_pnl.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Level: Entry Price & Breakeven */}
              <div className="p-2.5 rounded-lg bg-[#0D1727] border border-[#1A2A3F] flex items-center justify-between text-[#52627A]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#52627A]" />
                  <span className="text-xs font-medium">Entry / Basis</span>
                </div>
                <div className="text-right tabular-nums text-[#F7FAFC] font-semibold">
                  ${entryP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Level: Trailing Stop Level */}
              {trailingSl !== slP && (
                <div className="p-2 rounded-lg bg-[#0D1727] border border-[#F59E0B]/30 flex items-center justify-between text-[#F59E0B]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                    <span className="text-xs font-medium">Dynamic Trailing Stop</span>
                  </div>
                  <div className="text-right tabular-nums font-semibold">
                    ${trailingSl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}

              {/* Level: Stop Loss Boundary */}
              <div className="p-2.5 rounded-lg bg-[#FF3B5C]/10 border border-[#FF3B5C]/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-[#FF3B5C]" />
                  <span className="text-xs text-[#FF3B5C] font-semibold">Stop Loss Boundary</span>
                  {isAtBreakeven && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#2563EB]/20 text-[#19C5FF] font-semibold">
                      BE
                    </span>
                  )}
                </div>
                <div className="text-right tabular-nums">
                  <span className="font-bold text-[#FF3B5C]">
                    ${slP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-[#FF3B5C] ml-1.5 font-semibold">
                    -{pos.sl_distance_pct?.toFixed(2) || "2.00"}%
                  </span>
                </div>
              </div>

              {/* Level: Liquidation Risk Price */}
              <div className="p-2 rounded-lg bg-[#0D1727] border border-[#1A2A3F] flex items-center justify-between text-[#52627A] text-xs">
                <div className="flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-[#FF3B5C]" />
                  <span>Estimated Liquidation</span>
                </div>
                <span className="font-semibold text-[#F59E0B] tabular-nums">
                  ${liqP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Bottom Action Controls */}
            <div
              className="flex items-center justify-between border-t border-[#122033] pt-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1.5">
                {!isAtBreakeven && (
                  <button
                    onClick={() => onMoveToBreakeven(pos)}
                    className="px-3 py-1.5 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] text-[#7C8CA3] hover:text-[#19C5FF] border border-[#1A2A3F] text-xs font-semibold transition"
                  >
                    Move to BE
                  </button>
                )}
                <button
                  onClick={() => onModifyProtection(pos)}
                  className="px-3 py-1.5 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] text-[#7C8CA3] hover:text-[#19C5FF] border border-[#1A2A3F] text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Adjust SL / TP</span>
                </button>
              </div>

              <button
                onClick={() => onSquareOff(pos)}
                className="px-3.5 py-1.5 rounded-lg bg-[#FF3B5C]/15 hover:bg-[#FF3B5C] text-[#FF3B5C] hover:text-white border border-[#FF3B5C]/30 text-xs font-semibold transition active:scale-95"
              >
                Square Off
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
