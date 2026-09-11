"use client";

import React, { useState, useMemo } from "react";
import { Clock, Calendar, Timer, TrendingUp, TrendingDown } from "lucide-react";
import { TradeRecord } from "@/types/pnl-journal";

interface TemporalPerformanceMatrixProps {
  trades: TradeRecord[];
  currencySymbol?: string;
}

export const TemporalPerformanceMatrix: React.FC<TemporalPerformanceMatrixProps> = ({
  trades,
  currencySymbol = "₹",
}) => {
  const [activeTab, setActiveTab] = useState<"DOW" | "HOD" | "DURATION">("DOW");

  const formatMoney = (val: number) => {
    const isNeg = val < 0;
    const absVal = Math.abs(val);
    let str = "";
    if (absVal >= 100000) {
      str = `${(absVal / 100000).toFixed(1)}L`;
    } else if (absVal >= 1000) {
      str = `${(absVal / 1000).toFixed(1)}K`;
    } else {
      str = absVal.toFixed(0);
    }
    return `${isNeg ? "-" : "+"}${currencySymbol}${str}`;
  };

  // 1. Day of Week Analysis
  const dowStats = useMemo(() => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const map = new Map<number, { trades: number; wins: number; pnl: number; charges: number }>();
    for (let i = 0; i < 7; i++) {
      map.set(i, { trades: 0, wins: 0, pnl: 0, charges: 0 });
    }

    trades.forEach((t) => {
      const dt = new Date(t.entryTimestamp);
      const dow = dt.getDay();
      const existing = map.get(dow)!;
      existing.trades += 1;
      if (t.netPnl > 0) existing.wins += 1;
      existing.pnl += t.netPnl;
      existing.charges += t.totalCharges;
    });

    // Return Mon-Fri primarily
    return [1, 2, 3, 4, 5, 6, 0].map((d) => {
      const data = map.get(d)!;
      const winRate = data.trades > 0 ? (data.wins / data.trades) * 100 : 0;
      return {
        label: days[d],
        shortLabel: days[d].slice(0, 3).toUpperCase(),
        trades: data.trades,
        wins: data.wins,
        winRate,
        netPnl: data.pnl,
        charges: data.charges,
      };
    });
  }, [trades]);

  // 2. Hour of Day Analysis
  const hodStats = useMemo(() => {
    const hours = [9, 10, 11, 12, 13, 14, 15]; // Indian market hours
    const map = new Map<number, { trades: number; wins: number; pnl: number; charges: number }>();
    hours.forEach((h) => map.set(h, { trades: 0, wins: 0, pnl: 0, charges: 0 }));

    trades.forEach((t) => {
      const dt = new Date(t.entryTimestamp);
      const h = dt.getHours();
      const existing = map.get(h) || { trades: 0, wins: 0, pnl: 0, charges: 0 };
      existing.trades += 1;
      if (t.netPnl > 0) existing.wins += 1;
      existing.pnl += t.netPnl;
      existing.charges += t.totalCharges;
      map.set(h, existing);
    });

    return hours.map((h) => {
      const data = map.get(h)!;
      const winRate = data.trades > 0 ? (data.wins / data.trades) * 100 : 0;
      const label = `${String(h).padStart(2, "0")}:00 - ${String(h + 1).padStart(2, "0")}:00`;
      return {
        label,
        shortLabel: `${h}:00`,
        trades: data.trades,
        wins: data.wins,
        winRate,
        netPnl: data.pnl,
        charges: data.charges,
      };
    });
  }, [trades]);

  // 3. Duration Brackets Analysis
  const durationStats = useMemo(() => {
    const brackets = [
      { id: "SCALP", label: "Scalp (< 5m)", min: 0, max: 300 },
      { id: "SHORT", label: "Quick (5m - 15m)", min: 300, max: 900 },
      { id: "INTRADAY", label: "Intraday (15m - 60m)", min: 900, max: 3600 },
      { id: "EXTENDED", label: "Swing Session (1h - 4h)", min: 3600, max: 14400 },
      { id: "POSITIONAL", label: "Positional (> 4h)", min: 14400, max: Infinity },
    ];

    return brackets.map((b) => {
      const matched = trades.filter((t) => {
        const dur = t.holdingDurationSeconds || 300;
        return dur >= b.min && dur < b.max;
      });
      const tradesCount = matched.length;
      const wins = matched.filter((t) => t.netPnl > 0).length;
      const winRate = tradesCount > 0 ? (wins / tradesCount) * 100 : 0;
      const netPnl = matched.reduce((acc, t) => acc + t.netPnl, 0);
      const charges = matched.reduce((acc, t) => acc + t.totalCharges, 0);
      return {
        label: b.label,
        shortLabel: b.id,
        trades: tradesCount,
        wins,
        winRate,
        netPnl,
        charges,
      };
    });
  }, [trades]);

  const activeStats =
    activeTab === "DOW" ? dowStats : activeTab === "HOD" ? hodStats : durationStats;

  const maxPnlAbs = Math.max(...activeStats.map((s) => Math.abs(s.netPnl)), 1000);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-md flex flex-col gap-3">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Temporal & Duration Performance Matrix
            </h3>
            <p className="text-[11px] text-slate-400">
              Isolate profitable time windows, weekly edge, and optimal holding durations
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab("DOW")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
              activeTab === "DOW" ? "bg-indigo-600 text-white font-bold shadow" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Day of Week
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("HOD")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
              activeTab === "HOD" ? "bg-indigo-600 text-white font-bold shadow" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Hour of Day
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("DURATION")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
              activeTab === "DURATION" ? "bg-indigo-600 text-white font-bold shadow" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            Holding Duration
          </button>
        </div>
      </div>

      {/* Grid of Bar Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5 pt-1">
        {activeStats.map((item, idx) => {
          const isPos = item.netPnl >= 0;
          const barHeightPercent = Math.min(100, Math.max(10, (Math.abs(item.netPnl) / maxPnlAbs) * 100));

          return (
            <div
              key={item.label + idx}
              className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
            >
              <div>
                <div className="text-xs font-bold text-slate-200 truncate">{item.label}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {item.trades} trades • {item.winRate.toFixed(0)}% win
                </div>
              </div>

              {/* Visual PnL Bar */}
              <div className="h-16 my-3 flex items-end justify-center bg-slate-900/40 rounded-lg p-1 border border-slate-800/40">
                <div
                  className={`w-full rounded-md transition-all duration-500 ${
                    item.trades === 0
                      ? "bg-slate-800 h-1"
                      : isPos
                      ? "bg-gradient-to-t from-emerald-600 to-emerald-400"
                      : "bg-gradient-to-t from-rose-600 to-rose-400"
                  }`}
                  style={{ height: item.trades === 0 ? "4px" : `${barHeightPercent}%` }}
                />
              </div>

              {/* Bottom Value */}
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">Net:</span>
                <span
                  className={`text-xs font-bold font-mono ${
                    item.trades === 0 ? "text-slate-600" : isPos ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {formatMoney(item.netPnl)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
