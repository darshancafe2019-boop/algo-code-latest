"use client";

import React from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Square,
  Trash2,
  X,
  CheckSquare,
} from "lucide-react";

interface MultiBotBulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkStart: () => void;
  onBulkPause: () => void;
  onBulkResume: () => void;
  onBulkStop: () => void;
  onBulkDelete: () => void;
}

export function MultiBotBulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkStart,
  onBulkPause,
  onBulkResume,
  onBulkStop,
  onBulkDelete,
}: MultiBotBulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-200 select-none font-sans">
      <div className="bg-[#0B132B]/95 border border-cyan-500/40 backdrop-blur-md rounded-2xl px-5 py-3 shadow-2xl shadow-cyan-950/50 flex flex-wrap items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-cyan-400" />
          <span className="text-white font-extrabold">{selectedCount} Bot{selectedCount > 1 ? "s" : ""} Selected</span>
        </div>

        <div className="h-4 w-px bg-slate-800 hidden sm:block" />

        <div className="flex items-center gap-2">
          {/* Start Selected */}
          <button
            type="button"
            onClick={onBulkStart}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>Start</span>
          </button>

          {/* Pause Selected */}
          <button
            type="button"
            onClick={onBulkPause}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Pause className="h-3 w-3 fill-current" />
            <span>Pause</span>
          </button>

          {/* Resume Selected */}
          <button
            type="button"
            onClick={onBulkResume}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Resume</span>
          </button>

          {/* Stop Selected */}
          <button
            type="button"
            onClick={onBulkStop}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-300 border border-slate-700 hover:border-rose-500/50 font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            <Square className="h-3 w-3 fill-current" />
            <span>Stop</span>
          </button>

          {/* Delete Selected (Destructive) */}
          <button
            type="button"
            onClick={onBulkDelete}
            className="px-3 py-1.5 rounded-xl bg-rose-600/25 hover:bg-rose-600 hover:text-white text-rose-300 border border-rose-500/50 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-rose-950"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Selected</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClearSelection}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
          title="Clear Selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
