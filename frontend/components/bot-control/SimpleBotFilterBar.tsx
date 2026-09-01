"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Filter,
  ChevronDown,
  Check,
  Table,
  LayoutGrid,
  PieChart,
  Download,
  FileSpreadsheet,
  FileCode,
} from "lucide-react";
import { BotViewMode } from "@/types/bot-control";

interface SimpleBotFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  selectedMarket: string;
  onSelectMarket: (market: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  envFilter: string;
  onEnvFilterChange: (env: string) => void;
  showingCount: number;
  totalCount: number;
  viewMode: BotViewMode;
  onViewModeChange: (mode: BotViewMode) => void;
  onExportCsv?: () => void;
  onExportJson?: () => void;
}

const PRIMARY_MARKETS = [
  { id: "ALL", label: "All Markets" },
  { id: "CRYPTO", label: "Crypto" },
  { id: "INDIAN_STOCKS", label: "India NSE" },
  { id: "FUTURES", label: "Futures" },
  { id: "OPTIONS", label: "Options" },
];

const MORE_MARKETS = [
  { id: "FOREX", label: "Forex" },
  { id: "COMMODITIES", label: "Commodities" },
  { id: "US_EQUITY", label: "US Stocks" },
];

export function SimpleBotFilterBar({
  search,
  onSearchChange,
  selectedMarket,
  onSelectMarket,
  statusFilter,
  onStatusFilterChange,
  envFilter,
  onEnvFilterChange,
  showingCount,
  totalCount,
  viewMode,
  onViewModeChange,
  onExportCsv,
  onExportJson,
}: SimpleBotFilterBarProps) {
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isMoreSelected = MORE_MARKETS.some((m) => m.id === selectedMarket);
  const activeMoreLabel = MORE_MARKETS.find((m) => m.id === selectedMarket)?.label;

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="bg-[var(--theme-surface)]/90 border border-[var(--theme-border)] rounded-2xl p-3 sm:p-4 backdrop-blur-md shadow-xl font-sans select-none space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Bar with '/' Shortcut */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] rounded-xl max-w-sm w-full shadow-inner">
          <Search className="w-3.5 h-3.5 text-[var(--theme-text-muted)] shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search bot, symbol, strategy (Press '/' to focus)..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-transparent text-[var(--theme-text-primary)] text-xs focus:outline-none placeholder:text-[var(--theme-text-muted)] font-sans"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="text-[10px] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] px-1 rounded"
            >
              Clear
            </button>
          )}
        </div>

        {/* Market Tabs & View Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Market Selection Buttons */}
          <div className="flex items-center gap-1 flex-wrap font-mono">
            {PRIMARY_MARKETS.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  onSelectMarket(m.id);
                  setShowMoreDropdown(false);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition border text-[11px] ${
                  selectedMarket === m.id && !isMoreSelected
                    ? "bg-[var(--theme-accent)]/20 border-[var(--theme-accent)] text-[var(--theme-accent)] shadow-sm"
                    : "bg-[var(--theme-elevated)] border-[var(--theme-border-subtle)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
                }`}
              >
                {m.label}
              </button>
            ))}

            {/* More Markets Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                className={`px-2 py-1 rounded-lg font-bold transition border text-[11px] flex items-center gap-1 ${
                  isMoreSelected
                    ? "bg-[var(--theme-accent)]/20 border-[var(--theme-accent)] text-[var(--theme-accent)] shadow-sm"
                    : "bg-[var(--theme-elevated)] border-[var(--theme-border-subtle)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
                }`}
              >
                <span>{isMoreSelected ? activeMoreLabel : "More"}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showMoreDropdown && (
                <div className="absolute right-0 top-full mt-1.5 w-40 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl shadow-2xl z-30 py-1 font-sans text-xs">
                  {MORE_MARKETS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        onSelectMarket(m.id);
                        setShowMoreDropdown(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-[var(--theme-text-secondary)] hover:bg-[var(--theme-elevated)] hover:text-[var(--theme-text-primary)] flex items-center justify-between"
                    >
                      <span>{m.label}</span>
                      {selectedMarket === m.id && <Check className="w-3 h-3 text-[var(--theme-accent)]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="h-4 w-px bg-[var(--theme-border-subtle)] hidden sm:block" />

          {/* 3 View Mode Switcher: Table | Cards | Matrix */}
          <div className="flex items-center p-0.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] font-mono text-xs">
            <button
              onClick={() => onViewModeChange("table")}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition text-[11px] ${
                viewMode === "table"
                  ? "bg-[var(--theme-surface)] text-[var(--theme-accent)] shadow-sm border border-[var(--theme-border)]"
                  : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]"
              }`}
              title="High-Density Table View"
            >
              <Table className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Table</span>
            </button>

            <button
              onClick={() => onViewModeChange("cards")}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition text-[11px] ${
                viewMode === "cards"
                  ? "bg-[var(--theme-surface)] text-[var(--theme-accent)] shadow-sm border border-[var(--theme-border)]"
                  : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]"
              }`}
              title="Visual Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Cards</span>
            </button>

            <button
              onClick={() => onViewModeChange("matrix")}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition text-[11px] ${
                viewMode === "matrix"
                  ? "bg-[var(--theme-surface)] text-[var(--theme-accent)] shadow-sm border border-[var(--theme-border)]"
                  : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]"
              }`}
              title="Strategy Allocation Matrix"
            >
              <PieChart className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Matrix</span>
            </button>
          </div>

          {/* Filter Drawer Toggle */}
          <button
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className={`p-1.5 rounded-lg border transition ${
              showFilterDrawer || statusFilter !== "ALL" || envFilter !== "ALL"
                ? "bg-[var(--theme-accent)]/20 border-[var(--theme-accent)] text-[var(--theme-accent)]"
                : "bg-[var(--theme-elevated)] border-[var(--theme-border-subtle)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]"
            }`}
            title="Filter by Status and Mode"
          >
            <Filter className="w-3.5 h-3.5" />
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="p-1.5 rounded-lg bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] transition"
              title="Export Bots Data"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {showExportDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-36 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl shadow-2xl z-30 py-1 font-mono text-xs">
                {onExportCsv && (
                  <button
                    onClick={() => {
                      onExportCsv();
                      setShowExportDropdown(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-[var(--theme-text-secondary)] hover:bg-[var(--theme-elevated)] hover:text-[var(--theme-text-primary)] flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--theme-profit)]" />
                    <span>Export CSV</span>
                  </button>
                )}
                {onExportJson && (
                  <button
                    onClick={() => {
                      onExportJson();
                      setShowExportDropdown(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-[var(--theme-text-secondary)] hover:bg-[var(--theme-elevated)] hover:text-[var(--theme-text-primary)] flex items-center gap-2"
                  >
                    <FileCode className="w-3.5 h-3.5 text-[var(--theme-accent)]" />
                    <span>Export JSON</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Filter Drawer */}
      {showFilterDrawer && (
        <div className="pt-2.5 border-t border-[var(--theme-border-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs font-mono animate-in fade-in duration-150">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Status Pills */}
            <div className="flex items-center gap-1">
              <span className="text-[var(--theme-text-muted)] font-sans mr-1 text-[11px]">Status:</span>
              {(["ALL", "RUNNING", "PAUSED", "STOPPED", "ERROR"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => onStatusFilterChange(st)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    statusFilter === st
                      ? "bg-[var(--theme-accent)]/20 text-[var(--theme-accent)] border border-[var(--theme-accent)]"
                      : "bg-[var(--theme-elevated)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] border border-transparent"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Environment Pills */}
            <div className="flex items-center gap-1">
              <span className="text-[var(--theme-text-muted)] font-sans mr-1 text-[11px]">Mode:</span>
              {(["ALL", "PAPER", "LIVE"] as const).map((env) => (
                <button
                  key={env}
                  onClick={() => onEnvFilterChange(env)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    envFilter === env
                      ? "bg-[var(--theme-accent)]/20 text-[var(--theme-accent)] border border-[var(--theme-accent)]"
                      : "bg-[var(--theme-elevated)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] border border-transparent"
                  }`}
                >
                  {env}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[var(--theme-text-muted)] font-sans text-xs">
            Showing <strong className="text-[var(--theme-text-primary)] font-mono">{showingCount}</strong> of <strong className="text-[var(--theme-text-primary)] font-mono">{totalCount}</strong> bots
          </div>
        </div>
      )}
    </div>
  );
}
