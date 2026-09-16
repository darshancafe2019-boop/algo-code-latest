"use client";

import { formatMoney } from "@/lib/formatters";
import React from "react";
import { Shield, CheckCircle2, AlertTriangle, AlertOctagon, TrendingUp, DollarSign, PieChart } from "lucide-react";

interface RiskStatusPanelProps {
  capital: number;
  availableMargin: number;
  dailyLossLimit: number;
  dailyPnl: number;
  openPositionsCount: number;
  killSwitchActive: boolean;
}

export const RiskStatusPanel: React.FC<RiskStatusPanelProps> = ({
  capital = 1000000,
  availableMargin = 850000,
  dailyLossLimit = 25000,
  dailyPnl = 0,
  openPositionsCount = 0,
  killSwitchActive = false,
}) => {
  const isLossBreached = Math.abs(Math.min(0, dailyPnl)) > dailyLossLimit;
  const marginPct = ((capital - availableMargin) / (capital || 1)) * 100;

  return (
    <div className="bg-[#0B0E17]/95 border border-[#1A2A3F] rounded-xl p-4 shadow-lg mb-6">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-cyan-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Universal Risk Engine — Telemetry & Gates
          </h2>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-400">Risk Gate:</span>
          <span
            className={`font-bold px-2 py-0.5 rounded border text-[11px] ${
              killSwitchActive || isLossBreached
                ? "bg-rose-950/80 border-rose-800 text-rose-400"
                : "bg-emerald-950/80 border-emerald-800 text-emerald-400"
            }`}
          >
            {killSwitchActive ? "HALTED" : isLossBreached ? "BLOCKED" : "APPROVED (20 GATES)"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Capital */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-3">
          <span className="text-[10px] font-mono text-slate-400 block mb-1">TOTAL CAPITAL</span>
          <span className="text-sm font-bold font-mono text-white">
            {formatMoney(capital, "₹")}
          </span>
        </div>

        {/* Available Margin */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-3">
          <span className="text-[10px] font-mono text-slate-400 block mb-1">AVAILABLE MARGIN</span>
          <span className="text-sm font-bold font-mono text-emerald-400">
            {formatMoney(availableMargin, "₹")}
          </span>
        </div>

        {/* Daily PnL */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-3">
          <span className="text-[10px] font-mono text-slate-400 block mb-1">DAILY P&L</span>
          <span
            className={`text-sm font-bold font-mono ${
              dailyPnl >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {dailyPnl !== null && dailyPnl !== undefined ? (dailyPnl >= 0 ? `+${formatMoney(dailyPnl, "₹")}` : formatMoney(dailyPnl, "₹")) : "—"}
          </span>
        </div>

        {/* Daily Loss Limit */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-3">
          <span className="text-[10px] font-mono text-slate-400 block mb-1">DAILY LOSS LIMIT</span>
          <span className="text-sm font-bold font-mono text-slate-300">
            {formatMoney(dailyLossLimit, "₹")}
          </span>
        </div>
      </div>

      {/* Margin Utilization Bar */}
      <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span>Margin Utilization:</span>
          <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                marginPct > 80 ? "bg-rose-500" : marginPct > 50 ? "bg-amber-500" : "bg-cyan-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(5, marginPct))}%` }}
            />
          </div>
          <span className="text-slate-200 font-bold">{marginPct.toFixed(1)}%</span>
        </div>

        <div>
          <span>Open Positions: </span>
          <strong className="text-cyan-400">{openPositionsCount}</strong>
        </div>
      </div>
    </div>
  );
};
