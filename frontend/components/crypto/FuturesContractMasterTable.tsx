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
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CanonicalFuturesContract } from "@/types/futures-terminal";
import { useUIStore } from "@/lib/store/useUIStore";

interface Props {
  contracts: CanonicalFuturesContract[];
  selectedContract: CanonicalFuturesContract | null;
  onSelectContract: (contract: CanonicalFuturesContract) => void;
  isLoading: boolean;
  onOpenDetails?: () => void;
}

type SortField =
  | "display_symbol"
  | "exchange"
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
  onOpenDetails,
}: Props) {
  const { interfaceMode } = useUIStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedColumns, setShowAdvancedColumns] = useState(false);

  // Filters
  const [selectedVenue, setSelectedVenue] = useState<string>("ALL");
  const [settlementFilter, setSettlementFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("volume_24h");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const isAdvancedView = interfaceMode === "ADVANCED" || showAdvancedColumns;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Unique venues list from contracts
  const venues = useMemo(() => {
    const vSet = new Set<string>(["ALL"]);
    contracts.forEach((c) => {
      if (c.exchange) vSet.add(c.exchange.toUpperCase());
    });
    return Array.from(vSet);
  }, [contracts]);

  // Robust Deduplicated filtering
  const filteredContracts = useMemo(() => {
    // Deduplication key: venue:symbol:settlement:type:expiry
    const seenMap = new Map<string, CanonicalFuturesContract>();

    contracts.forEach((c) => {
      const uniqueKey = `${c.exchange}:${c.display_symbol}:${c.settlement_asset}:${c.is_perpetual ? "PERP" : c.expiry}`;
      if (!seenMap.has(uniqueKey)) {
        seenMap.set(uniqueKey, c);
      }
    });

    const uniqueContracts = Array.from(seenMap.values());

    return uniqueContracts
      .filter((c) => {
        const matchesSearch =
          searchTerm === "" ||
          c.contract_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.canonical_symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.display_symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.exchange.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.quote_asset.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesVenue =
          selectedVenue === "ALL" ||
          c.exchange.toUpperCase() === selectedVenue.toUpperCase();

        const matchesSettlement =
          settlementFilter === "ALL" ||
          (settlementFilter === "USDT-M" && c.settlement_asset === "USDT_LINEAR") ||
          (settlementFilter === "USDC-M" && c.settlement_asset === "USDC_LINEAR") ||
          (settlementFilter === "COIN-M" && c.settlement_asset === "COIN_INVERSE");

        const matchesType =
          typeFilter === "ALL" ||
          (typeFilter === "PERPETUAL" && c.is_perpetual) ||
          (typeFilter === "DATED" && !c.is_perpetual);

        return matchesSearch && matchesVenue && matchesSettlement && matchesType;
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
  }, [contracts, searchTerm, selectedVenue, settlementFilter, typeFilter, sortField, sortDirection]);

  // Format OI
  const formatOI = (val: number) => {
    if (!val || isNaN(val)) return "$0.00";
    if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    return `$${(val / 1_000).toFixed(0)}K`;
  };

  return (
    <div className="bg-[#0B101B] border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col font-mono text-xs select-none">
      {/* Header & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            CONTRACTS
          </h2>
          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-blue-300 font-semibold">
            {filteredContracts.length} Available
          </span>
        </div>

        {/* Search, Filters Toggle & Table Settings */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
            <input
              type="text"
              placeholder="Search Contract..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#131B2A] border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-36 sm:w-44 font-mono"
            />
          </div>

          {/* Filters Dropdown Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
              showFilters || selectedVenue !== "ALL" || settlementFilter !== "ALL" || typeFilter !== "ALL"
                ? "bg-blue-600/15 border-blue-500/40 text-blue-300"
                : "bg-[#131B2A] hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Filters</span>
            {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Table Settings / Advanced Columns Toggle */}
          <button
            onClick={() => setShowAdvancedColumns(!showAdvancedColumns)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
              isAdvancedView
                ? "bg-purple-950/40 border-purple-500/30 text-purple-300"
                : "bg-[#131B2A] hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
            title="Toggle Advanced Columns"
          >
            <span>{isAdvancedView ? "Simple Columns" : "Advanced Columns"}</span>
          </button>
        </div>
      </div>

      {/* Expandable Filters Bar */}
      {showFilters && (
        <div className="p-3 my-2 bg-[#131B2A] rounded-xl border border-slate-800 flex flex-wrap items-center gap-4 text-xs">
          {/* Venue */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 uppercase">Venue:</span>
            <select
              value={selectedVenue}
              onChange={(e) => setSelectedVenue(e.target.value)}
              className="bg-[#0B101B] border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-slate-200 focus:outline-none"
            >
              {venues.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Settlement */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 uppercase">Settlement:</span>
            <div className="flex bg-[#0B101B] p-0.5 rounded-lg border border-slate-800">
              {["ALL", "USDT-M", "USDC-M", "COIN-M"].map((s) => (
                <button
                  key={s}
                  onClick={() => setSettlementFilter(s)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                    settlementFilter === s
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Contract Type */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 uppercase">Type:</span>
            <div className="flex bg-[#0B101B] p-0.5 rounded-lg border border-slate-800">
              {["ALL", "PERPETUAL", "DATED"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
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

          {/* Reset Filters */}
          <button
            onClick={() => {
              setSelectedVenue("ALL");
              setSettlementFilter("ALL");
              setTypeFilter("ALL");
              setSearchTerm("");
            }}
            className="text-[10px] text-slate-400 hover:text-slate-200 underline ml-auto"
          >
            Reset All
          </button>
        </div>
      )}

      {/* Contract Table */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-[11px]">Loading contracts from exchange venues...</span>
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
                {/* 1. Contract */}
                <th
                  onClick={() => handleSort("display_symbol")}
                  className="py-2.5 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>CONTRACT</span>
                    <ArrowUpDown className="w-2.5 h-2.5 text-slate-500" />
                  </div>
                </th>

                {/* 2. Venue */}
                <th
                  onClick={() => handleSort("exchange")}
                  className="py-2.5 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>VENUE</span>
                    <ArrowUpDown className="w-2.5 h-2.5 text-slate-500" />
                  </div>
                </th>

                {/* 3. Price */}
                <th
                  onClick={() => handleSort("last_price")}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>PRICE</span>
                    <ArrowUpDown className="w-2.5 h-2.5 text-slate-500" />
                  </div>
                </th>

                {/* 4. 24H */}
                <th
                  onClick={() => handleSort("change_24h")}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>24H</span>
                    <ArrowUpDown className="w-2.5 h-2.5 text-slate-500" />
                  </div>
                </th>

                {/* 5. Funding */}
                <th
                  onClick={() => handleSort("funding_rate_pct")}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>FUNDING</span>
                    <ArrowUpDown className="w-2.5 h-2.5 text-slate-500" />
                  </div>
                </th>

                {/* 6. Open Interest */}
                <th
                  onClick={() => handleSort("open_interest_usd")}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>OPEN INTEREST</span>
                    <ArrowUpDown className="w-2.5 h-2.5 text-slate-500" />
                  </div>
                </th>

                {/* ADVANCED COLUMNS (Visible in Advanced Mode or on Toggle) */}
                {isAdvancedView && (
                  <>
                    <th
                      onClick={() => handleSort("mark_price")}
                      className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>MARK</span>
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-500" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("basis")}
                      className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>BASIS</span>
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-500" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("annualized_basis_pct")}
                      className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>APR %</span>
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-500" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-right">TYPE</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((c) => {
                const isSelected = selectedContract?.contract_id === c.contract_id;
                const isPositiveChange = (c.change_24h || 0) >= 0;
                const isPositiveFunding = (c.funding_rate_pct || 0) >= 0;
                const isPositiveBasis = (c.basis || 0) >= 0;

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
                    {/* 1. Contract */}
                    <td className="py-2.5 px-3 font-bold text-white">
                      <div className="flex items-center gap-1.5">
                        <span>{c.display_symbol}</span>
                        {c.is_perpetual ? (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-blue-950/60 border border-blue-500/20 text-blue-300">
                            PERP
                          </span>
                        ) : (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-purple-950/60 border border-purple-500/20 text-purple-300">
                            {c.expiry}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 2. Venue */}
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
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
                    </td>

                    {/* 3. Price */}
                    <td className="py-2.5 px-3 text-right font-bold text-white font-mono">
                      ${(Number(c.last_price) || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>

                    {/* 4. 24H */}
                    <td className="py-2.5 px-3 text-right font-mono font-semibold">
                      <span
                        className={`inline-flex items-center gap-0.5 ${
                          isPositiveChange ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isPositiveChange ? `+${(c.change_24h || 0).toFixed(2)}%` : `${(c.change_24h || 0).toFixed(2)}%`}
                      </span>
                    </td>

                    {/* 5. Funding */}
                    <td className="py-2.5 px-3 text-right font-mono">
                      {c.is_perpetual ? (
                        <span
                          className={`font-semibold ${
                            isPositiveFunding ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {isPositiveFunding
                            ? `+${(Number(c.funding_rate_pct) || 0).toFixed(4)}%`
                            : `${(Number(c.funding_rate_pct) || 0).toFixed(4)}%`}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* 6. Open Interest */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-200 font-semibold">
                      {formatOI(Number(c.open_interest_usd) || 0)}
                    </td>

                    {/* ADVANCED COLUMNS */}
                    {isAdvancedView && (
                      <>
                        <td className="py-2.5 px-3 text-right text-slate-300 font-mono text-[11px]">
                          ${(Number(c.mark_price) || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[11px]">
                          <span className={isPositiveBasis ? "text-emerald-400" : "text-rose-400"}>
                            {isPositiveBasis ? `+$${(Number(c.basis) || 0).toFixed(1)}` : `-$${Math.abs(Number(c.basis) || 0).toFixed(1)}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[11px]">
                          <span className={(Number(c.annualized_basis_pct) || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                            {(Number(c.annualized_basis_pct) || 0).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[10px] text-slate-400">
                          {c.settlement_asset.replace("_LINEAR", "-M").replace("_INVERSE", "-M")}
                        </td>
                      </>
                    )}
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
