"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Info,
} from "lucide-react";
import { DayPnlRecord } from "@/types/pnl-journal";

interface PnlCalendarHeatmapProps {
  records: DayPnlRecord[];
  currencySymbol?: string;
  onSelectDate?: (dateStr: string) => void;
  selectedDate?: string;
}

export const PnlCalendarHeatmap: React.FC<PnlCalendarHeatmapProps> = ({
  records,
  currencySymbol = "₹",
  onSelectDate,
  selectedDate,
}) => {
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date());

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth(); // 0-indexed

  const monthName = currentMonthDate.toLocaleString("default", { month: "long" });

  const recordMap = useMemo(() => {
    const map = new Map<string, DayPnlRecord>();
    records.forEach((r) => map.set(r.date, r));
    return map;
  }, [records]);

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Day of week for 1st day (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const startDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days: {
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      record?: DayPnlRecord;
    }[] = [];

    // Preceding padding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonthLastDay - i);
      const dateStr = prevDate.toISOString().slice(0, 10);
      days.push({
        dayNumber: prevMonthLastDay - i,
        dateStr,
        isCurrentMonth: false,
        record: recordMap.get(dateStr),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(year, month, d);
      // Construct local YYYY-MM-DD
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        record: recordMap.get(dateStr),
      });
    }

    // Trailing padding days to fill 7 columns
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let nextDay = 1; nextDay <= remaining; nextDay++) {
        const nextDate = new Date(year, month + 1, nextDay);
        const dateStr = nextDate.toISOString().slice(0, 10);
        days.push({
          dayNumber: nextDay,
          dateStr,
          isCurrentMonth: false,
          record: recordMap.get(dateStr),
        });
      }
    }

    return days;
  }, [year, month, recordMap]);

  // Monthly summary
  const monthlySummary = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const monthRecords = records.filter((r) => r.date.startsWith(monthPrefix));
    const netPnl = monthRecords.reduce((acc, r) => acc + r.netPnl, 0);
    const trades = monthRecords.reduce((acc, r) => acc + r.tradeCount, 0);
    const wins = monthRecords.reduce((acc, r) => acc + r.winCount, 0);
    const winningDays = monthRecords.filter((r) => r.netPnl > 0).length;
    const losingDays = monthRecords.filter((r) => r.netPnl < 0).length;
    const winRate = trades > 0 ? (wins / trades) * 100 : 0;
    return { netPnl, trades, wins, winningDays, losingDays, winRate, activeDays: monthRecords.length };
  }, [records, year, month]);

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

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

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-md flex flex-col gap-3">
      {/* Header & Month Navigator */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              P&L Calendar Heatmap
            </h3>
            <p className="text-[11px] text-slate-400">
              Daily net P&L distribution, trading frequency, and consistency heatmap
            </p>
          </div>
        </div>

        {/* Month Navigation & Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs font-mono bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-400">Month Net:</span>
            <span
              className={`font-bold ${
                monthlySummary.netPnl >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {formatMoney(monthlySummary.netPnl)}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">{monthlySummary.winningDays}W / {monthlySummary.losingDays}L Days</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-slate-800 text-slate-300 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold font-mono text-slate-200 px-2">
              {monthName} {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-slate-800 text-slate-300 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Day of week headers */}
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-mono font-semibold text-slate-400 pb-1">
        <div>SUN</div>
        <div>MON</div>
        <div>TUE</div>
        <div>WED</div>
        <div>THU</div>
        <div>FRI</div>
        <div>SAT</div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {calendarDays.map((cell, idx) => {
          const rec = cell.record;
          const hasTrades = Boolean(rec && rec.tradeCount > 0);
          const isSelected = selectedDate === cell.dateStr;
          const isProfit = hasTrades && rec!.netPnl > 0;
          const isLoss = hasTrades && rec!.netPnl < 0;

          return (
            <div
              key={cell.dateStr + idx}
              onClick={() => {
                if (onSelectDate && cell.isCurrentMonth) {
                  onSelectDate(isSelected ? "" : cell.dateStr);
                }
              }}
              className={`min-h-[72px] rounded-lg p-2 border transition-all flex flex-col justify-between select-none cursor-pointer ${
                !cell.isCurrentMonth
                  ? "bg-slate-950/30 border-slate-900/60 opacity-30 cursor-default"
                  : isSelected
                  ? "ring-2 ring-cyan-400 bg-slate-900 border-cyan-500 shadow-md"
                  : isProfit
                  ? "bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-400/60 hover:bg-emerald-950/30"
                  : isLoss
                  ? "bg-rose-950/20 border-rose-500/30 hover:border-rose-400/60 hover:bg-rose-950/30"
                  : "bg-slate-950/70 border-slate-800/80 hover:border-slate-700"
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-mono font-bold ${
                    cell.isCurrentMonth ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  {cell.dayNumber}
                </span>
                {hasTrades && (
                  <span className="text-[9px] font-mono px-1 py-0.2 bg-slate-900 border border-slate-800 rounded text-slate-400">
                    {rec!.tradeCount}t
                  </span>
                )}
              </div>

              {/* P&L Display */}
              {hasTrades ? (
                <div className="my-auto">
                  <div
                    className={`text-xs font-bold font-mono tracking-tight text-center ${
                      isProfit
                        ? "text-emerald-400"
                        : isLoss
                        ? "text-rose-400"
                        : "text-slate-300"
                    }`}
                  >
                    {formatMoney(rec!.netPnl)}
                  </div>
                  <div className="text-[9px] font-mono text-center text-slate-500">
                    {rec!.winRate.toFixed(0)}% win
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-slate-700 text-center my-auto font-mono">
                  -
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
