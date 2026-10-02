"use client";

import React, { memo, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Layers,
  Calendar,
  ShieldCheck,
  Percent,
  DollarSign,
  AlertCircle,
  ArrowUpRight,
  Info,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { CalculatedTaxMetrics } from "@/lib/taxEngineService";

interface TaxVisualAnalyticsChartsProps {
  metrics: CalculatedTaxMetrics;
  currency: string;
}

export const TaxVisualAnalyticsCharts = memo(function TaxVisualAnalyticsCharts({
  metrics,
  currency,
}: TaxVisualAnalyticsChartsProps) {
  const [hoveredBroker, setHoveredBroker] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<"BROKERS" | "ASSETS" | "ADVANCE_TAX">("BROKERS");

  const prefix = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : `${currency} `;
  const formatVal = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "—";
    return formatMoney(val, prefix);
  };

  const fund = metrics.fund_segregation;
  const totalCap = Math.max(1, fund.total_equity);
  const marginPct = Math.min(100, Math.max(0, (fund.used_margin / totalCap) * 100));
  const reservePct = Math.min(100 - marginPct, Math.max(0, (fund.suggested_tax_reserve / totalCap) * 100));
  const freePct = Math.max(0, 100 - marginPct - reservePct);

  // Broker chart data
  const brokerList = Object.values(metrics.broker_segregations);
  const maxBrokerVal = Math.max(
    1000,
    ...brokerList.map((b) => Math.max(Math.abs(b.realized_pnl || 0), b.estimated_tax || 0, (b.fees + b.taxes_paid) || 0))
  );

  return (
    <div className="space-y-4">
      {/* ── 1. Live Fund & Tax Reserve Segregation Progress Bar ─────────────────────────── */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm backdrop-blur-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-sans">
                Live Capital & Statutory Tax Reserve Segregation
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Synchronized with central portfolio equity ({formatVal(fund.total_equity)})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="text-slate-400">Tax Reserve Buffer:</span>
            <span className="font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
              {formatVal(fund.suggested_tax_reserve)} ({fund.reserve_utilization_pct}%)
            </span>
          </div>
        </div>

        {/* Stacked Multi-Segment Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-4 w-full rounded-full bg-slate-950 p-0.5 border border-slate-800 flex overflow-hidden gap-0.5 shadow-inner">
            {/* Margin Deployed */}
            <div
              style={{ width: `${marginPct}%` }}
              className="h-full bg-gradient-to-r from-amber-600 to-amber-500 rounded-l-full transition-all duration-500 relative group cursor-pointer"
              title={`Active Margin: ${formatVal(fund.used_margin)} (${marginPct.toFixed(1)}%)`}
            >
              <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[9px] font-mono text-amber-300 whitespace-nowrap z-30 transition-opacity pointer-events-none">
                Margin Utilized: {formatVal(fund.used_margin)}
              </div>
            </div>

            {/* Tax Reserve Buffer */}
            <div
              style={{ width: `${reservePct}%` }}
              className="h-full bg-gradient-to-r from-indigo-600 to-indigo-500 transition-all duration-500 relative group cursor-pointer"
              title={`Statutory Tax Reserve: ${formatVal(fund.suggested_tax_reserve)} (${reservePct.toFixed(1)}%)`}
            >
              <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[9px] font-mono text-indigo-300 whitespace-nowrap z-30 transition-opacity pointer-events-none">
                Tax Reserve: {formatVal(fund.suggested_tax_reserve)}
              </div>
            </div>

            {/* Free Distributable Capital */}
            <div
              style={{ width: `${freePct}%` }}
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-r-full transition-all duration-500 relative group cursor-pointer"
              title={`Free Trading Capital: ${formatVal(fund.post_tax_free_capital)} (${freePct.toFixed(1)}%)`}
            >
              <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[9px] font-mono text-emerald-300 whitespace-nowrap z-30 transition-opacity pointer-events-none">
                Free Capital: {formatVal(fund.post_tax_free_capital)}
              </div>
            </div>
          </div>

          {/* Bar Legend & Numerical Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                <span className="text-slate-400 text-[11px]">Margin Deployed</span>
              </div>
              <span className="font-bold text-amber-400">{formatVal(fund.used_margin)}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                <span className="text-slate-400 text-[11px]">Tax Reserve</span>
              </div>
              <span className="font-bold text-indigo-400">{formatVal(fund.suggested_tax_reserve)}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span className="text-slate-400 text-[11px]">Free Distributable</span>
              </div>
              <span className="font-bold text-emerald-400">{formatVal(fund.post_tax_free_capital)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Interactive Chart Mode Selector ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-slate-200 font-sans tracking-wide">
            VISUAL TAX ANALYTICS & BREAKDOWNS
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setChartMode("BROKERS")}
            className={`px-3 py-1 rounded text-xs font-mono font-medium transition-all ${
              chartMode === "BROKERS"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Broker Comparison
          </button>
          <button
            onClick={() => setChartMode("ASSETS")}
            className={`px-3 py-1 rounded text-xs font-mono font-medium transition-all ${
              chartMode === "ASSETS"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Asset Class Exposure
          </button>
          <button
            onClick={() => setChartMode("ADVANCE_TAX")}
            className={`px-3 py-1 rounded text-xs font-mono font-medium transition-all ${
              chartMode === "ADVANCE_TAX"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Advance Tax Schedule
          </button>
        </div>
      </div>

      {/* ── 3. Visual Charts Body Based on Selected Mode ───────────────────────────── */}
      {chartMode === "BROKERS" && (
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 font-mono">
              REALIZED P&L vs ESTIMATED TAX vs NET GAIN BY BROKER
            </span>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-xs bg-emerald-400" /> Realized P&L
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2 h-2 rounded-xs bg-amber-400" /> Estimated Tax
              </span>
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2 h-2 rounded-xs bg-cyan-400" /> Net Post-Tax
              </span>
            </div>
          </div>

          {/* Bar Chart Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {brokerList.map((seg) => {
              const pnl = seg.realized_pnl || 0;
              const tax = seg.estimated_tax || 0;
              const net = Math.max(0, pnl - tax - (seg.fees + seg.taxes_paid));

              const pnlBarPct = Math.min(100, Math.max(8, (Math.abs(pnl) / maxBrokerVal) * 100));
              const taxBarPct = Math.min(100, Math.max(8, (tax / maxBrokerVal) * 100));
              const netBarPct = Math.min(100, Math.max(8, (net / maxBrokerVal) * 100));

              return (
                <div
                  key={seg.broker}
                  onMouseEnter={() => setHoveredBroker(seg.broker)}
                  onMouseLeave={() => setHoveredBroker(null)}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="font-bold text-xs text-slate-200 font-sans">{seg.broker}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      {seg.transaction_count} trades
                    </span>
                  </div>

                  {/* Visual Vertical Bar Stack */}
                  <div className="h-32 flex items-end justify-center gap-3 px-2 pt-2 pb-1 bg-slate-900/40 rounded-lg border border-slate-800/50">
                    {/* Realized PnL Bar */}
                    <div className="flex-1 flex flex-col items-center h-full justify-end group relative">
                      <div
                        style={{ height: `${pnlBarPct}%` }}
                        className={`w-full rounded-t-sm transition-all duration-300 ${
                          pnl >= 0 ? "bg-emerald-500/80 hover:bg-emerald-400" : "bg-rose-500/80 hover:bg-rose-400"
                        }`}
                      />
                      <span className="text-[9px] font-mono text-slate-400 mt-1">P&L</span>
                      <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-[9px] font-mono text-emerald-300 whitespace-nowrap z-20 pointer-events-none">
                        Realized: {formatVal(pnl)}
                      </div>
                    </div>

                    {/* Tax Bar */}
                    <div className="flex-1 flex flex-col items-center h-full justify-end group relative">
                      <div
                        style={{ height: `${taxBarPct}%` }}
                        className="w-full bg-amber-500/80 hover:bg-amber-400 rounded-t-sm transition-all duration-300"
                      />
                      <span className="text-[9px] font-mono text-slate-400 mt-1">Tax</span>
                      <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-[9px] font-mono text-amber-300 whitespace-nowrap z-20 pointer-events-none">
                        Est. Tax: {formatVal(tax)}
                      </div>
                    </div>

                    {/* Net Post-Tax Bar */}
                    <div className="flex-1 flex flex-col items-center h-full justify-end group relative">
                      <div
                        style={{ height: `${netBarPct}%` }}
                        className="w-full bg-cyan-500/80 hover:bg-cyan-400 rounded-t-sm transition-all duration-300"
                      />
                      <span className="text-[9px] font-mono text-slate-400 mt-1">Net</span>
                      <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-[9px] font-mono text-cyan-300 whitespace-nowrap z-20 pointer-events-none">
                        Net Post-Tax: {formatVal(net)}
                      </div>
                    </div>
                  </div>

                  {/* Summary Text Details */}
                  <div className="space-y-1 text-xs font-mono pt-1 border-t border-slate-800/80">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Realized:</span>
                      <span className={pnl >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                        {formatVal(pnl)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Est. Tax:</span>
                      <span className="text-amber-400 font-semibold">{formatVal(tax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">STT / Fees:</span>
                      <span className="text-slate-300">{formatVal(seg.fees + seg.taxes_paid)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {chartMode === "ASSETS" && (
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 font-mono">
              ASSET CLASS TURNOVER & STATUTORY TAX RATES
            </span>
            <span className="text-[10px] font-mono text-indigo-400">
              Jurisdiction: {metrics.jurisdiction} ({metrics.current_tax_year})
            </span>
          </div>

          <div className="space-y-3">
            {metrics.asset_breakdown.map((item) => {
              const maxTurnover = Math.max(10000, ...metrics.asset_breakdown.map((a) => a.turnover));
              const fillPct = Math.min(100, Math.max(5, (item.turnover / maxTurnover) * 100));

              return (
                <div key={item.asset_class} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200 font-sans">{item.label}</span>
                      <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px]">
                        {item.effective_rate_pct}% Statutory Rate
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">Turnover: <strong className="text-slate-200">{formatVal(item.turnover)}</strong></span>
                      <span className="text-amber-400 font-bold">Est. Tax: {formatVal(item.estimated_tax)}</span>
                    </div>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      style={{ width: `${fillPct}%` }}
                      className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-500"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>{item.trade_count} recorded fills/positions</span>
                    <span>Taxable Gain: {formatVal(item.taxable_amount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {chartMode === "ADVANCE_TAX" && (
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-slate-300 font-mono">
                STATUTORY QUARTERLY ADVANCE TAX SCHEDULE ({metrics.current_tax_year})
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Total Annual Estimated Liability: <strong className="text-amber-400">{formatVal(metrics.estimated_tax_liability)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {metrics.advance_tax_installments.map((inst) => {
              const isPaid = inst.status === "PAID";
              const isApproaching = inst.status === "APPROACHING";

              return (
                <div
                  key={inst.quarter}
                  className={`p-4 rounded-xl border transition-all space-y-3 font-mono ${
                    isPaid
                      ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                      : isApproaching
                      ? "bg-amber-950/30 border-amber-500/50 shadow-md shadow-amber-900/20"
                      : "bg-slate-950/80 border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-100">{inst.quarter}: {inst.label}</span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-bold border ${
                        isPaid
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : isApproaching
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse"
                          : "bg-slate-900 text-slate-400 border-slate-800"
                      }`}
                    >
                      {inst.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Due Date:</span>
                      <span className="text-slate-200 font-semibold">{inst.statutory_due_date}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Cumulative Target:</span>
                      <span className="text-indigo-300">{inst.cumulative_target_pct}% ({formatVal(inst.cumulative_tax_target)})</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Quarter Installment:</span>
                      <span className="text-amber-400 font-bold">{formatVal(inst.quarter_payable_amount)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                      <div
                        style={{ width: `${Math.min(100, (inst.paid_amount / Math.max(1, inst.quarter_payable_amount)) * 100)}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          isPaid ? "bg-emerald-400" : "bg-indigo-500"
                        }`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>{inst.days_remaining > 0 ? `${inst.days_remaining} days left` : "Elapsed"}</span>
                      <span>Paid: {formatVal(inst.paid_amount)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
