"use client";

import React, { useState, useRef, useEffect, memo } from "react";
import Link from "next/link";
import { ShieldCheck, ShieldAlert, Shield, ArrowUpRight } from "lucide-react";
import { useGlobalData } from "@/context/GlobalDataContext";
import { formatMoney } from "@/lib/formatters";

interface HeaderRiskStatusProps {
  isKillSwitchActive?: boolean;
}

export const HeaderRiskStatus = memo(function HeaderRiskStatus({
  isKillSwitchActive = false,
}: HeaderRiskStatusProps) {
  const { riskSummary, portfolioSnapshot } = useGlobalData();
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

  const equity = portfolioSnapshot?.equity || 10000;
  const marginUsed = portfolioSnapshot?.marginUsed || 0;
  const availableMargin = portfolioSnapshot?.availableCapital ?? Math.max(0, equity - marginUsed);
  const dailyLoss = Math.abs(Math.min(0, portfolioSnapshot?.dailyPnl || 0));
  const maxDailyLoss = equity * 0.05; // 5% max daily risk
  const openRisk = marginUsed * 0.1; // 10% estimated stop-loss exposure
  const maxPositions = 10;
  const currentPositions = portfolioSnapshot?.openPositions || 0;

  const isSafe = !isKillSwitchActive && dailyLoss < maxDailyLoss;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Risk Engine Status: ${isKillSwitchActive ? "Halted" : isSafe ? "Safe" : "Warning"}`}
        aria-expanded={isOpen}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer shadow-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 select-none border ${
          isKillSwitchActive
            ? "bg-rose-500/15 border-rose-500/40 text-rose-400 hover:bg-rose-500/25"
            : isSafe
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
            : "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
        }`}
        title="Institutional Risk Gate Telemetry"
      >
        {isKillSwitchActive ? (
          <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
        ) : (
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
        )}
        <span className="font-bold text-[11px] tracking-wide">
          {isKillSwitchActive ? "RISK ✕" : isSafe ? "RISK ✓" : "RISK ⚠"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl p-3 shadow-2xl w-64 flex flex-col gap-2.5 text-xs font-mono backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-1.5 border-b border-[var(--theme-border-subtle)]">
            <span className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">
              Pre-Trade Risk Gates
            </span>
            <span className={`text-[10px] font-bold ${isKillSwitchActive ? "text-rose-400" : isSafe ? "text-emerald-400" : "text-amber-400"}`}>
              {isKillSwitchActive ? "HALTED" : isSafe ? "SAFE" : "WARNING"}
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-slate-400">
              <span>Daily Loss:</span>
              <span className="text-slate-200 font-bold">
                {formatMoney(dailyLoss, "₹")} / {formatMoney(maxDailyLoss, "₹")}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span>Open Risk (VaR):</span>
              <span className="text-slate-200 font-bold">{formatMoney(openRisk, "₹")}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span>Available Margin:</span>
              <span className="text-emerald-400 font-bold">{formatMoney(availableMargin, "₹")}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span>Positions:</span>
              <span className="text-slate-200 font-bold">
                {currentPositions} / {maxPositions} max
              </span>
            </div>
          </div>

          <Link
            href="/risk"
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-between pt-1.5 border-t border-[var(--theme-border-subtle)] text-[10px] text-sky-400 hover:text-sky-300 font-bold transition-colors cursor-pointer"
          >
            <span>Open Full Risk Center</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
});
