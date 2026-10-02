"use client";

import React, { useState, memo } from "react";
import { formatMoney } from "@/lib/formatters";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Search,
  Filter,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";
import { AnalyzedTaxPosition } from "@/types/tax";

interface TaxPositionsViewProps {
  positions: AnalyzedTaxPosition[];
  currency: string;
}

export const TaxPositionsView = memo(function TaxPositionsView({
  positions,
  currency,
}: TaxPositionsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAsset, setFilterAsset] = useState("ALL");

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "₹0.00";
    const prefix = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : `${currency} `;
    return formatMoney(val, prefix);
  };

  const filtered = (positions || []).filter((pos) => {
    const matchesSearch =
      pos.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pos.broker.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAsset =
      filterAsset === "ALL" || pos.asset_class.toUpperCase() === filterAsset;
    return matchesSearch && matchesAsset;
  });

  const totalMarketVal = filtered.reduce((acc, p) => acc + (p.market_value || 0), 0);
  const totalUnrealizedPl = filtered.reduce((acc, p) => acc + (p.unrealized_pl || 0), 0);
  const totalTaxIfSoldNow = filtered.reduce((acc, p) => acc + (p.estimated_tax_if_sold_now || 0), 0);
  const totalSavingsPotential = filtered.reduce((acc, p) => acc + (p.potential_tax_savings_waiting || 0), 0);

  return (
    <div className="space-y-4">
      {/* ── Summary Stats Bar ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 font-mono">
          <span className="text-[11px] text-slate-400 block font-sans">Open Positions Exposure</span>
          <span className="text-base font-bold text-slate-100">{formatCurrency(totalMarketVal)}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 font-mono">
          <span className="text-[11px] text-slate-400 block font-sans">Unrealized MTM P&L</span>
          <span className={`text-base font-bold ${totalUnrealizedPl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {formatCurrency(totalUnrealizedPl)}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 font-mono">
          <span className="text-[11px] text-slate-400 block font-sans">Tax If Liquidated Now</span>
          <span className="text-base font-bold text-amber-400">{formatCurrency(totalTaxIfSoldNow)}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 font-mono">
          <span className="text-[11px] text-slate-400 block font-sans">Potential LTCG Alpha Savings</span>
          <span className="text-base font-bold text-cyan-400">{formatCurrency(totalSavingsPotential)}</span>
        </div>
      </div>

      {/* ── Controls Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search symbol or broker..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {["ALL", "EQUITY", "OPTIONS", "FUTURES", "CRYPTO"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterAsset(tab)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                  filterAsset === tab
                    ? "bg-indigo-600 text-white font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>Real-time holding period monitor & square-off tax advisory</span>
        </div>
      </div>

      {/* ── Positions Table ────────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px]">
                <th className="py-3 px-4 font-medium">Position</th>
                <th className="py-3 px-4 font-medium">Broker / Acc</th>
                <th className="py-3 px-4 font-medium text-right">Cost Basis</th>
                <th className="py-3 px-4 font-medium text-right">Market Value</th>
                <th className="py-3 px-4 font-medium text-right">Unrealized P&L</th>
                <th className="py-3 px-4 font-medium">Holding Progress (365d)</th>
                <th className="py-3 px-4 font-medium text-right">Tax If Sold Now</th>
                <th className="py-3 px-4 font-medium text-right">LTCG Savings</th>
                <th className="py-3 px-4 font-medium text-center">Tax Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-mono text-xs">
                    No active positions matching search criteria. Open positions from the trading desk will appear here dynamically.
                  </td>
                </tr>
              ) : (
                filtered.map((pos) => {
                  const isPositive = pos.unrealized_pl >= 0;
                  const progressPct = Math.min(100, Math.round((pos.holding_period_days / pos.statutory_threshold_days) * 100));

                  return (
                    <tr key={pos.lot_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-100 font-sans">{pos.symbol}</div>
                        <div className="text-[10px] text-slate-500 uppercase">{pos.asset_class} • Qty: {pos.quantity}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-200">{pos.broker}</span>
                        <div className="text-[10px] text-slate-500">{pos.account_id}</div>
                      </td>

                      <td className="py-3 px-4 text-right text-slate-300">
                        {formatCurrency(pos.total_cost_basis)}
                        <div className="text-[10px] text-slate-500">@{formatCurrency(pos.cost_basis_per_unit)}</div>
                      </td>

                      <td className="py-3 px-4 text-right font-semibold text-slate-100">
                        {formatCurrency(pos.market_value)}
                        <div className="text-[10px] text-slate-400">@{formatCurrency(pos.current_price)}</div>
                      </td>

                      <td className="py-3 px-4 text-right font-semibold">
                        <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
                          {formatCurrency(pos.unrealized_pl)}
                        </span>
                      </td>

                      <td className="py-3 px-4 min-w-[150px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>{pos.holding_period_days}d held</span>
                            <span>{pos.days_remaining_to_threshold > 0 ? `${pos.days_remaining_to_threshold}d to LTCG` : "LTCG Eligible"}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                            <div
                              style={{ width: `${progressPct}%` }}
                              className={`h-full rounded-full transition-all duration-300 ${
                                progressPct >= 100 ? "bg-emerald-400" : progressPct > 50 ? "bg-cyan-400" : "bg-indigo-500"
                              }`}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right text-amber-400 font-semibold">
                        {formatCurrency(pos.estimated_tax_if_sold_now)}
                        <div className="text-[10px] text-slate-500">{pos.current_classification_if_sold === "SHORT_TERM_CAPITAL_GAIN" ? "STCG (20%)" : "Deriv (30%)"}</div>
                      </td>

                      <td className="py-3 px-4 text-right text-cyan-400 font-semibold">
                        {pos.potential_tax_savings_waiting > 0 ? formatCurrency(pos.potential_tax_savings_waiting) : "—"}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded font-bold border ${
                            pos.tax_action_priority_score >= 80
                              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                              : "bg-slate-900 text-slate-400 border-slate-800"
                          }`}
                        >
                          {pos.tax_action_priority_score >= 80 ? "HOLD FOR LTCG" : "NORMAL"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
