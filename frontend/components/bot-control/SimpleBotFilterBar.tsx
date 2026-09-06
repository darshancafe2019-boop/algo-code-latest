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
  Layers,
  Radio,
} from "lucide-react";
import { BotViewMode } from "@/types/bot-control";

interface SimpleBotFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  selectedMarket: string;
  onSelectMarket: (market: string) => void;
  selectedBroker?: string;
  onSelectBroker?: (broker: string) => void;
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

const BROKER_FILTERS = [
  { id: "ALL", label: "ALL SOURCES" },
  { id: "PAPER", label: "PAPER SIM" },
  { id: "BINANCE", label: "BINANCE" },
  { id: "UPSTOX", label: "UPSTOX" },
  { id: "DHAN", label: "DHAN" },
  { id: "DELTA_INDIA", label: "DELTA INDIA" },
];

export function SimpleBotFilterBar({
  search,
  onSearchChange,
  selectedMarket,
  onSelectMarket,
  selectedBroker = "ALL",
  onSelectBroker,
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
      {/* Primary Top Bar: Search, Market Filter Pills, Export & Views */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Bar with '/' Shortcut */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] rounded-xl max-w-sm w-full shadow-inner">
          <Search className="w-3.5 h-3.5 text-[var(--theme-text-muted)] shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search bot, symbol, strategy, broker (Press '/' to focus)..."
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
                      className="w-full px-3 py-2 text-left hover:bg-[var(--theme-elevated)] text-[var(--theme-text-primary)] font-medium flex items-center justify-between"
                    >
                      <span>{m.label}</span>
                      {selectedMarket === m.id && <Check className="w-3.5 h-3.5 text-[var(--theme-accent)]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="p-1.5 rounded-lg bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition"
              title="Export Bot Fleet Data"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {showExportDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-40 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl shadow-2xl z-30 py-1 font-mono text-xs">
                {onExportCsv && (
                  <button
                    onClick={() => {
                      setShowExportDropdown(false);
                      onExportCsv();
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[var(--theme-elevated)] text-[var(--theme-text-primary)] flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--theme-profit)]" />
                    <span>Export CSV</span>
                  </button>
                )}
                {onExportJson && (
                  <button
                    onClick={() => {
                      setShowExportDropdown(false);
                      onExportJson();
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[var(--theme-elevated)] text-[var(--theme-text-primary)] flex items-center gap-2"
                  >
                    <FileCode className="w-3.5 h-3.5 text-[var(--theme-accent)]" />
                    <span>Export JSON</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-0.5 p-0.5 bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] rounded-lg">
            <button
              onClick={() => onViewModeChange("table")}
              className={`p-1 rounded ${
                viewMode === "table"
                  ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] shadow-sm"
                  : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]"
              }`}
              title="Table View"
            >
              <Table className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange("cards")}
              className={`p-1 rounded ${
                viewMode === "cards"
                  ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] shadow-sm"
                  : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]"
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange("matrix")}
              className={`p-1 rounded ${
                viewMode === "matrix"
                  ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] shadow-sm"
                  : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]"
              }`}
              title="Strategy Matrix View"
            >
              <PieChart className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Bar: Broker Source Filter Pills & Status Counters */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--theme-border-subtle)] text-[11px] font-mono">
        {/* Source Broker Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-[var(--theme-text-muted)] uppercase font-bold mr-1 flex items-center gap-1">
            <Radio className="w-3 h-3 text-[var(--theme-accent)]" />
            <span>Sources:</span>
          </span>
          {BROKER_FILTERS.map((b) => (
            <button
              key={b.id}
              onClick={() => onSelectBroker && onSelectBroker(b.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-extrabold transition border ${
                selectedBroker === b.id
                  ? "bg-[var(--theme-accent)]/20 border-[var(--theme-accent)] text-[var(--theme-accent)] shadow-sm"
                  : "bg-[var(--theme-elevated)] border-[var(--theme-border-subtle)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Showing Count */}
        <div className="text-[10px] text-[var(--theme-text-muted)]">
          Showing <span className="font-extrabold text-[var(--theme-text-primary)]">{showingCount}</span> of {totalCount} bots
        </div>
      </div>
    </div>
  );
}
