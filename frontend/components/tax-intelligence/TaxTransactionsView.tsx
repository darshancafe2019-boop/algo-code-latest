"use client";

import React, { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Search, FileSpreadsheet, ShieldAlert, Layers } from "lucide-react";
import { NormalizedTaxTransaction } from "@/lib/taxEngineService";

interface TaxTransactionsViewProps {
  transactions: NormalizedTaxTransaction[] | any[];
  currency: string;
  selectedBroker?: string;
}

export function TaxTransactionsView({
  transactions,
  currency,
  selectedBroker = "ALL",
}: TaxTransactionsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAsset, setFilterAsset] = useState("ALL");

  const formatCurrency = (val: number | null | undefined, placeholder = "N/A") => {
    if (val === null || val === undefined) return placeholder;
    const prefix = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : `${currency} `;
    return `${prefix}${Math.abs(val).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const filtered = (transactions || []).filter((t: any) => {
    const symbol = t.symbol || "";
    const broker = t.broker || "";
    const id = t.id || t.transaction_id || "";
    const asset = (t.asset_class || "").toUpperCase();

    const matchesSearch =
      symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      broker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBroker =
      selectedBroker === "ALL" || broker.toLowerCase() === selectedBroker.toLowerCase();

    const matchesAsset =
      filterAsset === "ALL" || asset === filterAsset;

    return matchesSearch && matchesBroker && matchesAsset;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search symbol, ID, broker..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 font-mono"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {["ALL", "EQUITY", "OPTIONS", "FUTURES", "CRYPTO"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterAsset(tab)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono transition-colors ${
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

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono shrink-0">
          <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
          <span>{filtered.length} Normalized Tax Events</span>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px]">
                <th className="py-3 px-4 font-medium">Timestamp / ID</th>
                <th className="py-3 px-4 font-medium">Broker</th>
                <th className="py-3 px-4 font-medium">Symbol / Side</th>
                <th className="py-3 px-4 font-medium text-right">Gross Value</th>
                <th className="py-3 px-4 font-medium text-right">Broker Fees</th>
                <th className="py-3 px-4 font-medium text-right">STT / Taxes</th>
                <th className="py-3 px-4 font-medium text-right">Realized Result</th>
                <th className="py-3 px-4 font-medium">Tax Classification</th>
                <th className="py-3 px-4 font-medium text-right">Est. Tax</th>
                <th className="py-3 px-4 font-medium">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 font-mono text-xs">
                    No matching taxable transactions found. New executed orders will appear automatically.
                  </td>
                </tr>
              ) : (
                filtered.map((tx: any) => {
                  const isBuy = tx.side === "BUY" || tx.transaction_type === "BUY";
                  const pnl = tx.realized_pnl ?? tx.realized_gain_loss ?? null;
                  const isGain = pnl !== null && pnl >= 0;

                  return (
                    <tr
                      key={tx.id || tx.transaction_id}
                      className="hover:bg-slate-800/30 transition-colors duration-150"
                    >
                      <td className="py-3 px-4">
                        <div className="text-slate-100 font-semibold">
                          {tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : tx.trade_date || "—"}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                          {tx.id || tx.transaction_id}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-200 font-semibold">{tx.broker}</span>
                        <div className="text-[10px] text-slate-500">{tx.account_id || "MAIN"}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-100 font-sans">
                            {tx.symbol}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                              isBuy
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {isBuy ? "BUY" : "SELL"}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase">
                          {tx.asset_class || "equity"}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right text-slate-200 font-semibold">
                        {formatCurrency(tx.gross_value ?? tx.total_consideration)}
                      </td>

                      <td className="py-3 px-4 text-right text-slate-400">
                        {formatCurrency(tx.fees ?? tx.brokerage_fee, "₹0.00")}
                      </td>

                      <td className="py-3 px-4 text-right text-slate-400">
                        {formatCurrency(tx.taxes_paid ?? tx.stt_paid, "₹0.00")}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {pnl === null ? (
                          <span className="text-slate-500 font-mono">Open Lot</span>
                        ) : (
                          <div className={`font-bold ${isGain ? "text-emerald-400" : "text-rose-400"}`}>
                            {isGain ? "+" : "-"}
                            {formatCurrency(Math.abs(pnl))}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700 whitespace-nowrap">
                          {(tx.tax_classification || tx.classification || "UNCLASSIFIED").replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {tx.estimated_tax !== null && tx.estimated_tax !== undefined ? (
                          <span className="text-amber-400 font-bold">
                            {formatCurrency(tx.estimated_tax)}
                          </span>
                        ) : (
                          <span className="text-slate-500">N/A</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 whitespace-nowrap">
                          {tx.source || `Source: ${tx.broker}`}
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
}
