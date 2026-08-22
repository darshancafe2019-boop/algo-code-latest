"use client";

import React from "react";
import { 
  Search, 
  Filter, 
  X, 
  CheckCheck, 
  CheckCircle2, 
  Archive, 
  Clock, 
  SlidersHorizontal,
  ChevronDown
} from "lucide-react";
import { IncidentSeverity, IncidentStatus } from "@/types/alerts";

interface AlertFiltersToolbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: IncidentStatus;
  setStatusFilter: (s: IncidentStatus) => void;
  severityFilter: IncidentSeverity;
  setSeverityFilter: (s: IncidentSeverity) => void;
  categoryFilter: string;
  setCategoryFilter: (c: string) => void;
  timeframe: string;
  setTimeframe: (t: string) => void;
  selectedCount: number;
  onBulkAcknowledge: () => void;
  onBulkResolve: () => void;
  onBulkArchive: () => void;
  onClearSelection: () => void;
  categories: string[];
}

export function AlertFiltersToolbar({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  severityFilter,
  setSeverityFilter,
  categoryFilter,
  setCategoryFilter,
  timeframe,
  setTimeframe,
  selectedCount,
  onBulkAcknowledge,
  onBulkResolve,
  onBulkArchive,
  onClearSelection,
  categories
}: AlertFiltersToolbarProps) {
  const isFiltered = searchQuery !== "" || statusFilter !== "ACTIVE" || severityFilter !== "ALL" || categoryFilter !== "ALL" || timeframe !== "ALL";

  return (
    <div className="space-y-2.5 bg-[#0F172A]/80 border border-slate-800/80 p-3.5 rounded-2xl backdrop-blur-sm shadow-lg">
      {/* Top Row: Search + Filter Selectors */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by incident ID, summary, bot, symbol, or error code..."
            className="w-full pl-9 pr-8 py-2 bg-[#080D1A] border border-slate-800 focus:border-cyan-500/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-colors font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdowns Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Select */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as IncidentStatus)}
              className="bg-[#080D1A] border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 pr-7 focus:outline-none focus:border-cyan-500/60 appearance-none transition-colors font-medium cursor-pointer"
            >
              <option value="ACTIVE">Active Incidents</option>
              <option value="ALL">All Statuses</option>
              <option value="NEW">New (Unack)</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="RESOLVED">Resolved</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Severity Select */}
          <div className="relative">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as IncidentSeverity)}
              className="bg-[#080D1A] border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 pr-7 focus:outline-none focus:border-cyan-500/60 appearance-none transition-colors font-medium cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="ERROR">Error</option>
              <option value="WARNING">Warning</option>
              <option value="NOTICE">Notice</option>
              <option value="INFO">Info</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Category Select */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#080D1A] border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 pr-7 focus:outline-none focus:border-cyan-500/60 appearance-none transition-colors font-medium cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ACTIVE");
                setSeverityFilter("ALL");
                setCategoryFilter("ALL");
                setTimeframe("ALL");
              }}
              className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition-colors flex items-center gap-1 shrink-0 font-medium"
              title="Reset all filters"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Timeframe Pills & Bulk Selection Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs font-mono">
        {/* Timeframe Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-[11px] flex items-center gap-1 mr-1">
            <Clock className="w-3 h-3 text-slate-400" />
            Window:
          </span>
          {["1H", "6H", "24H", "7D", "ALL"].map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-2 py-0.5 rounded-lg text-[11px] transition-colors ${
                timeframe === t
                  ? "bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-bold"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {t === "ALL" ? "All Time" : t}
            </button>
          ))}
        </div>

        {/* Bulk Action Context Bar (Shown when items are checked) */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 bg-slate-900/90 border border-cyan-500/40 px-3 py-1 rounded-xl animate-fade-in shadow-md">
            <span className="text-cyan-300 font-bold text-xs">
              {selectedCount} Selected
            </span>
            <div className="h-3 w-px bg-slate-700" />
            <button
              onClick={onBulkAcknowledge}
              className="text-slate-300 hover:text-emerald-300 flex items-center gap-1 text-[11px] transition-colors"
            >
              <CheckCheck className="w-3 h-3 text-emerald-400" />
              Acknowledge
            </button>
            <button
              onClick={onBulkResolve}
              className="text-slate-300 hover:text-cyan-300 flex items-center gap-1 text-[11px] transition-colors"
            >
              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
              Resolve
            </button>
            <button
              onClick={onBulkArchive}
              className="text-slate-300 hover:text-purple-300 flex items-center gap-1 text-[11px] transition-colors"
            >
              <Archive className="w-3 h-3 text-purple-400" />
              Archive
            </button>
            <button
              onClick={onClearSelection}
              className="text-slate-500 hover:text-slate-300 ml-1 text-[11px]"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
