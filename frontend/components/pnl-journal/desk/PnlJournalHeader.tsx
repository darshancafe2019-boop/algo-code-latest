"use client";

import React from "react";
import {
  RotateCcw,
  Download,
  ShieldCheck,
  Zap,
  DollarSign,
  IndianRupee,
  Layers,
  Sparkles,
} from "lucide-react";
import { PnlFilterState } from "@/types/pnl-journal";

interface PnlJournalHeaderProps {
  filters: PnlFilterState;
  onFilterChange: (updates: Partial<PnlFilterState>) => void;
  onRefresh: () => void;
  onOpenExporter: () => void;
  isLoading: boolean;
  lastUpdated?: string;
  engineVersion?: string;
}

export const PnlJournalHeader: React.FC<PnlJournalHeaderProps> = ({
  filters,
  onFilterChange,
  onRefresh,
  onOpenExporter,
  isLoading,
  lastUpdated,
  engineVersion = "2.5.0-FIFO",
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      {/* Title & Engine Metadata */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              P&L Journal & Accounting Desk
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
              {engineVersion}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              AUTHORITATIVE LEDGER
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Institutional multi-broker FIFO fill matching, statutory fee audit & tax intelligence
            {lastUpdated && (
              <span className="text-slate-500 ml-2 font-mono">
                • Synced: {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Currency Switcher */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => onFilterChange({ currency: "INR" })}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold font-mono transition-colors ${
              filters.currency === "INR"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <IndianRupee className="w-3 h-3" />
            INR
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ currency: "USD" })}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold font-mono transition-colors ${
              filters.currency === "USD"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <DollarSign className="w-3 h-3" />
            USD
          </button>
        </div>

        {/* Recalculate / Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
          {isLoading ? "Recalculating..." : "Recalculate FIFO"}
        </button>

        {/* Export Modal Launcher */}
        <button
          type="button"
          onClick={onOpenExporter}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-950/40 transition-all active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          Export Audit Report
        </button>
      </div>
    </div>
  );
};
