"use client";

import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  Activity,
  Layers,
  Calendar,
  Zap,
  ArrowRight,
  Info,
} from "lucide-react";
import { formatPrice, formatPercent, formatVolume } from "@/lib/formatters";
import { CanonicalFuturesContract } from "../types/futures";

interface FuturesTermStructureViewProps {
  contracts: CanonicalFuturesContract[];
  onSelectContract?: (contract: CanonicalFuturesContract) => void;
}

export function FuturesTermStructureView({ contracts, onSelectContract }: FuturesTermStructureViewProps) {
  const [selectedUnderlying, setSelectedUnderlying] = useState<string>("BTC");

  // Group contracts by underlying
  const availableUnderlyings = useMemo(() => {
    const set = new Set<string>();
    contracts.forEach((c) => {
      if (c.underlying) set.add(c.underlying.toUpperCase());
    });
    return Array.from(set).sort();
  }, [contracts]);

  const activeContracts = useMemo(() => {
    return contracts
      .filter((c) => (c.underlying || "").toUpperCase() === selectedUnderlying)
      .sort((a, b) => {
        if (!a.expiry_date) return -1;
        if (!b.expiry_date) return 1;
        return a.expiry_date.localeCompare(b.expiry_date);
      });
  }, [contracts, selectedUnderlying]);

  const spotOrIndexPrice = activeContracts[0]?.index_price || activeContracts[0]?.mark_price || null;

  return (
    <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl font-mono text-xs select-none space-y-4">
      {/* 1. Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="font-bold text-white text-sm">FUTURES TERM STRUCTURE (EXPIRY CURVE)</h3>
            <p className="text-[11px] text-slate-400">Cash-and-carry basis and annualized yield across maturity horizons</p>
          </div>
        </div>

        {/* Underlying Selector Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {availableUnderlyings.map((und) => (
            <button
              key={und}
              onClick={() => setSelectedUnderlying(und)}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs border ${
                selectedUnderlying === und
                  ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20"
                  : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
              }`}
            >
              {und}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Spot / Reference Price Bar */}
      {spotOrIndexPrice != null && (
        <div className="flex items-center justify-between p-3 bg-slate-900/80 rounded-xl border border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-xs uppercase font-bold">REFERENCE SPOT / INDEX:</span>
            <span className="text-cyan-300 font-extrabold text-sm">{formatPrice(spotOrIndexPrice)}</span>
          </div>
          <span className="text-[11px] text-slate-500">
            {activeContracts.length} Maturity Tiers Listed
          </span>
        </div>
      )}

      {/* 3. Term Structure Expiry Table */}
      <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/40">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#0A1020] border-b border-slate-800 text-[11.5px] font-bold text-slate-400 uppercase">
            <tr>
              <th className="py-2.5 px-4">Contract</th>
              <th className="py-2.5 px-4 text-center">Type</th>
              <th className="py-2.5 px-4 text-center">Expiry</th>
              <th className="py-2.5 px-4 text-right">Futures Price</th>
              <th className="py-2.5 px-4 text-right">Raw Basis</th>
              <th className="py-2.5 px-4 text-right">Basis %</th>
              <th className="py-2.5 px-4 text-right">Annualized Yield</th>
              <th className="py-2.5 px-4 text-right">OI</th>
              <th className="py-2.5 px-4 text-center">Provider</th>
              <th className="py-2.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {activeContracts.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-600 text-xs">
                  No contracts found for {selectedUnderlying}.
                </td>
              </tr>
            ) : (
              activeContracts.map((c) => {
                const basis = c.basis?.basis_absolute ?? (c.last_price && spotOrIndexPrice ? c.last_price - spotOrIndexPrice : null);
                const basisPct = c.basis?.basis_percentage ?? (basis && spotOrIndexPrice ? (basis / spotOrIndexPrice) * 100 : null);
                const annYield = c.basis?.annualized_basis ?? null;
                const isContango = (basis ?? 0) >= 0;

                return (
                  <tr key={c.symbol} className="hover:bg-slate-900/60 transition text-xs font-mono">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <span>{c.displayName || c.symbol}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {c.contract_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-300">
                      {c.expiry_date || "PERPETUAL"}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-100">
                      {c.last_price != null ? formatPrice(c.last_price) : "—"}
                    </td>
                    <td className={`py-3 px-4 text-right font-bold ${isContango ? "text-emerald-400" : "text-rose-400"}`}>
                      {basis != null ? `${basis >= 0 ? "+" : ""}${formatPrice(basis)}` : "—"}
                    </td>
                    <td className={`py-3 px-4 text-right font-bold ${isContango ? "text-emerald-400" : "text-rose-400"}`}>
                      {basisPct != null ? `${basisPct >= 0 ? "+" : ""}${basisPct.toFixed(2)}%` : "—"}
                    </td>
                    <td className="py-3 px-4 text-right text-cyan-300 font-bold">
                      {annYield != null ? `${annYield.toFixed(2)}%` : "—"}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      {c.open_interest_usd != null ? formatVolume(c.open_interest_usd) : "—"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {c.market_data_provider || c.provider}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectContract?.(c)}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
