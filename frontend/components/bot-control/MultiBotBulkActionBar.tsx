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
  Bot,
  AlertOctagon,
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
    <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 animate-slideUp select-none font-sans">
      <div className="bg-[#0D1914] border border-[#39B978]/60 rounded-2xl px-5 py-3 shadow-2xl flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2 font-mono">
          <CheckSquare className="h-4 w-4 text-[#55C98A]" />
          <span className="text-white font-bold">{selectedCount} Bots Selected</span>
        </div>

        <div className="h-4 w-px bg-[#1B3328] hidden sm:block" />

        <div className="flex items-center gap-2">
          {/* Start Selected */}
          <button
            onClick={onBulkStart}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-md"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>Start</span>
          </button>

          {/* Pause Selected */}
          <button
            onClick={onBulkPause}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-md"
          >
            <Pause className="h-3 w-3 fill-current" />
            <span>Pause</span>
          </button>

          {/* Resume Selected */}
          <button
            onClick={onBulkResume}
            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-md"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Resume</span>
          </button>

          {/* Stop Selected */}
          <button
            onClick={onBulkStop}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1 transition-all"
          >
            <Square className="h-3 w-3" />
            <span>Stop</span>
          </button>

          {/* Delete Selected */}
          <button
            onClick={onBulkDelete}
            className="px-3 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-400 border border-red-800 font-bold text-xs flex items-center gap-1 transition-all"
          >
            <Trash2 className="h-3 w-3" />
            <span>Delete</span>
          </button>
        </div>

        <button
          onClick={onClearSelection}
          className="p-1 rounded-lg text-[#A8BDB0] hover:text-white hover:bg-[#123C2A] transition-colors ml-2"
          title="Clear Selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
