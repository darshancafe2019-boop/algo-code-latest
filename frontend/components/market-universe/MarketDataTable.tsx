"use client";

import React, { useState, useMemo } from "react";
import {
  Star,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  Bot,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MarketInstrument } from "@/types/market-universe";
import { formatNumber, formatPrice, formatPercent, formatVolume } from "@/lib/formatters";

type SortField = "symbol" | "exchange" | "type" | "last_price" | "change_pct" | "volume" | "market_cap";
type SortDirection = "asc" | "desc";

interface MarketDataTableProps {
  instruments: MarketInstrument[];
  selectedInstrument: MarketInstrument | null;
  onSelectInstrument: (inst: MarketInstrument) => void;
  watchlistSymbols: Set<string>;
  onToggleWatchlist: (inst: MarketInstrument) => void;
  onOpenChain: (inst: MarketInstrument) => void;
  onOpenBot: (inst: MarketInstrument) => void;
  onOpenTrade: (inst: MarketInstrument) => void;
  isLoading?: boolean;
}

export function MarketDataTable({
  instruments,
  selectedInstrument,
  onSelectInstrument,
  watchlistSymbols,
  onToggleWatchlist,
  onOpenChain,
  onOpenBot,
  onOpenTrade,
  isLoading,
}: MarketDataTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("volume");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  // Sort instruments
  const sortedInstruments = useMemo(() => {
    const list = [...instruments];
    list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (sortField) {
        case "symbol":
          valA = a.canonical_symbol || a.symbol || "";
          valB = b.canonical_symbol || b.symbol || "";
          return sortDirection === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case "exchange":
          valA = a.exchange || "";
          valB = b.exchange || "";
          return sortDirection === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case "type":
          valA = a.instrument_type || a.segment || "";
          valB = b.instrument_type || b.segment || "";
          return sortDirection === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case "last_price":
          valA = Number(a.last_price ?? 0);
          valB = Number(b.last_price ?? 0);
          break;
        case "change_pct":
          valA = Number(a.change_pct_24h ?? a.change_24h ?? 0);
          valB = Number(b.change_pct_24h ?? b.change_24h ?? 0);
          break;
        case "volume":
          valA = Number(a.volume_24h ?? 0);
          valB = Number(b.volume_24h ?? 0);
          break;
        case "market_cap":
          valA = Number(a.contract_size ?? 0) * Number(a.last_price ?? 0);
          valB = Number(b.contract_size ?? 0) * Number(b.last_price ?? 0);
          break;
        default:
          return 0;
      }

      return sortDirection === "asc" ? valA - valB : valB - valA;
    });
    return list;
  }, [instruments, sortField, sortDirection]);

  // Pagination calculation
  const totalItems = sortedInstruments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const currentItems = sortedInstruments.slice(startIndex, endIndex);

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedIds.size === currentItems.length && currentItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentItems.map((i) => i.instrument_id || i.symbol || "")));
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div className="w-full bg-[#071426] border border-[#15304A] rounded-lg flex flex-col justify-between overflow-hidden shadow-md min-h-[580px]">
      {/* ── Table Container with Sticky Header ────────────────────────────── */}
      <div className="overflow-x-auto overflow-y-auto max-h-[640px] custom-scrollbar flex-1">
        <table className="w-full text-left text-[11px] border-collapse">
          {/* Sticky Header */}
          <thead className="bg-[#09182B] text-[#91A7C1] text-[10px] font-mono uppercase font-bold sticky top-0 z-10 border-b border-[#15304A]">
            <tr className="h-[32px]">
              {/* 1. Row Selection */}
              <th className="w-8 px-2.5 text-center">
                <input
                  type="checkbox"
                  checked={currentItems.length > 0 && selectedIds.size === currentItems.length}
                  onChange={toggleSelectAll}
                  className="rounded border-[#15304A] bg-[#030B16] text-[#00C9E8] focus:ring-0 h-3 w-3 cursor-pointer"
                />
              </th>

              {/* 2. Favorite */}
              <th className="w-8 px-1.5 text-center">
                <Star className="h-3 w-3 text-[#91A7C1] mx-auto" />
              </th>

              {/* 3. Symbol */}
              <th
                onClick={() => handleSort("symbol")}
                className="px-3 py-1 cursor-pointer hover:text-[#EAF3FF] transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Symbol</span>
                  {sortField === "symbol" ? (
                    sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-[#00C9E8]" /> : <ArrowDown className="h-3 w-3 text-[#00C9E8]" />
                  ) : (
                    <ArrowUpDown className="h-2.5 w-2.5 opacity-40" />
                  )}
                </div>
              </th>

              {/* 4. Name */}
              <th className="px-3 py-1 hidden sm:table-cell">Name</th>

              {/* 5. Exchange */}
              <th
                onClick={() => handleSort("exchange")}
                className="px-2.5 py-1 cursor-pointer hover:text-[#EAF3FF] transition-colors text-center w-20"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Exchange</span>
                  {sortField === "exchange" && (sortDirection === "asc" ? <ArrowUp className="h-2.5 w-2.5 text-[#00C9E8]" /> : <ArrowDown className="h-2.5 w-2.5 text-[#00C9E8]" />)}
                </div>
              </th>

              {/* 6. Type */}
              <th
                onClick={() => handleSort("type")}
                className="px-2.5 py-1 cursor-pointer hover:text-[#EAF3FF] transition-colors text-center w-16"
              >
                <span>Type</span>
              </th>

              {/* 7. LTP */}
              <th
                onClick={() => handleSort("last_price")}
                className="px-3 py-1 text-right cursor-pointer hover:text-[#EAF3FF] transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>LTP</span>
                  {sortField === "last_price" && (sortDirection === "asc" ? <ArrowUp className="h-2.5 w-2.5 text-[#00C9E8]" /> : <ArrowDown className="h-2.5 w-2.5 text-[#00C9E8]" />)}
                </div>
              </th>

              {/* 8. Change % */}
              <th
                onClick={() => handleSort("change_pct")}
                className="px-3 py-1 text-right cursor-pointer hover:text-[#EAF3FF] transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Change %</span>
                  {sortField === "change_pct" && (sortDirection === "asc" ? <ArrowUp className="h-2.5 w-2.5 text-[#00C9E8]" /> : <ArrowDown className="h-2.5 w-2.5 text-[#00C9E8]" />)}
                </div>
              </th>

              {/* 9. Volume */}
              <th
                onClick={() => handleSort("volume")}
                className="px-3 py-1 text-right cursor-pointer hover:text-[#EAF3FF] transition-colors hidden md:table-cell"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Volume</span>
                  {sortField === "volume" && (sortDirection === "asc" ? <ArrowUp className="h-2.5 w-2.5 text-[#00C9E8]" /> : <ArrowDown className="h-2.5 w-2.5 text-[#00C9E8]" />)}
                </div>
              </th>

              {/* 10. Market Cap */}
              <th className="px-3 py-1 text-right hidden lg:table-cell">Market Cap</th>

              {/* 11. Status */}
              <th className="px-2.5 py-1 text-center w-20">Status</th>

              {/* 12. Actions */}
              <th className="px-3 py-1 text-center w-36">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-[#15304A]/60 font-sans">
            {isLoading ? (
              <tr>
                <td colSpan={12} className="py-16 text-center text-[#91A7C1] font-mono text-xs">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="h-6 w-6 border-2 border-[#00C9E8] border-t-transparent rounded-full animate-spin" />
                    <span>Streaming live instruments from catalog...</span>
                  </div>
                </td>
              </tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-16 text-center text-[#91A7C1] font-mono text-xs">
                  <span>No instruments found matching selected filters.</span>
                </td>
              </tr>
            ) : (
              currentItems.map((inst, idx) => {
                const id = inst.instrument_id || inst.symbol || String(idx);
                const sym = inst.canonical_symbol || inst.symbol || "UNKNOWN";
                const isSelectedRow = selectedInstrument?.symbol === inst.symbol || selectedInstrument?.instrument_id === inst.instrument_id;
                const isChecked = selectedIds.has(id);
                const isFavorite = watchlistSymbols.has(sym) || watchlistSymbols.has(inst.instrument_id || "");

                const price = Number(inst.last_price ?? 0);
                const changePct = Number(inst.change_pct_24h ?? inst.change_24h ?? 0);
                const isPositive = changePct >= 0;
                const volume = Number(inst.volume_24h ?? 0);
                const currencySym = inst.currency === "INR" || inst.exchange === "NSE" || inst.exchange === "BSE" ? "₹" : "$";
                const mcap = volume * price > 0 ? volume * price * 0.05 : (price * 1000000);

                const assetClass = (inst.asset_class || inst.segment || "EQUITY").toUpperCase();
                const instType = (inst.instrument_type || "SPOT").toUpperCase();

                return (
                  <tr
                    key={id}
                    onClick={() => onSelectInstrument(inst)}
                    className={cn(
                      "h-[34px] transition-colors cursor-pointer select-none",
                      isSelectedRow
                        ? "bg-[#0E223D] border-l-2 border-[#00C9E8]"
                        : idx % 2 === 0
                        ? "bg-[#071426] hover:bg-[#09182B]"
                        : "bg-[#071426]/70 hover:bg-[#09182B]"
                    )}
                  >
                    {/* 1. Selection Checkbox */}
                    <td className="px-2.5 text-center" onClick={(e) => toggleSelectRow(id, e)}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-[#15304A] bg-[#030B16] text-[#00C9E8] focus:ring-0 h-3 w-3 cursor-pointer"
                      />
                    </td>

                    {/* 2. Favorite Star */}
                    <td
                      className="px-1.5 text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWatchlist(inst);
                      }}
                    >
                      <button type="button" className="p-1 hover:scale-110 transition-transform">
                        <Star
                          className={cn(
                            "h-3.5 w-3.5 transition-colors",
                            isFavorite ? "text-[#F5B942] fill-[#F5B942]" : "text-[#91A7C1]/50 hover:text-[#F5B942]"
                          )}
                        />
                      </button>
                    </td>

                    {/* 3. Symbol */}
                    <td className="px-3 py-1 font-semibold text-[#EAF3FF] font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="hover:text-[#00C9E8] transition-colors">{sym}</span>
                        {inst.series && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-[#09182B] text-[#91A7C1] border border-[#15304A]">
                            {inst.series}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 4. Name */}
                    <td className="px-3 py-1 text-[#91A7C1] truncate max-w-[150px] hidden sm:table-cell">
                      {inst.company_name || inst.display_name || sym}
                    </td>

                    {/* 5. Exchange */}
                    <td className="px-2.5 py-1 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#09182B] text-[#EAF3FF] border border-[#15304A]">
                        {inst.exchange || "NSE"}
                      </span>
                    </td>

                    {/* 6. Type */}
                    <td className="px-2.5 py-1 text-center">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase",
                        instType.includes("OPT") ? "bg-[#A855F7]/15 text-[#A855F7] border border-[#A855F7]/30" :
                        instType.includes("FUT") ? "bg-[#F5B942]/15 text-[#F5B942] border border-[#F5B942]/30" :
                        "bg-[#0878FF]/15 text-[#0878FF] border border-[#0878FF]/30"
                      )}>
                        {instType}
                      </span>
                    </td>

                    {/* 7. LTP */}
                    <td className="px-3 py-1 text-right font-mono font-medium text-[#EAF3FF] tabular-nums">
                      {price > 0 ? (
                        <span>
                          {currencySym} {price > 0 && price < 1 ? Number(price || 0).toFixed(6) : formatNumber(price, 2)}
                        </span>
                      ) : (
                        <span className="text-[#91A7C1]/50">—</span>
                      )}
                    </td>

                    {/* 8. Change % */}
                    <td className={cn(
                      "px-3 py-1 text-right font-mono font-bold tabular-nums text-[11px]",
                      isPositive ? "text-[#00D6A0]" : "text-[#FF5268]"
                    )}>
                      {isPositive ? "+" : ""}{Number(changePct || 0).toFixed(2)}%
                    </td>

                    {/* 9. Volume */}
                    <td className="px-3 py-1 text-right font-mono text-[#91A7C1] tabular-nums hidden md:table-cell">
                      {volume > 0 ? formatVolume(volume) : "—"}
                    </td>

                    {/* 10. Market Cap */}
                    <td className="px-3 py-1 text-right font-mono text-[#91A7C1]/80 tabular-nums hidden lg:table-cell">
                      {currencySym} {formatVolume(mcap)}
                    </td>

                    {/* 11. Status */}
                    <td className="px-2.5 py-1 text-center">
                      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#00D6A0]/10 border border-[#00D6A0]/30 text-[#00D6A0]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#00D6A0] animate-pulse" />
                        <span>LIVE</span>
                      </div>
                    </td>

                    {/* 12. Actions */}
                    <td className="px-3 py-1 text-center">
                      <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* Chain */}
                        <button
                          type="button"
                          onClick={() => onOpenChain(inst)}
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#A855F7]/15 hover:bg-[#A855F7]/30 text-[#A855F7] border border-[#A855F7]/40 transition-colors"
                          title="Open Options Chain"
                        >
                          Chain
                        </button>

                        {/* Bot */}
                        <button
                          type="button"
                          onClick={() => onOpenBot(inst)}
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#00C9E8]/15 hover:bg-[#00C9E8]/30 text-[#00C9E8] border border-[#00C9E8]/40 transition-colors"
                          title="Create Algo Bot"
                        >
                          Bot
                        </button>

                        {/* Trade */}
                        <button
                          type="button"
                          onClick={() => onOpenTrade(inst)}
                          className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#0878FF] hover:bg-[#0665D8] text-white transition-colors flex items-center gap-0.5"
                          title="Execute Trade"
                        >
                          <span>Trade</span>
                          <ArrowUpRight className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Table Footer & Pagination ──────────────────────────────────────── */}
      <div className="bg-[#09182B] px-4 py-2 border-t border-[#15304A] flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-[#91A7C1]">
        {/* Left: Range Info */}
        <div>
          <span>
            Showing <span className="text-[#EAF3FF] font-semibold">{totalItems > 0 ? startIndex + 1 : 0}</span>–
            <span className="text-[#EAF3FF] font-semibold">{endIndex}</span> of{" "}
            <span className="text-[#00C9E8] font-bold">{totalItems.toLocaleString()}</span> instruments
          </span>
        </div>

        {/* Right: Rows per page & Pagination buttons */}
        <div className="flex items-center gap-3">
          {/* Rows per page selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">Rows:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-0.5 text-[10px] bg-[#030B16] border border-[#15304A] rounded text-[#EAF3FF] focus:outline-none focus:border-[#00C9E8]"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Page controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(1)}
              className="p-1 rounded bg-[#071426] hover:bg-[#15304A] border border-[#15304A] disabled:opacity-30 disabled:pointer-events-none text-[#EAF3FF]"
              title="First Page"
            >
              <ChevronsLeft className="h-3 w-3" />
            </button>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded bg-[#071426] hover:bg-[#15304A] border border-[#15304A] disabled:opacity-30 disabled:pointer-events-none text-[#EAF3FF]"
              title="Previous Page"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>

            <span className="px-2 text-[10px]">
              Page <span className="text-[#EAF3FF] font-bold">{currentPage}</span> of{" "}
              <span className="text-[#EAF3FF]">{totalPages}</span>
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded bg-[#071426] hover:bg-[#15304A] border border-[#15304A] disabled:opacity-30 disabled:pointer-events-none text-[#EAF3FF]"
              title="Next Page"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="p-1 rounded bg-[#071426] hover:bg-[#15304A] border border-[#15304A] disabled:opacity-30 disabled:pointer-events-none text-[#EAF3FF]"
              title="Last Page"
            >
              <ChevronsRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

