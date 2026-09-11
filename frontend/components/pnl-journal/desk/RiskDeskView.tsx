"use client";

import React from "react";
import { ShieldAlert, AlertTriangle, ShieldCheck, Activity, Target } from "lucide-react";
import { PnlSummary, PositionRecord } from "@/types/pnl-journal";

interface RiskDeskViewProps {
  summary: PnlSummary;
  positions?: PositionRecord[];
  currencySymbol?: string;
}

export const RiskDeskView: React.FC<RiskDeskViewProps> = ({
  summary,
  positions = [],
  currencySymbol = "₹",
}) => {
  const formatMoney = (val: number) => {
    return `${currencySymbol}${Math.abs(val).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  };

  // 95% 1-Day Value at Risk estimate based on average loss & expectancy
  const var95 = summary.averageLossAmount * 1.65;
  const var99 = summary.averageLossAmount * 2.33;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-md flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Portfolio Risk, Value-at-Risk (VaR) & Exposure Desk
            </h3>
            <p className="text-[11px] text-slate-400">
              Parametric stress testing, drawdown guardrails, and tail-risk monitoring
            </p>
          </div>
        </div>
      </div>

      {/* Risk Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono">
        {/* VaR 95% */}
        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">1-Day VaR (95% CI)</div>
          <div className="text-base font-bold text-rose-400 mt-1">
            -{formatMoney(var95)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Estimated 1-day max loss at 95% confidence
          </div>
        </div>

        {/* VaR 99% */}
        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">1-Day VaR (99% CI)</div>
          <div className="text-base font-bold text-rose-500 mt-1">
            -{formatMoney(var99)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Tail-risk extreme adverse move scenario
          </div>
        </div>

        {/* Max Historical Drawdown */}
        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Max Peak-To-Trough DD</div>
          <div className="text-base font-bold text-rose-400 mt-1">
            -{summary.maxDrawdownPercent.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Absolute: -{formatMoney(summary.maxDrawdownAmount)}
          </div>
        </div>

        {/* Recovery Factor */}
        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Recovery Factor</div>
          <div className="text-base font-bold text-emerald-400 mt-1">
            {summary.recoveryFactor.toFixed(2)}x
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Net Realized P&L / Max DD Amount
          </div>
        </div>
      </div>

      {/* Open Positions Risk Exposure */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          Active Live Position Risk Exposure ({positions.length} Open)
        </h4>

        {positions.length === 0 ? (
          <div className="text-xs font-mono text-slate-500 py-3 text-center">
            Zero active market risk exposure. All contracts flat.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2 px-2">Symbol</th>
                  <th className="py-2 px-2">Side</th>
                  <th className="py-2 px-2 text-right">Qty</th>
                  <th className="py-2 px-2 text-right">Avg Entry</th>
                  <th className="py-2 px-2 text-right">LTP</th>
                  <th className="py-2 px-2 text-right">Unrealized P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {positions.map((pos) => (
                  <tr key={pos.id} className="hover:bg-slate-900">
                    <td className="py-2 px-2 font-bold text-slate-200">{pos.symbol}</td>
                    <td className="py-2 px-2 font-semibold text-cyan-400">{pos.side}</td>
                    <td className="py-2 px-2 text-right text-slate-300">{pos.quantity}</td>
                    <td className="py-2 px-2 text-right text-slate-300">
                      {currencySymbol}{pos.averageEntryPrice.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-300">
                      {currencySymbol}{pos.currentPrice.toFixed(2)}
                    </td>
                    <td
                      className={`py-2 px-2 text-right font-bold ${
                        pos.unrealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {pos.unrealizedPnl >= 0 ? "+" : ""}{formatMoney(pos.unrealizedPnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
