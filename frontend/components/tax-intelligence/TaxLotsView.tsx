"use client";

import React, { useState, memo } from "react";
import { formatMoney } from "@/lib/formatters";
import { Layers, Search, Filter, ShieldCheck, Clock, ArrowRight } from "lucide-react";
import { TaxLotItem } from "@/types/tax";

interface TaxLotsViewProps {
  lots: TaxLotItem[];
  currency: string;
}

export const TaxLotsView = memo(function TaxLotsView({ lots, currency }: TaxLotsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("ALL");

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "₹0.00";
    const prefix = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : `${currency} `;
    return formatMoney(val, prefix);
  };

  const filtered = (lots || []).filter((l) => {
    const matchesSearch =
      l.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.broker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = filterClass === "ALL" || l.tax_classification === filterClass;
    return matchesSearch && matchesClass;
  });

  const totalCostBasis = filtered.reduce((acc, l) => acc + (l.cost_basis || 0), 0);
  const totalLotsCount = filtered.length;

  return (
    <div className="space-y-4">
      {/* ── Summary & Search Bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm backdrop-blur-md">
        <div className="relative flex-1 sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tax lot ID, symbol, broker..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 font-mono"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {["ALL", "SHORT_TERM_CAPITAL_GAIN", "LONG_TERM_CAPITAL_GAIN", "CRYPTO_VDA_INCOME"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterClass(tab)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                  filterClass === tab
                    ? "bg-indigo-600 text-white font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab === "ALL" ? "ALL LOTS" : tab === "SHORT_TERM_CAPITAL_GAIN" ? "STCG" : tab === "LONG_TERM_CAPITAL_GAIN" ? "LTCG" : "VDA"}
              </button>
            ))}
          </div>

          <div className="text-xs font-mono text-slate-400 hidden lg:block">
            Cost Basis: <strong className="text-slate-200">{formatCurrency(totalCostBasis)}</strong> ({totalLotsCount} lots)
          </div>
        </div>
      </div>

      {/* ── Lots Table ───────────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px]">
                <th className="py-3 px-4 font-medium">Lot ID / Symbol</th>
                <th className="py-3 px-4 font-medium">Acquired Date</th>
                <th className="py-3 px-4 font-medium">Broker</th>
                <th className="py-3 px-4 font-medium text-right">Quantity</th>
                <th className="py-3 px-4 font-medium text-right">Cost Basis / Unit</th>
                <th className="py-3 px-4 font-medium text-right">Total Cost Basis</th>
                <th className="py-3 px-4 font-medium">Accounting Method</th>
                <th className="py-3 px-4 font-medium">Holding Period</th>
                <th className="py-3 px-4 font-medium">Tax Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-mono text-xs">
                    No active tax lots monitored. Tax lots are generated automatically upon order fills and open positions.
                  </td>
                </tr>
              ) : (
                filtered.map((lot) => {
                  const holdingProgress = Math.min(100, Math.round((lot.holding_period_days / 365) * 100));

                  return (
                    <tr key={lot.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-100 font-sans">{lot.symbol}</div>
                        <div className="text-[10px] text-slate-500">{lot.id}</div>
                      </td>

                      <td className="py-3 px-4 text-slate-300">{lot.acquisition_date}</td>

                      <td className="py-3 px-4">
                        <span className="text-slate-200">{lot.broker}</span>
                        <div className="text-[10px] text-slate-500">{lot.account_id}</div>
                      </td>

                      <td className="py-3 px-4 text-right font-semibold text-slate-100">
                        {lot.remaining_quantity}
                        {lot.remaining_quantity < lot.quantity && (
                          <span className="text-[10px] text-slate-500 ml-1">/ {lot.quantity}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right text-slate-300">
                        {formatCurrency(lot.cost_basis_per_unit)}
                      </td>

                      <td className="py-3 px-4 text-right font-semibold text-slate-100">
                        {formatCurrency(lot.cost_basis)}
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-indigo-400 border border-slate-800">
                          {lot.accounting_method}
                        </span>
                      </td>

                      <td className="py-3 px-4 min-w-[130px]">
                        <div className="space-y-1">
                          <span className="text-slate-200 font-semibold text-xs">{lot.holding_period_days} days</span>
                          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                            <div
                              style={{ width: `${holdingProgress}%` }}
                              className={`h-full rounded-full ${
                                holdingProgress >= 100 ? "bg-emerald-400" : "bg-indigo-500"
                              }`}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                            lot.tax_classification === "LONG_TERM_CAPITAL_GAIN"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : lot.tax_classification === "CRYPTO_VDA_INCOME"
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {lot.tax_classification === "LONG_TERM_CAPITAL_GAIN"
                            ? "LTCG (12.5%)"
                            : lot.tax_classification === "CRYPTO_VDA_INCOME"
                            ? "VDA (30%)"
                            : "STCG (20%)"}
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
