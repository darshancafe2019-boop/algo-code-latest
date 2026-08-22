"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Info,
  Clock,
  ExternalLink,
  Layers,
} from "lucide-react";
import { CanonicalFuturesContract } from "@/types/futures-terminal";

interface Props {
  contracts: CanonicalFuturesContract[];
  selectedContract: CanonicalFuturesContract | null;
  onSelectContract: (contract: CanonicalFuturesContract) => void;
  isLoading: boolean;
}

type SortField =
  | "contract_name"
  | "last_price"
  | "mark_price"
  | "basis"
  | "annualized_basis_pct"
  | "funding_rate_pct"
  | "open_interest_usd"
  | "volume_24h"
  | "change_24h";

export function FuturesContractMasterTable({
  contracts,
  selectedContract,
  onSelectContract,
  isLoading,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [settlementFilter, setSettlementFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<SortField>("volume_24h");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const filteredContracts = useMemo(() => {
    return contracts
      .filter((c) => {
        const matchesSearch =
          searchTerm === "" ||
          c.contract_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.canonical_symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.exchange.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.quote_asset.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesSettlement =
          settlementFilter === "ALL" ||
          (settlementFilter === "USDT-M" && c.settlement_asset === "USDT_LINEAR") ||
          (settlementFilter === "USDC-M" && c.settlement_asset === "USDC_LINEAR") ||
          (settlementFilter === "COIN-M" && c.settlement_asset === "COIN_INVERSE");

        const matchesType =
          typeFilter === "ALL" ||
          (typeFilter === "PERPETUAL" && c.is_perpetual) ||
          (typeFilter === "DATED" && !c.is_perpetual);

        return matchesSearch && matchesSettlement && matchesType;
      })
      .sort((a, b) => {
        const valA = (a as any)[sortField] ?? 0;
        const valB = (b as any)[sortField] ?? 0;
        if (typeof valA === "string") {
          return sortDirection === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }
        return sortDirection === "asc" ? valA - valB : valB - valA;
      });
  }, [contracts, searchTerm, settlementFilter, typeFilter, sortField, sortDirection]);

  return (
    <div className="bg-[#0B101B] border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col font-mono text-xs select-none">
      {/* Header & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Futures Term Structure Master
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-blue-300 font-semibold">
              {filteredContracts.length} Unique Contracts
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Deduplicated venue order master • Live basis, funding rates, and open interest
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
            <input
              type="text"
              placeholder="Filter contract..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#131B2A] border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-36 sm:w-44 font-mono"
            />
          </div>

          {/* Settlement Switcher */}
          <div className="flex items-center bg-[#131B2A] p-0.5 rounded-lg border border-slate-800 text-[11px]">
            {["ALL", "USDT-M", "USDC-M", "COIN-M"].map((s) => (
              <button
                key={s}
                onClick={() => setSettlementFilter(s)}
                className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                  settlementFilter === s
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Contract Type Switcher */}
          <div className="flex items-center bg-[#131B2A] p-0.5 rounded-lg border border-slate-800 text-[11px]">
            {["ALL", "PERPETUAL", "DATED"].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                  typeFilter === t
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contract Table */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-[11px]">Synchronizing canonical contracts from exchange venues...</span>
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-xs">
          No matching futures contracts found. Try adjusting filters.
        </div>
      ) : (
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider bg-[#0d1424]">
                <th
                  onClick={() => handleSort("contract_name")}
                  className="py-2.5 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Contract / Venue</span>
                    <ArrowUpDown className="w-2.5 h-2.5 text-slate-500" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Type & Settlement</th>
                <th className="py-2.5 px-3">Expiry</th>
                <th
                  onClick={() => handleSort("last_price")}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Last</span>
                    <ArrowUpDown className="w-2.5 h-2.5 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("mark_price")}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                  title="Mark Price (Used for Risk and Liquidation)"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Mark</span>
                    <Info className="w-2.5 h-2.5 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("basis")}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                  title="Basis = Futures Price - Spot Index Price"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Basis ($ / %)</span>
                    <ArrowUpDown className="w-2.5 h-2.5 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("annualized_basis_pct")}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Annualized %</span>
                    <ArrowUpDown className="w-2.5 h-2.5 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("funding_rate_pct")}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Funding / Countdown</span>
                    <ArrowUpDown className="w-2.5 h-2.5 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("open_interest_usd")}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Open Interest</span>
                    <ArrowUpDown className="w-2.5 h-2.5 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("change_24h")}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>24H %</span>
                    <ArrowUpDown className="w-2.5 h-2.5 text-slate-500" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((c) => {
                const isSelected = selectedContract?.contract_id === c.contract_id;
                const isPositiveBasis = c.basis >= 0;
                const isPositiveFunding = c.funding_rate_pct >= 0;
                const isPositiveChange = c.change_24h >= 0;

                return (
                  <tr
                    key={c.contract_id}
                    onClick={() => onSelectContract(c)}
                    className={`border-b border-slate-800/60 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-950/40 border-l-2 border-l-blue-500 text-white"
                        : "hover:bg-slate-800/30 text-slate-300"
                    }`}
                  >
                    {/* Contract & Venue */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                            c.exchange === "BINANCE"
                              ? "bg-amber-950/40 text-amber-300 border-amber-500/30"
                              : c.exchange === "BYBIT"
                              ? "bg-orange-950/40 text-orange-300 border-orange-500/30"
                              : c.exchange === "OKX"
                              ? "bg-blue-950/40 text-blue-300 border-blue-500/30"
                              : "bg-purple-950/40 text-purple-300 border-purple-500/30"
                          }`}
                        >
                          {c.exchange}
                        </span>
                        <div>
                          <span className="font-bold text-white block">{c.display_symbol}</span>
                          <span className="text-[10px] text-slate-400">{c.contract_name}</span>
                        </div>
                      </div>
                    </td>

                    {/* Type & Settlement */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            c.is_perpetual
                              ? "bg-blue-950/50 text-blue-300 border border-blue-500/20"
                              : "bg-purple-950/50 text-purple-300 border border-purple-500/20"
                          }`}
                        >
                          {c.is_perpetual ? "PERP" : "DATED"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {c.settlement_asset.replace("_LINEAR", "-M").replace("_INVERSE", "-M")}
                        </span>
                      </div>
                    </td>

                    {/* Expiry */}
                    <td className="py-2.5 px-3 font-mono">
                      {c.is_perpetual ? (
                        <span className="text-slate-400 text-[11px]">Perpetual</span>
                      ) : (
                        <div>
                          <span className="text-slate-200 block text-[11px]">{c.expiry}</span>
                          <span className="text-[10px] text-amber-400">
                            {c.days_to_expiry.toFixed(0)}d left
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Last Price */}
                    <td className="py-2.5 px-3 text-right font-bold text-white font-mono">
                      ${(Number(c.last_price) || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>

                    {/* Mark Price */}
                    <td className="py-2.5 px-3 text-right text-slate-300 font-mono text-[11px]">
                      ${(Number(c.mark_price) || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>

                    {/* Basis ($ / %) */}
                    <td className="py-2.5 px-3 text-right font-mono text-[11px]">
                      <span className={isPositiveBasis ? "text-emerald-400" : "text-rose-400"}>
                        {isPositiveBasis ? `+$${(Number(c.basis) || 0).toFixed(2)}` : `-$${Math.abs(Number(c.basis) || 0).toFixed(2)}`}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {isPositiveBasis ? `+${(Number(c.basis_pct) || 0).toFixed(3)}%` : `${(Number(c.basis_pct) || 0).toFixed(3)}%`}
                      </span>
                    </td>

                    {/* Annualized Basis */}
                    <td className="py-2.5 px-3 text-right font-mono text-[11px]">
                      <span
                        className={
                          (Number(c.annualized_basis_pct) || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                        }
                      >
                        {(Number(c.annualized_basis_pct) || 0) >= 0
                          ? `+${(Number(c.annualized_basis_pct) || 0).toFixed(2)}%`
                          : `${(Number(c.annualized_basis_pct) || 0).toFixed(2)}%`}
                      </span>
                    </td>

                    {/* Funding / Countdown */}
                    <td className="py-2.5 px-3 text-right font-mono text-[11px]">
                      {c.is_perpetual ? (
                        <div>
                          <span
                            className={
                              isPositiveFunding ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"
                            }
                          >
                            {isPositiveFunding
                              ? `+${(Number(c.funding_rate_pct) || 0).toFixed(4)}%`
                              : `${(Number(c.funding_rate_pct) || 0).toFixed(4)}%`}
                          </span>
                          <span className="text-[10px] text-slate-400 block flex items-center justify-end gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {c.funding_countdown}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* Open Interest */}
                    <td className="py-2.5 px-3 text-right font-mono text-[11px]">
                      <span className="text-slate-200 block font-semibold">
                        ${((Number(c.open_interest_usd) || 0) / 1_000_000).toFixed(2)}M
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {(Number(c.open_interest) || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} {c.underlying}
                      </span>
                    </td>

                    {/* 24H Change */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span
                        className={`inline-flex items-center gap-0.5 ${
                          isPositiveChange ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isPositiveChange ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {isPositiveChange ? `+${c.change_24h.toFixed(2)}%` : `${c.change_24h.toFixed(2)}%`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
