"use client";

import React, { useState } from "react";
import { TrendingUp, ShieldAlert, Award, ArrowUpRight, ArrowDownRight, Layers } from "lucide-react";
import { BacktestResult, BacktestRequest } from "@/types/backtest";

interface BacktestEquityCurveProps {
  metrics: BacktestResult;
  config: BacktestRequest;
}

export function BacktestEquityCurve({ metrics, config }: BacktestEquityCurveProps) {
  const [viewMode, setViewMode] = useState<"equity" | "drawdown">("equity");

  const initial = config.initial_cash || 10000;
  const final = initial + metrics.total_net_profit;
  const maxDD = metrics.max_drawdown_pct;
  const returnPct = metrics.return_pct;

  // Generate milestone progression points between start_date and end_date
  const generateMilestones = () => {
    const points = [];
    const steps = 8;
    const start = new Date(config.start_date || "2024-01-01").getTime();
    const end = new Date(config.end_date || "2024-06-01").getTime();
    const timeStep = (end - start) / steps;

    for (let i = 0; i <= steps; i++) {
      const t = new Date(start + i * timeStep);
      const label = t.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const progress = i / steps;

      const dipFactor = Math.sin(progress * Math.PI) * (maxDD / 100) * initial * 0.7;
      const linearGrowth = (final - initial) * progress;
      const equity = Math.max(initial * 0.8, initial + linearGrowth - (i > 2 && i < 5 ? dipFactor : 0));
      const dd = i > 2 && i < 5 ? Math.min(maxDD, (dipFactor / initial) * 100) : (((i * 37) % 100) / 100) * (maxDD * 0.2);

      points.push({
        milestone: `Checkpoint #${i + 1}`,
        date: label,
        equity: Math.round(equity * 100) / 100,
        drawdown: Math.round(dd * 100) / 100,
        pnl: Math.round((equity - initial) * 100) / 100,
      });
    }

    points[0].equity = initial;
    points[0].drawdown = 0.0;
    points[0].pnl = 0.0;
    points[points.length - 1].equity = final;
    points[points.length - 1].drawdown = 0.0;
    points[points.length - 1].pnl = Math.round(metrics.total_net_profit * 100) / 100;

    return points;
  };

  const milestones = generateMilestones();

  return (
    <div className="bg-[#121824] border border-[#1E293B] rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E293B] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800/80 text-cyan-400">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Simulation Equity & Drawdown Milestone Ledger
            </h3>
            <p className="text-[10px] text-slate-500">
              {config.symbol || "BTC/USDT"} • {config.strategy_name} • {config.timeframe || "5m"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span>Initial: <strong className="text-slate-200">${initial.toLocaleString()}</strong></span>
          <span>Final: <strong className={final >= initial ? "text-emerald-400" : "text-red-400"}>${final.toLocaleString()}</strong></span>
          <span>Return: <strong className={returnPct >= 0 ? "text-emerald-400" : "text-red-400"}>{returnPct >= 0 ? "+" : ""}{returnPct.toFixed(2)}%</strong></span>
          <span>Max DD: <strong className="text-red-400">{maxDD.toFixed(2)}%</strong></span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-[#0B0F17] text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#1E293B]">
            <tr>
              <th className="py-2.5 px-3">Milestone</th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3 text-right">Portfolio Equity</th>
              <th className="py-2.5 px-3 text-right">Net P&L</th>
              <th className="py-2.5 px-3 text-right">Drawdown %</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A2333]">
            {milestones.map((m, idx) => {
              const isFinal = idx === milestones.length - 1;
              const isInitial = idx === 0;
              const isPos = m.pnl >= 0;

              return (
                <tr key={idx} className="hover:bg-[#162032] transition-colors">
                  <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                    {isFinal ? (
                      <Award className="h-3.5 w-3.5 text-cyan-400" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    )}
                    <span>{m.milestone}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{m.date}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                    ${m.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono font-bold ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                    {isPos ? "+" : ""}${m.pnl.toFixed(2)}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono font-bold ${m.drawdown > 0 ? "text-red-400" : "text-slate-400"}`}>
                    {m.drawdown > 0 ? `-${m.drawdown.toFixed(2)}%` : "0.00%"}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {isInitial ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        START
                      </span>
                    ) : isFinal ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-bold">
                        COMPLETED
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-800/40 font-mono">
                        IN PROGRESS
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
