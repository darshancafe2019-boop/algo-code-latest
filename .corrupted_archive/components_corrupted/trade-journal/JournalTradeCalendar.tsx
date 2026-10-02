"use client";

import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Layers,
} from "lucide-react";
import { JournalCalendarDay } from "@/types/trade-journal";
import { formatPnL } from "@/lib/formatters";

interface JournalTradeCalendarProps {
  days: JournalCalendarDay[];
  onSelectDate: (dateStr: string) => void;
  currency?: string;
}

export function JournalTradeCalendar({
  days,
  onSelectDate,
  currency = "$",
}: JournalTradeCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 1)); // August 2026

  const daysMap = React.useMemo(() => {
    const map = new Map<string, JournalCalendarDay>();
    for (const d of days) {
      map.set(d.date, d);
    }
    return map;
  }, [days]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Calculate monthly stats
  let monthlyPnl = 0;
  let monthlyTrades = 0;
  let winningDays = 0;
  let losingDays = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayData = daysMap.get(dateStr);
    if (dayData) {
      monthlyPnl += dayData.pnl;
      monthlyTrades += dayData.trades_count;
      if (dayData.pnl > 0) winningDays++;
      else if (dayData.pnl < 0) losingDays++;
    }
  }

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl space-y-4 font-sans select-none">
      {/* Top Strip: Month Navigation & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--theme-border-subtle)] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--theme-accent)]/15 text-[var(--theme-accent)]">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--theme-text-primary)]">
              {monthNames[month]} {year} Trading Calendar
            </h3>
            <span className="text-[11px] font-mono text-[var(--theme-text-muted)]">
              Click any active date to filter the Trade Explorer
            </span>
          </div>
        </div>

        {/* Month Stats & Navigator */}
        <div className="flex items-center gap-4">
          <div className="text-right font-mono text-xs hidden sm:block">
            <span className="text-[10px] text-[var(--theme-text-muted)] block uppercase">Monthly Result</span>
            <span className={`font-bold ${monthlyPnl >= 0 ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}`}>
              {formatPnL(monthlyPnl, currency, 2).formatted} ({monthlyTrades} trades)
            </span>
          </div>

          <div className="flex items-center gap-1 bg-[var(--theme-elevated)] p-1 rounded-xl border border-[var(--theme-border-subtle)]">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:text-[var(--theme-accent)] text-[var(--theme-text-secondary)] transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-mono text-xs font-bold text-[var(--theme-text-primary)]">
              {monthNames[month].slice(0, 3)} {year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:text-[var(--theme-accent)] text-[var(--theme-text-secondary)] transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-mono">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
          <div key={dayName} className="py-1 text-[10px] font-bold uppercase text-[var(--theme-text-muted)]">
            {dayName}
          </div>
        ))}

        {/* Empty leading cells */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-20 sm:h-24 rounded-xl bg-[var(--theme-elevated)]/20 opacity-30" />
        ))}

        {/* Day Cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const dayData = daysMap.get(dateStr);
          const hasTrades = Boolean(dayData && dayData.trades_count > 0);
          const isProfit = dayData ? dayData.pnl >= 0 : false;

          return (
            <div
              key={dateStr}
              onClick={() => hasTrades && onSelectDate(dateStr)}
              className={`h-20 sm:h-24 p-2 rounded-xl border transition-all text-left flex flex-col justify-between ${
                hasTrades
                  ? isProfit
                    ? "bg-[var(--theme-profit)]/10 border-[var(--theme-profit)]/30 hover:border-[var(--theme-profit)] cursor-pointer shadow-sm"
                    : "bg-[var(--theme-loss)]/10 border-[var(--theme-loss)]/30 hover:border-[var(--theme-loss)] cursor-pointer shadow-sm"
                  : "bg-[var(--theme-surface)] border-[var(--theme-border-subtle)]/50 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-[var(--theme-text-secondary)]">
                <span>{d}</span>
                {hasTrades && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/40 text-[var(--theme-text-muted)]">
                    {dayData?.trades_count}T
                  </span>
                )}
              </div>

              {hasTrades && dayData && (
                <div className="space-y-0.5 font-mono">
                  <div className={`text-[11px] sm:text-xs font-bold ${isProfit ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}`}>
                    {formatPnL(dayData.pnl, currency, 0).formatted}
                  </div>
                  <div className="text-[9px] text-[var(--theme-text-muted)] truncate">
                    {dayData.win_rate.toFixed(0)}% Win
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
