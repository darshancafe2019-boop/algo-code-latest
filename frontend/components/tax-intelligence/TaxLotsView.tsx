"use client";

import React, { useState } from "react";
import { Layers, Search, Filter } from "lucide-react";
import { TaxLotItem } from "@/types/tax";

interface TaxLotsViewProps {
  lots: TaxLotItem[];
  currency: string;
}

export function TaxLotsView({ lots, currency }: TaxLotsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const formatCurrency = (val: number) => {
    const prefix = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : `${currency} `;
    return `${prefix}${val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const filtered = lots.filter(
    (l) =>
      l.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.broker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
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

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>{lots.length} Open Tax Lots Monitored</span>
        </div>
      </div>

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
                <th className="py-3 px-4 font-medium">Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((lot) => (
                <tr
                  key={lot.id}
                  className="hover:bg-slate-800/30 transition-colors duration-150"
                >
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-100 font-sans">
                      {lot.symbol}
                    </div>
                    <div className="text-[10px] text-slate-500">{lot.id}</div>
                  </td>

                  <td className="py-3 px-4 text-slate-300">
                    {lot.acquisition_date}
                  </td>

                  <td className="py-3 px-4">
                    <span className="text-slate-200">{lot.broker}</span>
                    <div className="text-[10px] text-slate-500">{lot.account_id}</div>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <span className="text-slate-100 font-semibold">
                      {lot.remaining_quantity}
                    </span>
                    {lot.remaining_quantity < lot.quantity && (
                      <span className="text-[10px] text-slate-500 ml-1">
                        / {lot.quantity}
                      </span>
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

                  <td className="py-3 px-4">
                    <span className="text-slate-200 font-semibold">
                      {lot.holding_period_days} days
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        lot.tax_classification === "LONG_TERM_CAPITAL_GAIN"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : lot.tax_classification === "CRYPTO_VDA_INCOME"
                          ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {lot.tax_classification === "LONG_TERM_CAPITAL_GAIN"
                        ? "LTCG"
                        : lot.tax_classification === "CRYPTO_VDA_INCOME"
                        ? "VDA (30%)"
                        : "STCG"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
