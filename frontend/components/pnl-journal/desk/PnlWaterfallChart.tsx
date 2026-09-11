"use client";

import React, { useMemo } from "react";
import { DollarSign, ArrowRight, ShieldCheck, Scale } from "lucide-react";
import { PnlSummary } from "@/types/pnl-journal";

interface PnlWaterfallChartProps {
  summary: PnlSummary;
  currencySymbol?: string;
}

export const PnlWaterfallChart: React.FC<PnlWaterfallChartProps> = ({
  summary,
  currencySymbol = "₹",
}) => {
  const steps = useMemo(() => {
    return [
      {
        id: "gross_profit",
        label: "Gross Profit",
        amount: summary.totalProfitAmount,
        type: "INFLOW",
        color: "bg-emerald-500",
        textColor: "text-emerald-400",
      },
      {
        id: "gross_loss",
        label: "Gross Loss",
        amount: -summary.totalLossAmount,
        type: "OUTFLOW",
        color: "bg-rose-500",
        textColor: "text-rose-400",
      },
      {
        id: "gross_pnl",
        label: "Gross P&L",
        amount: summary.grossPnl,
        type: "SUBTOTAL",
        color: summary.grossPnl >= 0 ? "bg-emerald-600" : "bg-rose-600",
        textColor: summary.grossPnl >= 0 ? "text-emerald-400" : "text-rose-400",
      },
      {
        id: "brokerage",
        label: "Brokerage",
        amount: -summary.totalBrokerage,
        type: "FEE",
        color: "bg-amber-500",
        textColor: "text-amber-400",
      },
      {
        id: "stt",
        label: "STT / CTT",
        amount: -summary.totalStt,
        type: "FEE",
        color: "bg-amber-600",
        textColor: "text-amber-400",
      },
      {
        id: "exchange_sebi",
        label: "Exch / SEBI / IPFT",
        amount: -(summary.totalExchangeCharges + summary.totalSebiCharges),
        type: "FEE",
        color: "bg-amber-700",
        textColor: "text-amber-400",
      },
      {
        id: "gst",
        label: "GST (18%)",
        amount: -summary.totalGst,
        type: "FEE",
        color: "bg-orange-600",
        textColor: "text-orange-400",
      },
      {
        id: "stamp_duty",
        label: "Stamp Duty",
        amount: -summary.totalStampDuty,
        type: "FEE",
        color: "bg-orange-700",
        textColor: "text-orange-400",
      },
      {
        id: "net_pnl",
        label: "Net Realized P&L",
        amount: summary.realizedPnl,
        type: "FINAL",
        color: summary.realizedPnl >= 0 ? "bg-emerald-400" : "bg-rose-500",
        textColor: summary.realizedPnl >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold",
      },
    ];
  }, [summary]);

  const maxVal = Math.max(...steps.map((s) => Math.abs(s.amount)), 1000);

  const formatMoney = (val: number) => {
    const isNeg = val < 0;
    const absVal = Math.abs(val);
    let str = "";
    if (absVal >= 100000) {
      str = `${(absVal / 100000).toFixed(2)}L`;
    } else if (absVal >= 1000) {
      str = `${(absVal / 1000).toFixed(1)}K`;
    } else {
      str = absVal.toFixed(2);
    }
    return `${isNeg ? "-" : "+"}${currencySymbol}${str}`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-md flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Financial P&L Waterfall Audit
            </h3>
            <p className="text-[11px] text-slate-400">
              Complete reconciliation bridge from gross trading edge to net bankable capital
            </p>
          </div>
        </div>
        <div className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
          Total Fee Drag: <span className="text-amber-400 font-semibold">{currencySymbol}{summary.totalCharges.toFixed(2)}</span>
        </div>
      </div>

      {/* Waterfall Step Bars */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 pt-2">
        {steps.map((step, idx) => {
          const heightPercent = Math.min(100, Math.max(12, (Math.abs(step.amount) / maxVal) * 100));

          return (
            <div
              key={step.id}
              className={`rounded-xl p-2.5 flex flex-col justify-between border transition-all ${
                step.type === "FINAL"
                  ? "bg-slate-900 border-cyan-500/60 ring-1 ring-cyan-500/30"
                  : step.type === "SUBTOTAL"
                  ? "bg-slate-950/90 border-slate-700"
                  : "bg-slate-950/60 border-slate-800/80"
              }`}
            >
              <div>
                <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold truncate">
                  {step.label}
                </div>
                <div className="text-[9px] text-slate-500 font-mono">
                  {step.type}
                </div>
              </div>

              {/* Bar visualization */}
              <div className="h-20 my-2 flex items-end justify-center bg-slate-900/40 rounded-lg p-1">
                <div
                  className={`w-full rounded-md transition-all duration-500 ${step.color}`}
                  style={{ height: `${heightPercent}%` }}
                />
              </div>

              {/* Amount */}
              <div className="pt-1.5 border-t border-slate-800/60 text-center">
                <div className={`text-xs font-mono font-bold truncate ${step.textColor}`}>
                  {formatMoney(step.amount)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
