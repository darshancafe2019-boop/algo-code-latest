"use client";

import React from "react";
import { WinLossDonutData } from "@/types/analytics";
import { CheckCircle2, XCircle, MinusCircle, Award } from "lucide-react";

interface Props {
  data: WinLossDonutData;
}

export function WinLossDonut({ data }: Props) {
  const win = Number(data?.winning) || 0;
  const loss = Number(data?.losing) || 0;
  const be = Number(data?.breakeven) || 0;
  const total = win + loss + be;
  const winPct = total > 0 ? ((win / total) * 100).toFixed(1) : "0.0";
  const lossPct = total > 0 ? ((loss / total) * 100).toFixed(1) : "0.0";
  const bePct = total > 0 ? ((be / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="p-5 rounded-xl bg-[#121824] border border-[#1E293B] shadow-xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4 border-b border-[#1E293B] pb-3">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">Win / Loss Breakdown</h3>
        </div>
        <span className="text-[11px] font-mono text-emerald-400 font-bold">{winPct}% Win Rate</span>
      </div>

      <div className="space-y-4 py-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Total Completed Executions</span>
          <span className="text-white font-bold text-sm">{total} Trades</span>
        </div>

        {/* Multi-Segment Ratio Bar */}
        <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 transition-all duration-500"
            style={{ width: `${winPct}%` }}
            title={`Wins: ${data.winning} (${winPct}%)`}
          />
          <div
            className="bg-red-500 transition-all duration-500"
            style={{ width: `${lossPct}%` }}
            title={`Losses: ${data.losing} (${lossPct}%)`}
          />
          <div
            className="bg-slate-500 transition-all duration-500"
            style={{ width: `${bePct}%` }}
            title={`Breakeven: ${data.breakeven} (${bePct}%)`}
          />
        </div>

        {/* 3-Col Metric Tiles */}
        <div className="grid grid-cols-3 gap-2 pt-2 text-center">
          <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/40">
            <div className="text-[10px] text-emerald-300 uppercase font-bold flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>Wins</span>
            </div>
            <div className="text-sm font-bold font-mono text-emerald-400">{data.winning}</div>
            <div className="text-[10px] font-mono text-emerald-500/80">{winPct}%</div>
          </div>

          <div className="p-2.5 rounded-lg bg-red-950/20 border border-red-900/40">
            <div className="text-[10px] text-red-300 uppercase font-bold flex items-center justify-center gap-1">
              <XCircle className="h-3 w-3 text-red-400" />
              <span>Losses</span>
            </div>
            <div className="text-sm font-bold font-mono text-red-400">{data.losing}</div>
            <div className="text-[10px] font-mono text-red-500/80">{lossPct}%</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
            <div className="text-[10px] text-slate-300 uppercase font-bold flex items-center justify-center gap-1">
              <MinusCircle className="h-3 w-3 text-slate-400" />
              <span>BE</span>
            </div>
            <div className="text-sm font-bold font-mono text-slate-300">{data.breakeven}</div>
            <div className="text-[10px] font-mono text-slate-400">{bePct}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
