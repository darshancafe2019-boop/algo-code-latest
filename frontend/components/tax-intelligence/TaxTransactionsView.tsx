"use client";

import React, { useState, memo } from "react";
import { formatMoney } from "@/lib/formatters";
import { ArrowDownLeft, ArrowUpRight, Search, FileSpreadsheet, ShieldAlert, Layers } from "lucide-react";
import { NormalizedTaxTransaction } from "@/lib/taxEngineService";

interface TaxTransactionsViewProps {
  transactions: NormalizedTaxTransaction[] | any[];
  currency: string;
  selectedBroker?: string;
}

export const TaxTransactionsView = memo(function TaxTransactionsView({
  transactions,
  currency,
  selectedBroker = "ALL",
}: TaxTransactionsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAsset, setFilterAsset] = useState("ALL");
  const [filterSide, setFilterSide] = useState<"ALL" | "BUY" | "SELL">("ALL");

  const formatCurrency = (val: number | null | undefined, placeholder = "₹0.00") => {
    if (val === null || val === undefined) return placeholder;
    const prefix = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : `${currency} `;
    return formatMoney(val, prefix);
  };

  const filtered = (transactions || []).filter((t: any) => {
    const symbol = t.symbol || "";
    const broker = t.broker || "";
    const id = t.id || t.transaction_id || "";
    const asset = (t.asset_class || "").toUpperCase();
    const side = (t.side || t.transaction_type || "").toUpperCase();

    const matchesSearch =
      symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      broker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBroker =
      selectedBroker === "ALL" || broker.toLowerCase() === selectedBroker.toLowerCase();

    const matchesAsset = filterAsset === "ALL" || asset === filterAsset;
    const matchesSide = filterSide === "ALL" || (filterSide === "BUY" && side.includes("BUY")) || (filterSide === "SELL" && side.includes("SELL"));

    return matchesSearch && matchesBroker && matchesAsset && matchesSide;
  });

  const totalGrossValue = filtered.reduce((acc, t) => acc + (t.gross_value || 0), 0);
  const totalFees = filtered.reduce((acc, t) => acc + (t.fees || t.commission || 0), 0);
  const totalTaxes = filtered.reduce((acc, t) => acc + (t.taxes_paid || t.transaction_taxes || 0), 0);
  const totalRealizedPnl = filtered.reduce((acc, t) => acc + (t.realized_pnl ?? t.realized_gain_loss ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* ── Summary Stats Bar ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 font-mono">
          <span className="text-[11px] text-slate-400 block font-sans">Filtered Gross Turnover</span>
          <span className="text-base font-bold text-slate-100">{formatCurrency(totalGrossValue)}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 font-mono">
          <span className="text-[11px] text-slate-400 block font-sans">Realized P&L from Sells</span>
          <span className={`text-base font-bold ${totalRealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {formatCurrency(totalRealizedPnl)}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 font-mono">
          <span className="text-[11px] text-slate-400 block font-sans">STT / Turnover Tax Paid</span>
          <span className="text-base font-bold text-indigo-400">{formatCurrency(totalTaxes)}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 font-mono">
          <span className="text-[11px] text-slate-400 block font-sans">Brokerage & Exchange Fees</span>
          <span className="text-base font-bold text-teal-400">{formatCurrency(totalFees)}</span>
        </div>
      </div>

      {/* ── Search & Filter Controls ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative w-full sm:w-60">
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

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(["ALL", "BUY", "SELL"] as const).map((side) => (
              <button
                key={side}
                onClick={() => setFilterSide(side)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono transition-colors ${
                  filterSide === side
                    ? "bg-indigo-600 text-white font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {side}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono shrink-0">
          <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
          <span>{filtered.length} Normalized Tax Events</span>
        </div>
      </div>

      {/* ── Transaction Table ──────────────────────────────────────────────────────── */}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-mono text-xs">
                    No transactions matching filter criteria. Buy/sell orders will be normalized here in real-time.
                  </td>
                </tr>
              ) : (
                filtered.map((t: any) => {
                  const isSell = (t.side || t.transaction_type || "").toUpperCase().includes("SELL");
                  const realized = t.realized_pnl ?? t.realized_gain_loss ?? null;
                  const estTax = t.estimated_tax ?? (realized && realized > 0 ? realized * 0.20 : 0);

                  return (
                    <tr key={t.id || t.transaction_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="text-slate-200">
                          {t.timestamp ? new Date(t.timestamp).toLocaleDateString() : t.trade_date || "—"}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                          {t.id || t.transaction_id}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-200">{t.broker}</span>
                        <div className="text-[10px] text-slate-500">{t.account_id}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              isSell
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            }`}
                          >
                            {isSell ? "SELL" : "BUY"}
                          </span>
                          <span className="font-bold text-slate-100 font-sans">{t.symbol}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Qty: {t.quantity} @ {formatCurrency(t.price)}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-semibold text-slate-100">
                        {formatCurrency(t.gross_value)}
                      </td>

                      <td className="py-3 px-4 text-right text-slate-400">
                        {formatCurrency(t.fees ?? t.commission)}
                      </td>

                      <td className="py-3 px-4 text-right text-indigo-300">
                        {formatCurrency(t.taxes_paid ?? t.transaction_taxes)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {realized !== null ? (
                          <span className={`font-bold ${realized >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {formatCurrency(realized)}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Open Lot</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-indigo-400 border border-slate-800">
                          {t.tax_classification === "SHORT_TERM_CAPITAL_GAIN"
                            ? "STCG (20%)"
                            : t.tax_classification === "LONG_TERM_CAPITAL_GAIN"
                            ? "LTCG (12.5%)"
                            : t.tax_classification === "CRYPTO_VDA_INCOME"
                            ? "VDA (30%)"
                            : "Derivatives (30%)"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right text-amber-400 font-semibold">
                        {estTax > 0 ? formatCurrency(estTax) : "₹0.00"}
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
