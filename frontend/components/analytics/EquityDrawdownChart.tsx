"use client";

import React from "react";
import { EquityPoint } from "@/types/analytics";
import { TrendingUp, ShieldAlert, Award, ArrowUpRight } from "lucide-react";
import { formatNumber, formatPrice, formatPercent, toNumeric } from "@/lib/formatters";

interface Props {
  data?: EquityPoint[];
}

export function EquityDrawdownChart({ data = [] }: Props) {
  const safeData = Array.isArray(data) ? data : [];

  if (safeData.length === 0) {
    return (
      <div className="p-5 rounded-xl bg-[#121824] border border-[#1E293B] flex flex-col items-center justify-center min-h-[250px] text-xs text-slate-400">
        No equity curve records available.
      </div>
    );
  }

  const initialEquity = Number(safeData[0]?.equity) || 10000;
  const currentEquity = Number(safeData[safeData.length - 1]?.equity) || 10000;
  const peakEquity = Math.max(...safeData.map((d) => Number(d.equity) || 10000));
  const maxDD = Math.min(...safeData.map((d) => Number(d.drawdown) || 0));
  const netReturn = ((currentEquity - initialEquity) / initialEquity) * 100;

  // Sample recent progression milestones
  const sampleStep = Math.max(1, Math.floor(safeData.length / 8));
  const milestones = safeData.filter((_, idx) => idx % sampleStep === 0 || idx === safeData.length - 1);

  return (
    <div className="p-5 rounded-xl bg-[#121824] border border-[#1E293B] shadow-xl flex flex-col justify-between">
      <div className="flex flex-wrap items-center justify-between mb-4 border-b border-[#1E293B] pb-3 gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Equity & Drawdown Progression Ledger</h3>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span>Current: <strong className="text-emerald-400">{formatPrice(currentEquity, "$", 0)}</strong></span>
          <span>Peak: <strong className="text-cyan-400">{formatPrice(peakEquity, "$", 0)}</strong></span>
          <span>Max DD: <strong className="text-red-400">{formatPercent(Math.abs(maxDD), 2)}</strong></span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-[#0B0F17] text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#1E293B]">
            <tr>
              <th className="py-2 px-3">Timeline Milestone</th>
              <th className="py-2 px-3 text-right">Portfolio Equity</th>
              <th className="py-2 px-3 text-right">Drawdown %</th>
              <th className="py-2 px-3 text-right">High-Water Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A2333]">
            {milestones.map((point, idx) => {
              const isPeak = (Number(point.equity) || 0) >= peakEquity * 0.999;
              const ddVal = Math.abs(Number(point.drawdown) || 0);

              return (
                <tr key={idx} className="hover:bg-[#162032] transition-colors">
                  <td className="py-2 px-3 text-slate-300 font-mono text-[11px]">
                    {point.time ? (point.time.includes("T") ? point.time.split("T")[0] : point.time) : `Milestone #${idx + 1}`}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                    {formatPrice(point.equity, "$", 2)}
                  </td>
                  <td className={`py-2 px-3 text-right font-mono font-bold ${ddVal > 0.01 ? "text-red-400" : "text-slate-400"}`}>
                    {ddVal > 0.01 ? `-${formatPercent(ddVal, 2)}` : "0.00%"}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {isPeak ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono font-bold">
                        ATH PEAK
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        NORMAL
                      </span>
                    )}
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
