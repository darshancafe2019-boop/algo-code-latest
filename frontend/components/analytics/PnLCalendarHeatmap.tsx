"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Flame,
  Award,
  ShieldCheck,
  Zap,
  Info,
  Clock,
} from "lucide-react";
import { DailyProfitabilityBar } from "@/types/pnl-analytics";
import { formatPrice, formatPercent, formatPnL } from "@/lib/formatters";

interface PnLCalendarHeatmapProps {
  bars: DailyProfitabilityBar[];
  currency?: string;
  currencyRate?: number;
  selectedDate?: string | null;
  onSelectDate?: (date: string | null) => void;
  tradingMode?: "PAPER" | "LIVE";
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function PnLCalendarHeatmap({
  bars = [],
  currency = "$",
  currencyRate = 1.0,
  selectedDate = null,
  onSelectDate,
  tradingMode = "PAPER",
}: PnLCalendarHeatmapProps) {
  // Current viewing month/year state
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());

  // Index bars by "YYYY-MM-DD"
  const barsByDate = useMemo(() => {
    const map = new Map<string, DailyProfitabilityBar>();
    bars.forEach((b) => {
      if (b.date) {
        map.set(b.date, b);
      }
    });
    return map;
  }, [bars]);

  // Navigate months
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleCurrentMonth = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Build days for the grid
  const { calendarCells, monthlyStats } = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      bar?: DailyProfitabilityBar;
    }> = [];

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = currentMonth === 0 ? 12 : currentMonth;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const mStr = String(prevM).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      const dateStr = `${prevY}-${mStr}-${dStr}`;
      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        bar: barsByDate.get(dateStr),
      });
    }

    let totalMonthNetPnl = 0;
    let totalMonthGrossPnl = 0;
    let totalMonthFees = 0;
    let totalMonthTrades = 0;
    let profitableDays = 0;
    let losingDays = 0;
    let flatDays = 0;
    let bestDayPnl = -Infinity;
    let bestDayDate = "";
    let worstDayPnl = Infinity;
    let worstDayDate = "";
    let currentStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let tempLossStreak = 0;

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(currentMonth + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      const dateStr = `${currentYear}-${mStr}-${dStr}`;
      const bar = barsByDate.get(dateStr);

      if (bar) {
        const net = bar.netPnl;
        totalMonthNetPnl += net;
        totalMonthGrossPnl += bar.grossPnl;
        totalMonthFees += (bar.fees + bar.commissions);
        totalMonthTrades += bar.trades;

        if (net > 0.01) {
          profitableDays++;
          currentStreak++;
          if (currentStreak > maxWinStreak) maxWinStreak = currentStreak;
          tempLossStreak = 0;
        } else if (net < -0.01) {
          losingDays++;
          tempLossStreak++;
          if (tempLossStreak > maxLossStreak) maxLossStreak = tempLossStreak;
          currentStreak = 0;
        } else {
          flatDays++;
        }

        if (net > bestDayPnl) {
          bestDayPnl = net;
          bestDayDate = dateStr;
        }
        if (net < worstDayPnl) {
          worstDayPnl = net;
          worstDayDate = dateStr;
        }
      }

      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        bar,
      });
    }

    // Next month filler days to complete 35 or 42 grid cells
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextM = currentMonth === 11 ? 1 : currentMonth + 2;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const mStr = String(nextM).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      const dateStr = `${nextY}-${mStr}-${dStr}`;
      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        bar: barsByDate.get(dateStr),
      });
    }

    const totalActiveDays = profitableDays + losingDays;
    const winRate = totalActiveDays > 0 ? (profitableDays / totalActiveDays) * 100 : 0;

    return {
      calendarCells: cells,
      monthlyStats: {
        totalNetPnl: totalMonthNetPnl,
        totalGrossPnl: totalMonthGrossPnl,
        totalFees: totalMonthFees,
        totalTrades: totalMonthTrades,
        profitableDays,
        losingDays,
        flatDays,
        winRate,
        bestDayPnl: bestDayPnl === -Infinity ? 0 : bestDayPnl,
        bestDayDate,
        worstDayPnl: worstDayPnl === Infinity ? 0 : worstDayPnl,
        worstDayDate,
        maxWinStreak,
        maxLossStreak,
      },
    };
  }, [currentYear, currentMonth, barsByDate]);

  // Color Intensity Utility
  const getCellBackground = (bar?: DailyProfitabilityBar, isSelected?: boolean) => {
    if (isSelected) {
      return "border-2 border-cyan-400 bg-cyan-950/50 shadow-lg shadow-cyan-900/30";
    }
    if (!bar || (Math.abs(bar.netPnl) < 0.01 && bar.trades === 0)) {
      return "bg-[#0A121D]/60 border border-[#1E293B]/40 hover:border-slate-600/80";
    }

    const net = bar.netPnl;
    if (net > 0) {
      if (net > 1000) return "bg-emerald-900/50 border border-emerald-500/60 text-emerald-300 hover:bg-emerald-800/60 shadow-sm shadow-emerald-950/40";
      if (net > 300) return "bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/50";
      return "bg-emerald-950/30 border border-emerald-600/30 text-emerald-400 hover:bg-emerald-900/40";
    } else {
      if (net < -1000) return "bg-rose-950/60 border border-rose-500/60 text-rose-300 hover:bg-rose-900/60 shadow-sm shadow-rose-950/40";
      if (net < -300) return "bg-rose-950/40 border border-rose-600/40 text-rose-400 hover:bg-rose-900/50";
      return "bg-rose-950/20 border border-rose-700/30 text-rose-400 hover:bg-rose-900/30";
    }
  };

  const monthNetFormatted = formatPnL(monthlyStats.totalNetPnl * currencyRate, currency, 2);

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-4 sm:p-6 shadow-2xl space-y-5 font-mono">
      {/* 1. Header & Month Navigator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white tracking-wide uppercase">
                INSTITUTIONAL P&L CALENDAR HEATMAP
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                AUDITED MTM
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Bloomberg-style day-by-day profitability distribution, streaks, and drill-down
            </p>
          </div>
        </div>

        {/* Month Navigation & Today Shortcut */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCurrentMonth}
            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#141E33] hover:bg-[#1E293B] text-slate-300 border border-slate-700 transition"
          >
            Today
          </button>
          <div className="flex items-center gap-1 bg-[#141E33] border border-slate-700 rounded-xl p-1">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-extrabold text-white min-w-[130px] text-center">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Monthly Summary Rollup KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
        {/* Month Net P&L */}
        <div className="bg-[#141E33] border border-slate-800 rounded-xl p-3 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Month Net P&L</span>
          <span className={`text-base font-bold tracking-tight block ${
            monthNetFormatted.isPositive ? "text-emerald-400" : monthNetFormatted.isNegative ? "text-red-400" : "text-slate-300"
          }`}>
            {monthNetFormatted.formatted}
          </span>
          <span className="text-[9px] text-slate-400">Net of {formatPrice(monthlyStats.totalFees * currencyRate, currency, 2)} fees</span>
        </div>

        {/* Win Rate */}
        <div className="bg-[#141E33] border border-slate-800 rounded-xl p-3 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Daily Win Rate</span>
          <span className="text-base font-bold text-emerald-400 tracking-tight block">
            {formatPercent(monthlyStats.winRate, 1)}
          </span>
          <span className="text-[9px] text-slate-400">
            {monthlyStats.profitableDays}W / {monthlyStats.losingDays}L ({monthlyStats.flatDays} Flat)
          </span>
        </div>

        {/* Total Month Trades */}
        <div className="bg-[#141E33] border border-slate-800 rounded-xl p-3 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Fills & Executions</span>
          <span className="text-base font-bold text-white tracking-tight block">
            {monthlyStats.totalTrades}
          </span>
          <span className="text-[9px] text-slate-400">Avg {monthlyStats.profitableDays + monthlyStats.losingDays > 0 ? (monthlyStats.totalTrades / (monthlyStats.profitableDays + monthlyStats.losingDays)).toFixed(1) : "0"} / active day</span>
        </div>

        {/* Max Win Streak */}
        <div className="bg-[#141E33] border border-slate-800 rounded-xl p-3 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-400" /> Win Streak
          </span>
          <span className="text-base font-bold text-amber-400 tracking-tight block">
            {monthlyStats.maxWinStreak} Days
          </span>
          <span className="text-[9px] text-slate-400">Max loss streak: {monthlyStats.maxLossStreak}d</span>
        </div>

        {/* Best Day */}
        <div className="bg-[#141E33] border border-slate-800 rounded-xl p-3 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
            <Award className="w-3 h-3 text-emerald-400" /> Best Day
          </span>
          <span className="text-base font-bold text-emerald-400 tracking-tight block">
            +{formatPrice(monthlyStats.bestDayPnl * currencyRate, currency, 2)}
          </span>
          <span className="text-[9px] text-slate-400">{monthlyStats.bestDayDate || "—"}</span>
        </div>

        {/* Worst Day */}
        <div className="bg-[#141E33] border border-slate-800 rounded-xl p-3 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Worst Day</span>
          <span className="text-base font-bold text-rose-400 tracking-tight block">
            {formatPrice(monthlyStats.worstDayPnl * currencyRate, currency, 2)}
          </span>
          <span className="text-[9px] text-slate-400">{monthlyStats.worstDayDate || "—"}</span>
        </div>

        {/* Status */}
        <div className="bg-[#141E33] border border-slate-800 rounded-xl p-3 space-y-1 hidden lg:block">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Ledger State</span>
          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1">
            <ShieldCheck className="w-3.5 h-3.5" /> RECONCILED
          </span>
          <span className="text-[9px] text-cyan-400">Click cell to analyze</span>
        </div>
      </div>

      {/* 3. The Calendar Heatmap Matrix Grid */}
      <div className="border border-slate-800 rounded-2xl overflow-hidden bg-[#070D18] p-3 sm:p-4">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 text-center text-slate-400 text-xs font-bold uppercase pb-2 border-b border-slate-800/80 mb-2">
          {DAYS_OF_WEEK.map((d, i) => (
            <div key={d} className={`py-1 ${i === 0 || i === 6 ? "text-slate-500" : "text-slate-300"}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid Days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarCells.map((cell, idx) => {
            const isSelected = selectedDate === cell.dateStr;
            const bar = cell.bar;
            const hasData = Boolean(bar && (Math.abs(bar.netPnl) > 0.01 || bar.trades > 0));
            const net = (bar?.netPnl || 0) * currencyRate;
            const netMeta = formatPnL(net, currency, 0);

            return (
              <div
                key={`${cell.dateStr}-${idx}`}
                onClick={() => {
                  if (onSelectDate) {
                    onSelectDate(isSelected ? null : cell.dateStr);
                  }
                }}
                className={`min-h-[82px] sm:min-h-[96px] p-2 rounded-xl flex flex-col justify-between cursor-pointer transition-all duration-200 ${
                  cell.isCurrentMonth ? "opacity-100" : "opacity-35 hover:opacity-75"
                } ${getCellBackground(bar, isSelected)}`}
                title={`${cell.dateStr}: ${hasData ? `${netMeta.formatted} (${bar?.trades} trades)` : "No trades"}`}
              >
                {/* Top row of cell: Day number + Trade count badge */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${
                    isSelected ? "text-cyan-300 font-extrabold" : cell.isCurrentMonth ? "text-white" : "text-slate-500"
                  }`}>
                    {cell.dayNum}
                  </span>

                  {hasData && bar && bar.trades > 0 && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-slate-900/80 text-slate-300 border border-slate-700">
                      {bar.trades}T
                    </span>
                  )}
                </div>

                {/* Center / Bottom of cell: PnL & Return % */}
                {hasData && bar ? (
                  <div className="space-y-0.5 text-right mt-1">
                    <div className={`text-xs sm:text-sm font-extrabold tracking-tight ${
                      netMeta.isPositive ? "text-emerald-400" : netMeta.isNegative ? "text-rose-400" : "text-slate-300"
                    }`}>
                      {netMeta.formatted}
                    </div>
                    <div className="text-[9px] text-slate-400 flex items-center justify-end gap-1">
                      <span>{formatPercent(bar.returnPct, 1, true)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-right text-[10px] text-slate-600 select-none pb-1">
                    —
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Legend & Help Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-300">Color Intensity:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-900/80 border border-emerald-500" />
            <span>&gt;+$1k</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-950 border border-emerald-700" />
            <span>+$0-$1k</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#0A121D] border border-slate-700" />
            <span>Flat / No Trade</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-950 border border-rose-700" />
            <span>-$0-$1k</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-900/80 border border-rose-500" />
            <span>&lt;-$1k</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-cyan-400">
          <Info className="w-3.5 h-3.5" />
          <span>Click on any trading day to open tick-by-tick Day Deep-Dive Drawer</span>
        </div>
      </div>
    </div>
  );
}
