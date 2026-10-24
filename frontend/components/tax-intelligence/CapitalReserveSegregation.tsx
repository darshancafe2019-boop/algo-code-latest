"use client";

import React, { memo } from "react";
import { Layers, ShieldCheck, AlertTriangle, ArrowRight, DollarSign, PieChart, Info } from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { LiveFundTaxSegregation } from "@/lib/taxEngineService";
import { DonutChart } from "@/components/charts/DonutChart";

interface CapitalReserveSegregationProps {
  fund: LiveFundTaxSegregation;
  currency: string;
  brokerBreakdown?: Array<{
    name: string;
    equity: number;
    reserve: number;
    margin: number;
    free: number;
  }>;
}

export const CapitalReserveSegregation = memo(function CapitalReserveSegregation({
  fund,
  currency,
  brokerBreakdown = [],
}: CapitalReserveSegregationProps) {
  const prefix = currency === "INR" ? "₹" : currency === "USD" ? "$" : `${currency} `;

  const totalCap = Math.max(1, fund.total_equity);
  const marginPct = Math.min(100, Math.max(0, (fund.used_margin / totalCap) * 100));
  const reservePct = Math.min(100 - marginPct, Math.max(0, (fund.suggested_tax_reserve / totalCap) * 100));
  const freePct = Math.max(0, 100 - marginPct - reservePct);

  const isReserveSufficient = fund.available_funds >= fund.suggested_tax_reserve;

  const donutSegments = [
    { name: "Active Margin", value: fund.used_margin, percentage: Math.round(marginPct), color: "#F59E0B" },
    { name: "Tax Reserve Buffer", value: fund.suggested_tax_reserve, percentage: Math.round(reservePct), color: "#16C6F4" },
    { name: "Free Distributable", value: fund.post_tax_free_capital, percentage: Math.round(freePct), color: "#00E890" },
  ];

  return (
    <div className="space-y-4">
      {/* ── Top Overview Banner: Capital & Segregated Reserves ─────────────────────── */}
      <div className="p-4 rounded-xl bg-[#061A2A] border border-[#0F2D48] shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#0C2237]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#092237] border border-[#16C6F4]/30 text-[#16C6F4]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
                INSTITUTIONAL CAPITAL & STATUTORY TAX RESERVE SEGREGATION
              </h3>
              <p className="text-[11px] text-[#7D8EA5] font-mono">
                Accounting isolation ensuring statutory liabilities are segregated from active trading exposure
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isReserveSufficient ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono text-emerald-400 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SOLVENT • FULLY COVERED</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono text-amber-300 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>RESERVE BUFFER SHORTFALL</span>
              </div>
            )}
          </div>
        </div>

        {/* 6 Key Accounting Dimensions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
          <div className="p-2.5 rounded-lg bg-[#041424] border border-[#0D263D]">
            <span className="text-[10px] text-[#7D8EA5] font-mono block">1. Total Verified Equity</span>
            <span className="text-[16px] font-black text-white font-mono tabular-nums">
              {formatMoney(fund.total_equity, prefix)}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#041424] border border-[#0D263D]">
            <span className="text-[10px] text-[#7D8EA5] font-mono block">2. Allocated Capital</span>
            <span className="text-[16px] font-bold text-slate-200 font-mono tabular-nums">
              {formatMoney(fund.total_equity, prefix)}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#041424] border border-[#0D263D]">
            <span className="text-[10px] text-[#7D8EA5] font-mono block">3. Used Margin (Exposure)</span>
            <span className="text-[16px] font-bold text-amber-400 font-mono tabular-nums">
              {formatMoney(fund.used_margin, prefix)}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#041424] border border-[#0D263D]">
            <span className="text-[10px] text-[#7D8EA5] font-mono block">4. Available Cash</span>
            <span className="text-[16px] font-bold text-cyan-400 font-mono tabular-nums">
              {formatMoney(fund.available_funds, prefix)}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#041424] border border-[#0D263D]">
            <span className="text-[10px] text-[#7D8EA5] font-mono block">5. Estimated Tax Reserve</span>
            <span className="text-[16px] font-bold text-amber-300 font-mono tabular-nums">
              {formatMoney(fund.suggested_tax_reserve, prefix)}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#041424] border border-[#0D263D]">
            <span className="text-[10px] text-[#7D8EA5] font-mono block">6. Free Distributable</span>
            <span className="text-[16px] font-bold text-[#00E890] font-mono tabular-nums">
              {formatMoney(fund.post_tax_free_capital, prefix)}
            </span>
          </div>
        </div>

        {/* Stacked Progress Visualizer */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#8EA1B7]">Capital Distribution Model:</span>
            <span className="text-slate-400 font-semibold">
              Reserve Ratio: <span className="text-[#16C6F4]">{reservePct.toFixed(1)}%</span>
            </span>
          </div>

          <div className="h-4 w-full rounded-full bg-[#030D18] p-0.5 border border-[#0C2237] flex overflow-hidden gap-0.5 shadow-inner">
            {/* Margin Deployed */}
            <div
              style={{ width: `${marginPct}%` }}
              className="h-full bg-gradient-to-r from-amber-600 to-amber-500 rounded-l-full transition-all duration-500 relative group cursor-pointer"
              title={`Used Margin: ${formatMoney(fund.used_margin, prefix)} (${marginPct.toFixed(1)}%)`}
            />

            {/* Tax Reserve Buffer */}
            <div
              style={{ width: `${reservePct}%` }}
              className="h-full bg-gradient-to-r from-[#16C6F4] to-[#0A85B5] transition-all duration-500 relative group cursor-pointer"
              title={`Tax Reserve Buffer: ${formatMoney(fund.suggested_tax_reserve, prefix)} (${reservePct.toFixed(1)}%)`}
            />

            {/* Free Distributable Capital */}
            <div
              style={{ width: `${freePct}%` }}
              className="h-full bg-gradient-to-r from-[#00E890] to-emerald-600 rounded-r-full transition-all duration-500 relative group cursor-pointer"
              title={`Free Distributable: ${formatMoney(fund.post_tax_free_capital, prefix)} (${freePct.toFixed(1)}%)`}
            />
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-[10px] font-mono text-[#7D8EA5]">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span>Used Margin: {formatMoney(fund.used_margin, prefix)} ({marginPct.toFixed(1)}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#16C6F4]" />
              <span>Tax Reserve Buffer: {formatMoney(fund.suggested_tax_reserve, prefix)} ({reservePct.toFixed(1)}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#00E890]" />
              <span>Free Distributable: {formatMoney(fund.post_tax_free_capital, prefix)} ({freePct.toFixed(1)}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-Column Analysis: Donut Breakdown + Regulatory Policy Note ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Visual Donut Chart */}
        <div className="lg:col-span-5 p-4 rounded-xl bg-[#061A2A] border border-[#0F2D48] flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-[#0C2237]">
            <span className="text-[12px] font-bold text-white uppercase font-sans">
              Capital Segregation Ratio
            </span>
            <span className="text-[10px] font-mono text-[#16C6F4]">LIVE RATIO</span>
          </div>

          <div className="py-4 flex justify-center items-center">
            <DonutChart
              segments={donutSegments}
              size={180}
              thickness={22}
              centerValue={formatMoney(fund.suggested_tax_reserve, prefix)}
              centerSubtitle="Tax Reserve"
              centerValueClass="text-[14px] font-bold text-white font-mono"
              centerSubtitleClass="text-[10px] font-semibold text-[#16C6F4] font-mono uppercase"
            />
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[#0C2237] text-[11px] font-mono">
            <div className="flex justify-between text-[#8EA1B7]">
              <span>Taxes & STT Paid to Date:</span>
              <span className="text-emerald-400 font-bold">{formatMoney(fund.stt_taxes_paid_to_date, prefix)}</span>
            </div>
            <div className="flex justify-between text-[#8EA1B7]">
              <span>Available Cash Cushion:</span>
              <span className="text-cyan-400 font-bold">{formatMoney(fund.available_funds, prefix)}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Statutory Reserve Policy & Formula Explanation */}
        <div className="lg:col-span-7 p-4 rounded-xl bg-[#061A2A] border border-[#0F2D48] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#0C2237]">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#16C6F4]" />
              <span className="text-[12px] font-bold text-white uppercase font-sans">
                Statutory Reserve Policy & Formula Mechanics
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">POLICY v2.5</span>
          </div>

          <div className="space-y-2 text-[11px] text-[#8EA1B7] leading-relaxed">
            <p>
              <strong className="text-slate-200">Accounting Segregation:</strong> The tax reserve displayed is a virtual accounting segregation calculated against verified realized profits. Funds are not locked or ring-fenced at the broker level unless dedicated sub-accounts are enabled.
            </p>
            <p>
              <strong className="text-slate-200">Formula:</strong> <code className="text-[#16C6F4] bg-[#041424] px-1.5 py-0.5 rounded font-mono">Free Distributable = Available Funds - Max(0, Estimated Tax - Taxes Paid)</code>
            </p>
            <p>
              <strong className="text-slate-200">Advance Tax Buffer:</strong> Maintains a 20% to 30% baseline withholding on gross business derivative gains and 20% on short-term equity gains (Section 111A post Finance Act 2024 revisions) to safeguard against quarterly advance tax penalties (Section 234B/234C).
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#041424] border border-[#0D263D] flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">Quarterly Target Status:</span>
            <span className="text-[#00E890] font-bold">100% Final Target Model Active</span>
          </div>
        </div>
      </div>
    </div>
  );
});
