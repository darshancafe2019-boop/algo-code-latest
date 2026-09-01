"use client";

import React from "react";
import { Play, Pause, RotateCcw, Square, Trash2, X, CheckSquare } from "lucide-react";

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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[var(--theme-surface)]/95 border border-[var(--theme-border)] shadow-2xl rounded-3xl p-3 sm:p-3.5 backdrop-blur-xl flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono select-none animate-in fade-in slide-in-from-bottom-5 duration-200">
      {/* Selection Pill */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)]">
        <CheckSquare className="w-3.5 h-3.5 text-[var(--theme-accent)]" />
        <span className="font-bold text-[var(--theme-text-primary)]">
          {selectedCount} {selectedCount === 1 ? "Bot" : "Bots"} Selected
        </span>
        <button
          onClick={onClearSelection}
          className="p-1 rounded-lg hover:bg-[var(--theme-surface)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] transition ml-1"
          title="Clear Selection"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="h-4 w-px bg-[var(--theme-border-subtle)] hidden sm:block" />

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Bulk Start */}
        <button
          onClick={onBulkStart}
          className="px-3 py-1.5 rounded-2xl bg-[var(--theme-profit)]/15 border border-[var(--theme-profit)]/40 text-[var(--theme-profit)] hover:bg-[var(--theme-profit)]/25 font-bold transition flex items-center gap-1.5 shadow-sm"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Start</span>
        </button>

        {/* Bulk Pause */}
        <button
          onClick={onBulkPause}
          className="px-3 py-1.5 rounded-2xl bg-[var(--theme-warning)]/15 border border-[var(--theme-warning)]/40 text-[var(--theme-warning)] hover:bg-[var(--theme-warning)]/25 font-bold transition flex items-center gap-1.5 shadow-sm"
        >
          <Pause className="w-3 h-3 fill-current" />
          <span>Pause</span>
        </button>

        {/* Bulk Resume */}
        <button
          onClick={onBulkResume}
          className="px-3 py-1.5 rounded-2xl bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/40 text-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/25 font-bold transition flex items-center gap-1.5 shadow-sm"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Resume</span>
        </button>

        {/* Bulk Stop */}
        <button
          onClick={onBulkStop}
          className="px-3 py-1.5 rounded-2xl bg-[var(--theme-loss)]/15 border border-[var(--theme-loss)]/40 text-[var(--theme-loss)] hover:bg-[var(--theme-loss)]/25 font-bold transition flex items-center gap-1.5 shadow-sm"
        >
          <Square className="w-3 h-3 fill-current" />
          <span>Stop</span>
        </button>

        <div className="h-4 w-px bg-[var(--theme-border-subtle)] hidden sm:block" />

        {/* Bulk Delete */}
        <button
          onClick={onBulkDelete}
          className="px-3 py-1.5 rounded-2xl bg-[var(--theme-loss)]/20 border border-[var(--theme-loss)] text-[var(--theme-loss)] hover:bg-[var(--theme-loss)]/30 font-bold transition flex items-center gap-1.5 shadow-sm"
        >
          <Trash2 className="w-3 h-3" />
          <span>Delete ({selectedCount})</span>
        </button>
      </div>
    </div>
  );
}
