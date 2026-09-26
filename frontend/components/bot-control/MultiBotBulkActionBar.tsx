"use client";

import React from "react";
import { Play, Pause, RotateCcw, Square, Trash2, X, CheckSquare, Loader2 } from "lucide-react";

interface MultiBotBulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkStart: () => void;
  onBulkPause: () => void;
  onBulkResume: () => void;
  onBulkStop: () => void;
  onBulkDelete: () => void;
  isProcessing?: boolean;
  activeAction?: string | null;
}

export function MultiBotBulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkStart,
  onBulkPause,
  onBulkResume,
  onBulkStop,
  onBulkDelete,
  isProcessing = false,
  activeAction = null,
}: MultiBotBulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0B132B]/95 border border-slate-700/80 shadow-[0_10px_35px_rgba(0,0,0,0.8)] rounded-full px-4 py-2.5 backdrop-blur-xl flex items-center gap-2 sm:gap-3 text-xs font-mono select-none animate-in fade-in slide-in-from-bottom-5 duration-200">
      {/* Selection Pill */}
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/60 shadow-inner">
        <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
        <span className="font-bold text-slate-100">
          {selectedCount} {selectedCount === 1 ? "Bot" : "Bots"} Selected
        </span>
        <button
          type="button"
          onClick={onClearSelection}
          disabled={isProcessing}
          className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition ml-1 disabled:opacity-50 cursor-pointer"
          title="Clear Selection"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="h-4 w-px bg-slate-800 hidden sm:block" />

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Bulk Start */}
        <button
          type="button"
          onClick={onBulkStart}
          disabled={isProcessing}
          className="px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/90 hover:border-emerald-400 font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
          title="Start Selected Bots"
        >
          {isProcessing && activeAction === "BULK_START" ? (
            <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
          ) : (
            <Play className="w-3 h-3 fill-current" />
          )}
          <span>Start</span>
        </button>

        {/* Bulk Pause */}
        <button
          type="button"
          onClick={onBulkPause}
          disabled={isProcessing}
          className="px-3.5 py-1.5 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 hover:bg-amber-900/90 hover:border-amber-400 font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
          title="Pause Selected Bots"
        >
          {isProcessing && activeAction === "BULK_PAUSE" ? (
            <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
          ) : (
            <Pause className="w-3 h-3 fill-current" />
          )}
          <span>Pause</span>
        </button>

        {/* Bulk Resume */}
        <button
          type="button"
          onClick={onBulkResume}
          disabled={isProcessing}
          className="px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/90 hover:border-cyan-400 font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
          title="Resume Selected Bots"
        >
          {isProcessing && activeAction === "BULK_RESUME" ? (
            <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
          ) : (
            <RotateCcw className="w-3 h-3" />
          )}
          <span>Resume</span>
        </button>

        {/* Bulk Stop */}
        <button
          type="button"
          onClick={onBulkStop}
          disabled={isProcessing}
          className="px-3.5 py-1.5 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-300 hover:bg-rose-900/90 hover:border-rose-400 font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
          title="Stop Selected Bots"
        >
          {isProcessing && activeAction === "BULK_STOP" ? (
            <Loader2 className="w-3 h-3 animate-spin text-rose-400" />
          ) : (
            <Square className="w-3 h-3 fill-current" />
          )}
          <span>Stop</span>
        </button>

        <div className="h-4 w-px bg-slate-800 hidden sm:block" />

        {/* Bulk Delete */}
        <button
          type="button"
          onClick={onBulkDelete}
          disabled={isProcessing}
          className="px-3.5 py-1.5 rounded-full bg-rose-600/20 border border-rose-500 text-rose-300 hover:bg-rose-600/40 hover:text-white font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
          title="Delete Selected Bots"
        >
          {isProcessing && activeAction === "BULK_DELETE" ? (
            <Loader2 className="w-3 h-3 animate-spin text-rose-400" />
          ) : (
            <Trash2 className="w-3 h-3" />
          )}
          <span>Delete ({selectedCount})</span>
        </button>
      </div>
    </div>
  );
}

export default MultiBotBulkActionBar;
