"use client";

import React, { useState, useEffect } from "react";
import { ActiveStrategyInstance } from "@/types/options-workstation";
import {
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Shield,
  XCircle,
  Activity,
  Layers,
  Zap,
  RefreshCw
} from "lucide-react";

export interface ActiveStrategiesTabProps {
  currencySymbol?: string;
  onRefresh?: () => void;
}

export function ActiveStrategiesTab({ currencySymbol = "₹" }: ActiveStrategiesTabProps) {
  const [strategies, setStrategies] = useState<ActiveStrategyInstance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchActiveStrategies();
    const timer = setInterval(fetchActiveStrategies, 5000);
    return () => clearInterval(timer);
  }, []);

  const fetchActiveStrategies = async () => {
    try {
      const res = await fetch("/api/options/active-strategies");
      if (res.ok) {
        const data = await res.json();
        setStrategies(data.strategies || []);
      }
    } catch (err) {
      console.error("Fetch active strategies error:", err);
    }
  };

  const handleControlAction = async (instanceId: string, action: string) => {
    try {
      const res = await fetch(`/api/options/strategy/${instanceId}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        fetchActiveStrategies();
      }
    } catch (err) {
      console.error("Control action error:", err);
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-slate-200 uppercase text-xs">
            Deployed Active Strategies ({strategies.length})
          </h3>
        </div>

        <button
          onClick={fetchActiveStrategies}
          className="flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {strategies.length === 0 ? (
        <div className="w-full h-48 flex items-center justify-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-500 font-mono text-xs">
          No deployed strategies active. Use Strategy Builder or Pairs Trading to deploy.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {strategies.map((strat) => {
            const isPair = strat.strategy_type === "STATISTICAL_PAIR";
            const isPaused = strat.status === "PAUSED";
            const isClosed = strat.status === "CLOSED";

            return (
              <div
                key={strat.instance_id}
                className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      isPair
                        ? "bg-indigo-950 text-indigo-300 border border-indigo-500/30"
                        : "bg-cyan-950 text-cyan-300 border border-cyan-500/30"
                    }`}
                  >
                    {isPair ? "STATISTICAL PAIR" : "MULTI-LEG OPTION"}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                      strat.status === "ACTIVE"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                        : isPaused
                        ? "bg-amber-950 text-amber-400 border border-amber-500/30"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {strat.status}
                  </span>
                </div>

                <div>
                  <h4 className="text-white font-extrabold text-sm">{strat.name}</h4>
                  <div className="text-[11px] text-slate-400">
                    Underlying: <span className="text-slate-200">{strat.underlying}</span> | Mode:{" "}
                    <span className="text-cyan-400 font-bold">{strat.execution_mode}</span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Unrealized P&L</div>
                    <div
                      className={`font-black text-sm ${
                        strat.unrealized_pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {strat.unrealized_pnl >= 0 ? "+" : ""}
                      {currencySymbol}{strat.unrealized_pnl.toLocaleString()}
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">
                      {isPair ? "Hedge Ratio (β)" : "Lots"}
                    </div>
                    <div className="font-bold text-sm text-cyan-300">
                      {isPair ? strat.hedge_ratio : strat.lots}
                    </div>
                  </div>
                </div>

                {/* Quick Action Controls */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                  {strat.status === "ACTIVE" ? (
                    <button
                      onClick={() => handleControlAction(strat.instance_id, "PAUSE")}
                      className="flex-1 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 font-bold transition flex items-center justify-center gap-1 text-[11px]"
                    >
                      <Pause className="w-3 h-3" />
                      <span>Pause</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleControlAction(strat.instance_id, "RESUME")}
                      className="flex-1 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 font-bold transition flex items-center justify-center gap-1 text-[11px]"
                    >
                      <Play className="w-3 h-3" />
                      <span>Resume</span>
                    </button>
                  )}

                  {isPair && (
                    <button
                      onClick={() => handleControlAction(strat.instance_id, "REBALANCE_PAIR")}
                      className="py-1 px-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 transition"
                      title="Rebalance Pair"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => handleControlAction(strat.instance_id, "SQUARE_OFF")}
                    className="py-1 px-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 font-bold transition flex items-center gap-1 text-[11px]"
                    title="Square Off Position"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Square Off</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
