"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Search,
  Filter,
  Sparkles,
} from "lucide-react";
import { AnalyzedTaxPosition } from "@/types/tax";

interface TaxPositionsViewProps {
  positions: AnalyzedTaxPosition[];
  currency: string;
}

export function TaxPositionsView({ positions, currency }: TaxPositionsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAsset, setFilterAsset] = useState("ALL");

  const formatCurrency = (val: number) => {
    const prefix = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : `${currency} `;
    return `${prefix}${Math.abs(val).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const filtered = positions.filter((pos) => {
    const matchesSearch =
      pos.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pos.broker.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAsset =
      filterAsset === "ALL" || pos.asset_class.toUpperCase() === filterAsset;
    return matchesSearch && matchesAsset;
  });

  return (
    <div className="space-y-4">
      {/* Controls Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search symbol or broker..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {["ALL", "EQUITY", "FUTURE", "CRYPTO"].map((tab) => (
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

      {/* Positions Table */}
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
                <th className="py-3 px-4 font-medium">Holding Period</th>
                <th className="py-3 px-4 font-medium text-right">Tax If Sold Now</th>
                <th className="py-3 px-4 font-medium text-right">Potential Savings</th>
                <th className="py-3 px-4 font-medium text-center">Tax Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((pos) => {
                const isPositive = pos.unrealized_pl >= 0;
                const hasCountdown = pos.days_remaining_to_threshold > 0;

                return (
                  <tr
                    key={pos.lot_id}
                    className="hover:bg-slate-800/30 transition-colors duration-150"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 font-sans">
                          {pos.symbol}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {pos.quantity} units
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase">
                        {pos.asset_class}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-200">{pos.broker}</div>
                      <div className="text-[10px] text-slate-500">{pos.account_id}</div>
                    </td>

                    <td className="py-3 px-4 text-right text-slate-300">
                      {formatCurrency(pos.total_cost_basis)}
                      <div className="text-[10px] text-slate-500">
                        @{formatCurrency(pos.cost_basis_per_unit)}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right text-slate-200">
                      {formatCurrency(pos.market_value)}
                      <div className="text-[10px] text-slate-500">
                        @{formatCurrency(pos.current_price)}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div
                        className={`font-semibold flex items-center justify-end gap-1 ${
                          isPositive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        {isPositive ? "+" : "-"}
                        {formatCurrency(pos.unrealized_pl)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {pos.total_cost_basis > 0
                          ? `${((pos.unrealized_pl / pos.total_cost_basis) * 100).toFixed(1)}%`
                          : "0.0%"}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-200 font-semibold">
                          {pos.holding_period_days}d
                        </span>
                        <span className="text-slate-500">
                          / {pos.statutory_threshold_days}d
                        </span>
                      </div>
                      {hasCountdown ? (
                        <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
                          ⏳ {pos.days_remaining_to_threshold}d to LTCG
                        </div>
                      ) : (
                        <div className="text-[10px] text-emerald-400 mt-0.5">
                          ✓ Long-Term Qualified
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-semibold text-rose-400">
                      {formatCurrency(pos.estimated_tax_if_sold_now)}
                      <div className="text-[10px] text-slate-500">
                        {pos.current_classification_if_sold === "SHORT_TERM_CAPITAL_GAIN"
                          ? "STCG (20%)"
                          : "LTCG (12.5%)"}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {pos.potential_tax_savings_waiting > 0 ? (
                        <div>
                          <span className="text-emerald-400 font-bold">
                            +{formatCurrency(pos.potential_tax_savings_waiting)}
                          </span>
                          <div className="text-[10px] text-slate-500">
                            if held {pos.days_remaining_to_threshold}d
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800">
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        <span className="text-xs font-bold text-slate-100">
                          {pos.tax_action_priority_score}
                        </span>
                        <span className="text-[9px] text-slate-500">/100</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
