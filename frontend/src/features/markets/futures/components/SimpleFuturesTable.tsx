"use client";

import React, { useMemo } from "react";
import { CanonicalFuturesContract } from "../types/futures";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
} from "lucide-react";

interface SimpleFuturesTableProps {
  contracts: CanonicalFuturesContract[];
  isLoading: boolean;
  selectedContractKey?: string | null;
  onSelectContract: (contract: CanonicalFuturesContract) => void;
  onTrade?: (e: React.MouseEvent, contract: CanonicalFuturesContract, side: "BUY" | "SELL") => void;
}

function formatPrice(val: number | null | undefined, currency: string = "$"): string {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return `${currency}${val.toLocaleString(undefined, {
    minimumFractionDigits: val >= 100 ? 2 : 4,
    maximumFractionDigits: val >= 100 ? 2 : 4,
  })}`;
}

function formatVolume(val: number | null | undefined, currency: string = "$"): string {
  if (val === null || val === undefined || isNaN(val) || val === 0) return "—";
  if (currency === "₹") {
    if (val >= 10_000_000) return `₹${(val / 10_000_000).toFixed(2)}Cr`;
    if (val >= 100_000) return `₹${(val / 100_000).toFixed(1)}L`;
  }
  if (val >= 1e9) return `${currency}${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `${currency}${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `${currency}${(val / 1e3).toFixed(0)}K`;
  return `${currency}${val.toLocaleString()}`;
}

export function SimpleFuturesTable({
  contracts,
  isLoading,
  selectedContractKey,
  onSelectContract,
  onTrade,
}: SimpleFuturesTableProps) {
  if (isLoading && contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#080E1C] border border-slate-800 rounded-2xl font-mono text-xs text-slate-400">
        <Activity className="w-6 h-6 animate-spin text-cyan-400 mb-2.5" />
        <p>Connecting to live futures market data feeds...</p>
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="p-12 text-center bg-[#080E1C] border border-slate-800 rounded-2xl font-mono text-xs text-slate-500 space-y-1">
        <div className="font-bold text-slate-400">No contracts found</div>
        <p>Try searching for a different symbol (e.g. BTC, ETH, NIFTY) or adjust your source filter.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#080E1C] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-mono text-xs select-none">
      {/* Desktop & Tablet Table */}
      <div className="hidden sm:block overflow-x-auto max-h-[680px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        <table className="w-full border-collapse">
          {/* Table Header */}
          <thead className="sticky top-0 z-20 bg-[#0C1428] border-b border-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <tr>
              <th className="p-3 text-left">CONTRACT</th>
              <th className="p-3 text-right">PRICE</th>
              <th className="p-3 text-right">24H</th>
              <th className="p-3 text-right">FUNDING</th>
              <th className="p-3 text-right">VOLUME</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800/60">
            {contracts.map((c) => {
              const isSelected = selectedContractKey === c.instrument_key || selectedContractKey === c.symbol;
              const isIndian = c.exchange === "NSE" || c.exchange === "MCX";
              const currency = isIndian ? "₹" : "$";

              const changePct = c.change_24h_pct ?? 0;
              const isPositive = changePct >= 0;

              // Funding rate
              const fundingApr =
                c.funding_rate?.funding_rate_annualized ??
                (c.funding_rate?.funding_rate_8h != null ? c.funding_rate.funding_rate_8h * 3 * 365 * 100 : null);

              const typeBadge =
                c.contract_type === "PERPETUAL"
                  ? "Perpetual"
                  : c.contract_type === "INDEX_FUTURES"
                  ? "Index Fut"
                  : c.contract_type === "COMMODITY_FUTURES"
                  ? "Commodity"
                  : "Futures";

              return (
                <tr
                  key={c.instrument_key || c.symbol}
                  onClick={() => onSelectContract(c)}
                  className={`cursor-pointer transition-colors group ${
                    isSelected
                      ? "bg-cyan-500/15 ring-1 ring-cyan-500/40"
                      : "hover:bg-slate-850 hover:bg-slate-800/50"
                  }`}
                >
                  {/* CONTRACT */}
                  <td className="p-3 text-left">
                    <div className="flex items-center gap-2.5">
                      <div>
                        <div className="font-bold text-white text-xs group-hover:text-cyan-300 transition flex items-center gap-1.5">
                          <span>{c.displayName || c.symbol}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-semibold">
                            {typeBadge}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {c.market_data_provider || c.provider || c.venue} • {c.underlying}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* PRICE */}
                  <td className="p-3 text-right font-bold text-white text-xs">
                    {c.last_price != null ? (
                      formatPrice(c.last_price, currency)
                    ) : (
                      <span className="text-slate-500 font-normal">N/A</span>
                    )}
                  </td>

                  {/* 24H CHANGE */}
                  <td className="p-3 text-right">
                    <span
                      className={`font-bold inline-flex items-center gap-0.5 ${
                        isPositive ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {changePct.toFixed(2)}%
                    </span>
                  </td>

                  {/* FUNDING */}
                  <td className="p-3 text-right text-slate-300">
                    {fundingApr != null ? (
                      <span
                        className={`font-semibold ${
                          fundingApr >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {fundingApr >= 0 ? "+" : ""}
                        {fundingApr.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* VOLUME */}
                  <td className="p-3 text-right text-slate-300 font-semibold">
                    {formatVolume(c.volume_24h_usd, currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile High-Density Cards View (<640px) */}
      <div className="block sm:hidden divide-y divide-slate-800">
        {contracts.map((c) => {
          const isSelected = selectedContractKey === c.instrument_key || selectedContractKey === c.symbol;
          const isIndian = c.exchange === "NSE" || c.exchange === "MCX";
          const currency = isIndian ? "₹" : "$";
          const changePct = c.change_24h_pct ?? 0;
          const isPositive = changePct >= 0;
          const fundingApr =
            c.funding_rate?.funding_rate_annualized ??
            (c.funding_rate?.funding_rate_8h != null ? c.funding_rate.funding_rate_8h * 3 * 365 * 100 : null);

          return (
            <div
              key={c.instrument_key || c.symbol}
              onClick={() => onSelectContract(c)}
              className={`p-3 space-y-2 cursor-pointer transition ${
                isSelected ? "bg-cyan-500/15" : "hover:bg-slate-850 active:bg-slate-800"
              }`}
            >
              {/* Top: Symbol + Price */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-white text-xs">{c.displayName || c.symbol}</div>
                  <div className="text-[10px] text-slate-500">
                    {c.contract_type} • {c.market_data_provider || c.provider}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white text-xs">
                    {c.last_price != null ? formatPrice(c.last_price, currency) : "N/A"}
                  </div>
                  <div className={`text-[10px] font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                    {isPositive ? "+" : ""}
                    {changePct.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Bottom: Funding & Volume */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/50">
                <div>
                  Funding:{" "}
                  {fundingApr != null ? (
                    <strong className="text-emerald-400 font-bold">
                      {fundingApr >= 0 ? "+" : ""}
                      {fundingApr.toFixed(2)}%
                    </strong>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </div>
                <div>
                  Volume: <strong className="text-slate-200">{formatVolume(c.volume_24h_usd, currency)}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
