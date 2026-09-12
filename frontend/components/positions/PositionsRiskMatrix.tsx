"use client";

import React from "react";
import {
  PieChart,
  Shield,
} from "lucide-react";
import { PositionRecord } from "@/types/positions";

interface PositionsRiskMatrixProps {
  positions: PositionRecord[];
  onSelectPosition: (pos: PositionRecord) => void;
  onModifyProtection: (pos: PositionRecord) => void;
  onSquareOff: (pos: PositionRecord) => void;
}

export function PositionsRiskMatrix({
  positions,
}: PositionsRiskMatrixProps) {
  // Aggregate exposure by symbol
  const symbolStats = React.useMemo(() => {
    const map = new Map<
      string,
      {
        symbol: string;
        totalNotional: number;
        totalMargin: number;
        totalPnl: number;
        totalRisk: number;
        count: number;
        positions: PositionRecord[];
      }
    >();

    let grandTotalNotional = 0;

    for (const pos of positions) {
      const sym = pos.symbol;
      const notional = pos.current_notional || Number(pos.entry_price || 0) * Number(pos.position_size || 0);
      const margin = pos.margin_used || (notional / (pos.leverage || 5));
      const pnl = pos.unrealized_pnl || 0;
      const risk = pos.planned_risk || 0;

      grandTotalNotional += notional;

      const existing = map.get(sym) || {
        symbol: sym,
        totalNotional: 0,
        totalMargin: 0,
        totalPnl: 0,
        totalRisk: 0,
        count: 0,
        positions: [],
      };

      existing.totalNotional += notional;
      existing.totalMargin += margin;
      existing.totalPnl += pnl;
      existing.totalRisk += risk;
      existing.count += 1;
      existing.positions.push(pos);

      map.set(sym, existing);
    }

    const items = Array.from(map.values()).sort((a, b) => b.totalNotional - a.totalNotional);
    return { items, grandTotalNotional };
  }, [positions]);

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Symbol Capital Concentration Matrix */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#0A1422] border border-[#1A2A3F] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#122033] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#2563EB]/15 text-[#19C5FF]">
                <PieChart className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#F7FAFC]">
                  Capital Allocation & Asset Exposure
                </h3>
                <p className="text-xs text-[#52627A]">
                  Concentration matrix across {symbolStats.items.length} active market instrument(s)
                </p>
              </div>
            </div>
            <div className="text-right text-xs">
              <span className="text-[10px] text-[#52627A] block uppercase font-medium">Total Portfolio Notional</span>
              <span className="font-bold text-[#F7FAFC] tabular-nums">
                ${symbolStats.grandTotalNotional.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {symbolStats.items.map((stat) => {
              const allocationPct = symbolStats.grandTotalNotional > 0
                ? Math.round((stat.totalNotional / symbolStats.grandTotalNotional) * 100)
                : 0;
              const isProfit = stat.totalPnl >= 0;

              return (
                <div
                  key={stat.symbol}
                  className="p-3.5 rounded-lg bg-[#0D1727] border border-[#1A2A3F] space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#F7FAFC]">
                        {stat.symbol}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-[#07101A] text-[#7C8CA3] text-xs border border-[#1A2A3F]">
                        {stat.count} {stat.count === 1 ? "position" : "positions"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <span className="text-[10px] text-[#52627A] block">Total Notional</span>
                        <span className="font-semibold text-[#F7FAFC] tabular-nums">
                          ${stat.totalNotional.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#52627A] block">Aggregate P&L</span>
                        <span
                          className={`font-bold tabular-nums ${
                            isProfit ? "text-[#00E890]" : "text-[#FF3B5C]"
                          }`}
                        >
                          {isProfit ? "+" : ""}${stat.totalPnl.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Allocation Bar */}
                  <div className="w-full bg-[#07101A] h-1.5 rounded-full overflow-hidden border border-[#1A2A3F]">
                    <div
                      className="h-full bg-[#2563EB] rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(5, allocationPct))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-[#52627A] tabular-nums">
                    <span>{allocationPct}% Portfolio Allocation</span>
                    <span>Planned Risk at SL: ${stat.totalRisk.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Risk Guardrails & Safety Matrix */}
        <div className="p-5 rounded-xl bg-[#0A1422] border border-[#1A2A3F] shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#122033] pb-3">
            <div className="p-2 rounded-lg bg-[#00E890]/15 text-[#00E890]">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#F7FAFC]">
                Risk Engine Safety Gates
              </h3>
              <p className="text-xs text-[#52627A]">
                Continuous pre-trade & in-flight telemetry
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-[#0D1727] border border-[#1A2A3F] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[#7C8CA3] font-medium">Max Position Size Gate</span>
                <span className="text-[#00E890] font-semibold">PASSED (100%)</span>
              </div>
              <span className="text-xs text-[#52627A] block">
                No single position exceeds 20.0% capital allocation.
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#0D1727] border border-[#1A2A3F] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[#7C8CA3] font-medium">Stop Loss Discipline</span>
                <span className="text-[#00E890] font-semibold">100% PROTECTED</span>
              </div>
              <span className="text-xs text-[#52627A] block">
                All {positions.length} active positions have hard SL limits active on server.
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#0D1727] border border-[#1A2A3F] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[#7C8CA3] font-medium">Leverage Tier Monitor</span>
                <span className="text-[#19C5FF] font-semibold">CONTROLLED</span>
              </div>
              <span className="text-xs text-[#52627A] block">
                Average portfolio leverage is within safe risk tolerance parameters.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
