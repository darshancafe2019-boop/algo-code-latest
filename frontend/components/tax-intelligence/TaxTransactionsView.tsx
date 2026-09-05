"use client";

import React, { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Search, FileSpreadsheet } from "lucide-react";
import { TaxTransactionItem } from "@/types/tax";

interface TaxTransactionsViewProps {
  transactions: TaxTransactionItem[];
  currency: string;
}

export function TaxTransactionsView({
  transactions,
  currency,
}: TaxTransactionsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const formatCurrency = (val: number) => {
    const prefix = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : `${currency} `;
    return `${prefix}${Math.abs(val).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const filtered = transactions.filter(
    (t) =>
      t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.broker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.transaction_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm backdrop-blur-md">
        <div className="relative flex-1 sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search transaction ID, symbol, broker..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
          <span>Statutory Tax & Fee Ledger Separated</span>
        </div>
      </div>

      <div className="rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px]">
                <th className="py-3 px-4 font-medium">Date / ID</th>
                <th className="py-3 px-4 font-medium">Broker</th>
                <th className="py-3 px-4 font-medium">Symbol / Type</th>
                <th className="py-3 px-4 font-medium text-right">Gross Value</th>
                <th className="py-3 px-4 font-medium text-right">Broker Fees</th>
                <th className="py-3 px-4 font-medium text-right">STT / Tx Taxes</th>
                <th className="py-3 px-4 font-medium text-right">Withholding</th>
                <th className="py-3 px-4 font-medium text-right">Realized Result</th>
                <th className="py-3 px-4 font-medium">Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((tx) => {
                const isBuy = tx.transaction_type === "BUY";
                const isGain = tx.realized_gain_loss >= 0;

                return (
                  <tr
                    key={tx.transaction_id}
                    className="hover:bg-slate-800/30 transition-colors duration-150"
                  >
                    <td className="py-3 px-4">
                      <div className="text-slate-100 font-semibold">
                        {tx.trade_date}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {tx.transaction_id}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-slate-200">{tx.broker}</span>
                      <div className="text-[10px] text-slate-500">
                        {tx.account_id}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-100 font-sans">
                          {tx.symbol}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                            isBuy
                              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {tx.transaction_type}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {tx.quantity} @ {formatCurrency(tx.price)}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-semibold text-slate-100">
                      {formatCurrency(tx.gross_value)}
                    </td>

                    <td className="py-3 px-4 text-right text-slate-400">
                      {formatCurrency(tx.commission + tx.exchange_fees)}
                    </td>

                    <td className="py-3 px-4 text-right text-indigo-400 font-semibold">
                      {formatCurrency(tx.transaction_taxes)}
                    </td>

                    <td className="py-3 px-4 text-right text-teal-400">
                      {tx.withholding_tax > 0
                        ? formatCurrency(tx.withholding_tax)
                        : "—"}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {tx.transaction_type !== "BUY" ? (
                        <span
                          className={`font-semibold ${
                            isGain ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {isGain ? "+" : "-"}
                          {formatCurrency(tx.realized_gain_loss)}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                        {tx.income_classification}
                      </span>
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
