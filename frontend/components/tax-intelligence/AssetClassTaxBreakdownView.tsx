"use client";

import React, { memo } from "react";
import { Layers, ShieldCheck, TrendingUp, Info } from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { AssetClassTaxBreakdown } from "@/lib/taxEngineService";
import { ProgressBar } from "@/components/charts/ProgressBar";

interface AssetClassTaxBreakdownViewProps {
  breakdowns: AssetClassTaxBreakdown[];
  currency: string;
}

export const AssetClassTaxBreakdownView = memo(function AssetClassTaxBreakdownView({
  breakdowns,
  currency,
}: AssetClassTaxBreakdownViewProps) {
  const prefix = currency === "INR" ? "₹" : currency === "USD" ? "$" : `${currency} `;

  const totalTaxable = breakdowns.reduce((sum, b) => sum + Math.max(0, b.taxable_amount), 0) || 1;
  const totalTax = breakdowns.reduce((sum, b) => sum + Math.max(0, b.estimated_tax), 0);

  return (
    <div className="space-y-4">
      {/* ── Top Header Banner ──────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl bg-[#061A2A] border border-[#0F2D48] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#092237] border border-[#16C6F4]/30 text-[#16C6F4]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
              STATUTORY ASSET-CLASS EXPOSURE & CLASSIFICATION
            </h3>
            <p className="text-[11px] text-[#7D8EA5] font-mono">
              Granular isolation of equity, derivatives, and crypto under Finance Act 2024 statutory tax brackets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-slate-400">Total Classified Tax:</span>
          <span className="font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
            {formatMoney(totalTax, prefix)}
          </span>
        </div>
      </div>

      {/* ── Asset Class Cards Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {breakdowns.map((item, idx) => {
          const sharePct = Number(((Math.max(0, item.taxable_amount) / totalTaxable) * 100).toFixed(1));
          const isPos = item.gross_realized >= 0;

          return (
            <div
              key={item.asset_class || idx}
              className="p-4 rounded-xl bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/50 transition-all flex flex-col justify-between space-y-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#0C2237]">
                <div>
                  <h4 className="text-[13px] font-bold text-white font-sans">
                    {item.label}
                  </h4>
                  <span className="text-[9px] font-mono text-[#7D8EA5] uppercase">
                    Tax Rate: {item.effective_rate_pct}% Applicable
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#092237] text-[#16C6F4] border border-[#16C6F4]/30 font-bold">
                  {sharePct}% Share
                </span>
              </div>

              {/* Metrics */}
              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-[#7D8EA5]">Gross Realized:</span>
                  <span className={`font-bold tabular-nums ${isPos ? "text-[#00E890]" : "text-[#FF3B5C]"}`}>
                    {isPos ? "+" : ""}{formatMoney(item.gross_realized, prefix)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7D8EA5]">Taxable Gains:</span>
                  <span className="font-bold text-[#16C6F4] tabular-nums">
                    {formatMoney(item.taxable_amount, prefix)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7D8EA5]">Estimated Tax:</span>
                  <span className="font-bold text-amber-400 tabular-nums">
                    {formatMoney(item.estimated_tax, prefix)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7D8EA5]">Trade Executions:</span>
                  <span className="font-medium text-slate-300">
                    {item.trade_count} trades
                  </span>
                </div>
              </div>

              {/* Progress Bar of Exposure */}
              <div className="space-y-1 pt-1 border-t border-[#0C2237]">
                <div className="flex justify-between text-[10px] font-mono text-[#7D8EA5]">
                  <span>Exposure Volume</span>
                  <span>{formatMoney(item.turnover, prefix)}</span>
                </div>
                <ProgressBar
                  value={sharePct}
                  max={100}
                  height={4}
                  color={idx === 0 ? "bg-[#16C6F4]" : idx === 1 ? "bg-[#00E890]" : idx === 2 ? "bg-amber-400" : "bg-purple-400"}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
