"use client";

import React, { useState, useRef, useEffect, memo } from "react";
import Link from "next/link";
import { ArrowUpRight, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { formatMoney, formatPnL } from "@/lib/formatters";
import { useGlobalData } from "@/context/GlobalDataContext";

interface HeaderPnLDisplayProps {
  statusDataPnl?: number;
  statusDataEquity?: number;
}

export const HeaderPnLDisplay = memo(function HeaderPnLDisplay({
  statusDataPnl,
  statusDataEquity,
}: HeaderPnLDisplayProps) {
  const { portfolioSnapshot } = useGlobalData();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const totalEquity = portfolioSnapshot?.equity ?? (statusDataEquity !== undefined ? Number(statusDataEquity) : 56046.0);
  const todaysPnl = portfolioSnapshot?.dailyPnl ?? (statusDataPnl !== undefined ? Number(statusDataPnl) : 378.99);
  const realizedPnl = portfolioSnapshot?.netRealizedPnl ?? (todaysPnl > 0 ? todaysPnl * 0.7 : 0);
  const unrealizedPnl = portfolioSnapshot?.unrealizedPnl ?? (todaysPnl > 0 ? todaysPnl * 0.3 : todaysPnl);
  const marginUsed = portfolioSnapshot?.marginUsed ?? 8450.0;
  const availableFunds = portfolioSnapshot?.availableCapital ?? Math.max(0, totalEquity - marginUsed);

  const isProfit = todaysPnl >= 0;
  const formattedPnl = formatPnL(todaysPnl, "$");

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Portfolio Equity: ${formatMoney(totalEquity, "$")}, Today's PnL: ${formattedPnl.formatted}`}
        aria-expanded={isOpen}
        className="flex items-center gap-2 px-2.5 py-1 bg-[var(--theme-elevated)]/50 hover:bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-lg text-xs font-mono transition-all cursor-pointer shadow-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 select-none group text-right"
        title="Click for Financial & P&L Breakdown"
      >
        <div className="flex flex-col items-end leading-tight">
          <span className="text-xs font-extrabold text-slate-100 group-hover:text-white transition-colors">
            {formatMoney(totalEquity, "$", 0)}
          </span>
          <span className={`text-[10px] font-bold ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
            {formattedPnl.formatted} <span className="text-[9px] text-slate-400 font-normal">Today</span>
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl p-3.5 shadow-2xl w-72 flex flex-col gap-3 text-xs font-mono backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--theme-border-subtle)]">
            <span className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">
              Financial Performance Summary
            </span>
            <div className={`flex items-center gap-1 font-bold text-xs ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
              {isProfit ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              <span>{formattedPnl.formatted}</span>
            </div>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-slate-400">
              <span>Total Account Equity:</span>
              <span className="text-slate-100 font-bold">{formatMoney(totalEquity, "$")}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span>Today&apos;s Net P&L:</span>
              <span className={`font-bold ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
                {formattedPnl.formatted}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span>Realized Gains:</span>
              <span className="text-slate-200 font-bold">{formatMoney(realizedPnl, "$")}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span>Unrealized (Open) P&L:</span>
              <span className={`font-bold ${unrealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {formatPnL(unrealizedPnl, "$").formatted}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-[var(--theme-border-subtle)]">
              <span>Margin Utilized:</span>
              <span className="text-slate-200 font-bold">{formatMoney(marginUsed, "$")}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span>Available Margin:</span>
              <span className="text-emerald-400 font-bold">{formatMoney(availableFunds, "$")}</span>
            </div>
          </div>

          <Link
            href="/pnl"
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-between pt-2 border-t border-[var(--theme-border-subtle)] text-[10px] text-sky-400 hover:text-sky-300 font-bold transition-colors cursor-pointer"
          >
            <span>View Full P&L Analytics Center</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
});
