"use client";

import React, { useState, useMemo } from "react";
import {
  Layers,
  Search,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber, formatSignedMoney } from "@/lib/formatters";

export interface PositionRow {
  id: string;
  contract: string;
  exchange: string;
  direction: "LONG" | "SHORT";
  quantity: number;
  averageEntry: number;
  currentPrice: number;
  markPrice: number;
  stopLoss: number;
  target: number;
  margin: number;
  unrealizedPnl: number;
  realizedPnl: number;
  netPnl: number;
  status: "OPEN" | "CLOSED" | "PARTIAL";
  openedAt: string;
}

interface InstancePositionsTableProps {
  positions: PositionRow[];
  onClosePosition: (id: string) => void;
  currencySymbol?: string;
}

export function InstancePositionsTable({
  positions,
  onClosePosition,
  currencySymbol = "₹",
}: InstancePositionsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [directionFilter, setDirectionFilter] = useState<string>("ALL");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const filteredPositions = useMemo(() => {
    return positions.filter((p) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.contract.toLowerCase().includes(q) ||
        p.exchange.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q);

      const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
      const matchDirection = directionFilter === "ALL" || p.direction === directionFilter;

      return matchSearch && matchStatus && matchDirection;
    });
  }, [positions, search, statusFilter, directionFilter]);

  const handleExport = () => {
    const headers = ["ID", "Contract", "Exchange", "Direction", "Quantity", "Average Entry", "Current Price", "Unrealized PnL", "Realized PnL", "Net PnL", "Status"];
    const rows = filteredPositions.map((p) => [
      p.id,
      p.contract,
      p.exchange,
      p.direction,
      p.quantity,
      p.averageEntry,
      p.currentPrice,
      p.unrealizedPnl,
      p.realizedPnl,
      p.netPnl,
      p.status,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `positions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-4 space-y-3 font-sans select-none shadow-md">
      {/* Header & Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#1A2B43]/70 gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#00C9E8]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
            Positions Management Table
          </h3>
          <span className="text-[10px] font-mono text-[#00C9E8] bg-[#0878FF]/15 px-2 py-0.5 rounded border border-[#0878FF]/30">
            {filteredPositions.length} Positions
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          {/* Search */}
          <div className="relative min-w-[180px]">
            <Search className="h-3.5 w-3.5 text-[#91A7C1] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contract..."
              className="w-full pl-8 pr-6 py-1 bg-[#050B16] border border-[#1A2B43] rounded text-xs text-[#EAF3FF] placeholder-[#91A7C1]/60 focus:outline-none focus:border-[#00C9E8]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#91A7C1] hover:text-[#EAF3FF]"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Direction Filter */}
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
            className="bg-[#050B16] border border-[#1A2B43] rounded px-2 py-1 text-[#EAF3FF] text-xs focus:outline-none"
          >
            <option value="ALL">All Directions</option>
            <option value="LONG">Long</option>
            <option value="SHORT">Short</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#050B16] border border-[#1A2B43] rounded px-2 py-1 text-[#EAF3FF] text-xs focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#050B16] border border-[#1A2B43] hover:border-[#00C9E8]/40 text-[#91A7C1] hover:text-[#00C9E8] transition-colors cursor-pointer"
            title="Export CSV"
          >
            <Download className="h-3 w-3" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Full-Width Table */}
      <div className="overflow-x-auto rounded-[6px] border border-[#1A2B43] bg-[#050B16] custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse font-mono min-w-[1200px]">
          <thead>
            <tr className="bg-[#081321] text-[#91A7C1] border-b border-[#1A2B43] h-9 uppercase font-bold text-[10px]">
              <th className="px-3 py-1.5">Contract</th>
              <th className="px-2 py-1.5 text-center">Exchange</th>
              <th className="px-2 py-1.5 text-center">Direction</th>
              <th className="px-3 py-1.5 text-right">Quantity</th>
              <th className="px-3 py-1.5 text-right">Avg Entry</th>
              <th className="px-3 py-1.5 text-right">Current Price</th>
              <th className="px-3 py-1.5 text-right">Mark Price</th>
              <th className="px-3 py-1.5 text-center">Stop Loss</th>
              <th className="px-3 py-1.5 text-center">Target</th>
              <th className="px-3 py-1.5 text-right">Margin</th>
              <th className="px-3 py-1.5 text-right">Unrealized P&amp;L</th>
              <th className="px-3 py-1.5 text-right">Net P&amp;L</th>
              <th className="px-2 py-1.5 text-center">Status</th>
              <th className="px-3 py-1.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A2B43]/50">
            {filteredPositions.length === 0 ? (
              <tr>
                <td colSpan={14} className="text-center py-12 text-[#91A7C1]">
                  No open or closed positions match the search criteria.
                </td>
              </tr>
            ) : (
              filteredPositions.map((pos) => {
                const isLong = pos.direction === "LONG";
                const isExpanded = expandedRowId === pos.id;
                return (
                  <React.Fragment key={pos.id}>
                    <tr
                      onClick={() => setExpandedRowId(isExpanded ? null : pos.id)}
                      className="hover:bg-[#0D1D35]/50 transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-2 font-bold text-[#EAF3FF]">{pos.contract}</td>
                      <td className="px-2 py-2 text-center text-[#91A7C1]">{pos.exchange}</td>
                      <td className="px-2 py-2 text-center">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold border",
                            isLong
                              ? "bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/30"
                              : "bg-[#FF5268]/15 text-[#FF5268] border-[#FF5268]/30"
                          )}
                        >
                          {pos.direction}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-[#EAF3FF] font-semibold">
                        {pos.quantity} Lots
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-[#91A7C1]">
                        {currencySymbol}{formatNumber(pos.averageEntry, 2)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-bold text-[#00C9E8]">
                        {currencySymbol}{formatNumber(pos.currentPrice, 2)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-[#91A7C1]">
                        {currencySymbol}{formatNumber(pos.markPrice, 2)}
                      </td>
                      <td className="px-3 py-2 text-center text-[#FF5268] tabular-nums">
                        {currencySymbol}{formatNumber(pos.stopLoss, 2)}
                      </td>
                      <td className="px-3 py-2 text-center text-[#00D6A0] tabular-nums">
                        {currencySymbol}{formatNumber(pos.target, 2)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-[#EAF3FF]">
                        {currencySymbol}{formatNumber(pos.margin, 2)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-bold">
                        <span className={pos.unrealizedPnl >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]"}>
                          {formatSignedMoney(pos.unrealizedPnl, currencySymbol)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-bold">
                        <span className={pos.netPnl >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]"}>
                          {formatSignedMoney(pos.netPnl, currencySymbol)}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00D6A0]/10 text-[#00D6A0] border border-[#00D6A0]/30">
                          {pos.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onClosePosition(pos.id)}
                          className="px-2 py-1 rounded bg-[#FF5268]/15 hover:bg-[#FF5268]/25 text-[#FF5268] border border-[#FF5268]/30 font-bold transition-colors cursor-pointer text-[10px]"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-[#081321] text-[#91A7C1]">
                        <td colSpan={14} className="px-4 py-2.5 text-xs">
                          <div className="flex items-center justify-between text-[11px]">
                            <span>Position ID: <strong className="text-[#EAF3FF]">{pos.id}</strong></span>
                            <span>Opened At: <strong className="text-[#EAF3FF]">{pos.openedAt}</strong></span>
                            <span>Realized Ledger: <strong className="text-[#00D6A0]">{formatSignedMoney(pos.realizedPnl, currencySymbol)}</strong></span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

