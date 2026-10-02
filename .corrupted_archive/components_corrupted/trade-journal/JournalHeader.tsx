"use client";

import React from "react";
import {
  BookOpen,
  RefreshCw,
  Download,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Zap,
  Layers,
  Sparkles,
} from "lucide-react";

interface JournalHeaderProps {
  timeframe: string;
  onChangeTimeframe: (tf: string) => void;
  isRefreshing?: boolean;
  onRefresh: () => void;
  onOpenQuickReview: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  pendingReviewsCount: number;
}

export function JournalHeader({
  timeframe,
  onChangeTimeframe,
  isRefreshing,
  onRefresh,
  onOpenQuickReview,
  onExportCsv,
  onExportJson,
  isFullscreen,
  onToggleFullscreen,
  pendingReviewsCount,
}: JournalHeaderProps) {
  const timeframes = ["TODAY", "7D", "30D", "90D", "YTD", "1Y", "ALL"];

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl flex flex-wrap items-center justify-between gap-4 select-none font-sans">
      {/* Left: Branding & Subtitle */}
      <div className="flex items-center gap-3.5">
        <div className="p-3 rounded-2xl bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/30 text-[var(--theme-accent)] shadow-md shadow-[var(--theme-accent)]/10">
          <BookOpen className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--theme-text-primary)]">
              Trade Journal & Post-Trade Intelligence
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold font-mono bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border border-[var(--theme-accent)]/30">
              AUDITED HISTORICAL RECORD
            </span>
          </div>
          <p className="text-xs text-[var(--theme-text-secondary)] mt-0.5">
            Execution history • Strategy review • Behavioral intelligence • Post-trade forensics
          </p>
        </div>
      </div>

      {/* Right: Controls Strip */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Timeframe Pills */}
        <div className="flex items-center bg-[var(--theme-elevated)] p-1 rounded-xl border border-[var(--theme-border-subtle)] text-[11px] font-mono font-semibold">
          {timeframes.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => onChangeTimeframe(tf)}
              className={`px-2.5 py-1 rounded-lg transition ${
                timeframe === tf
                  ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] font-bold shadow-sm"
                  : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Quick Review Button with Badge */}
        <button
          type="button"
          onClick={onOpenQuickReview}
          className="px-3.5 py-2 rounded-xl bg-[var(--theme-accent)] hover:opacity-90 text-[var(--theme-bg)] font-bold text-xs shadow-md flex items-center gap-1.5 transition"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Quick Review</span>
          {pendingReviewsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-mono">
              {pendingReviewsCount}
            </span>
          )}
        </button>

        {/* Export Dropdown */}
        <div className="relative group">
          <button
            type="button"
            className="p-2 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] flex items-center gap-1 text-xs transition"
            title="Export Records"
          >
            <Download className="h-4 w-4" />
          </button>
          <div className="absolute right-0 mt-1 w-32 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl shadow-2xl py-1 hidden group-hover:block z-30 text-xs">
            <button
              onClick={onExportCsv}
              className="w-full text-left px-3 py-1.5 hover:bg-[var(--theme-elevated)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition"
            >
              Export as CSV
            </button>
            <button
              onClick={onExportJson}
              className="w-full text-left px-3 py-1.5 hover:bg-[var(--theme-elevated)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition"
            >
              Export as JSON
            </button>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] hover:text-[var(--theme-accent)] text-[var(--theme-text-secondary)] transition disabled:opacity-50"
          title="Refresh Journal"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-[var(--theme-accent)]" : ""}`} />
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="p-2 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] hover:text-[var(--theme-text-primary)] text-[var(--theme-text-secondary)] transition"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
