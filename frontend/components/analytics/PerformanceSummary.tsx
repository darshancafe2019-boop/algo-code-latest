"use client";

import React, { useEffect, useState, useRef } from "react";
import { TradeSummary } from "@/types/analytics";
import { DollarSign, TrendingUp, Percent, Hash, ShieldAlert, Award, Activity } from "lucide-react";
import { formatNumber, formatPrice, formatPercent, formatPnL, toNumeric } from "@/lib/formatters";

export function PerformanceSummary({ summary }: { summary?: Partial<TradeSummary> }) {
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const prevRef = useRef<Partial<TradeSummary> | undefined>(summary);

  useEffect(() => {
    if (prevRef.current?.total_pnl !== summary?.total_pnl) {
      setFlashKey("pnl");
      setTimeout(() => setFlashKey(null), 1000);
    } else if (prevRef.current?.win_rate_pct !== summary?.win_rate_pct) {
      setFlashKey("winrate");
      setTimeout(() => setFlashKey(null), 1000);
    }
    prevRef.current = summary;
  }, [summary]);

  const totalPnl = toNumeric(summary?.total_pnl) ?? 0.0;
  const closedPnl = toNumeric(summary?.closed_pnl) ?? totalPnl;
  const unrealizedPnl = toNumeric(summary?.unrealized_pnl) ?? 0.0;
  const winRate = toNumeric(summary?.win_rate_pct) ?? 0.0;
  const profitFactor = toNumeric(summary?.profit_factor) ?? 1.5;
  const avgWin = toNumeric(summary?.avg_win) ?? 0.0;
  const avgLoss = toNumeric(summary?.avg_loss) ?? 0.0;
  const maxDd = toNumeric(summary?.max_drawdown_pct) ?? 0.0;
  const currentBal = toNumeric(summary?.current_balance) ?? 10000.0;

  const pnlMeta = formatPnL(totalPnl, "$", 2);

  const cards = [
    {
      label: "Total Realized P&L",
      value: pnlMeta.formatted,
      sub: `Closed: ${formatPrice(closedPnl, "$", 2)} | Unr: ${formatPrice(unrealizedPnl, "$", 2)}`,
      icon: TrendingUp,
      color: pnlMeta.isPositive ? "text-emerald-400" : pnlMeta.isNegative ? "text-red-400" : "text-slate-300",
      flash: flashKey === "pnl",
    },
    {
      label: "Win Rate",
      value: formatPercent(winRate, 1),
      sub: `${formatNumber(summary?.winning_count, 0, "0")} W / ${formatNumber(summary?.losing_count, 0, "0")} L`,
      icon: Percent,
      color: "text-cyan-400",
      flash: flashKey === "winrate",
    },
    {
      label: "Total Trades",
      value: formatNumber(summary?.total_trades, 0, "0"),
      sub: `${formatNumber(summary?.open_trades, 0, "0")} Open | ${formatNumber(summary?.total_trades, 0, "0")} Closed`,
      icon: Hash,
      color: "text-purple-400",
      flash: false,
    },
    {
      label: "Profit Factor",
      value: formatNumber(profitFactor, 2),
      sub: `Avg Win: ${formatPrice(avgWin, "$", 2)} | Avg Loss: -${formatPrice(Math.abs(avgLoss), "$", 2)}`,
      icon: Award,
      color: profitFactor >= 1.5 ? "text-emerald-400" : "text-amber-400",
      flash: false,
    },
    {
      label: "Max Drawdown",
      value: `-${formatPercent(maxDd, 2)}`,
      sub: `Current Bal: ${formatPrice(currentBal, "$", 0)}`,
      icon: ShieldAlert,
      color: maxDd < 10 ? "text-emerald-400" : "text-red-400",
      flash: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            className={`p-4 rounded-xl bg-[#121824] border border-[#1E293B] flex flex-col justify-between shadow-lg transition-all duration-300 ${
              c.flash ? "border-cyan-400 bg-cyan-950/20 scale-[1.02]" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">{c.label}</span>
              <div className="p-2 rounded-lg bg-slate-800/60">
                <Icon className={`h-4 w-4 ${c.color}`} />
              </div>
            </div>
            <div>
              <div className={`text-xl font-bold font-mono ${c.color}`}>{c.value}</div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">{c.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
