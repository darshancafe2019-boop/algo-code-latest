"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  ChevronDown,
  Check,
  Table,
  LayoutGrid,
  PieChart,
  Download,
  FileSpreadsheet,
  FileCode,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import { BotViewMode } from "@/types/bot-control";
import { cn } from "@/lib/utils";

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

const BOT_TABS = [
  { id: "ALL", label: "All Bots" },
  { id: "RUNNING", label: "Active" },
  { id: "PAUSED", label: "Paused" },
  { id: "STOPPED", label: "Stopped" },
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
    <div className="rounded-[10px] bg-[#0A1422] border border-[#12304A] p-3 sm:p-3.5 font-sans select-none space-y-2.5">
      {/* ── Row 1: Search, Bot Lifecycle Tabs, Export & View Modes ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Search Bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#05101A] border border-[#12304A] hover:border-[#168BFF]/40 focus-within:border-[#22D3EE] rounded-lg max-w-sm w-full transition-colors">
          <Search className="h-3.5 w-3.5 text-[#7D8EA5] shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search bot, symbol, strategy..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-transparent text-[#F8FAFC] text-[11px] focus:outline-none placeholder:text-[#7D8EA5] font-sans"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="text-[10px] text-[#7D8EA5] hover:text-[#F8FAFC] px-1 rounded cursor-pointer font-mono"
            >
              Clear
            </button>
          )}
        </div>

        {/* Bot Lifecycle Tabs (All Bots, Active, Paused, Stopped) */}
        <div className="flex items-center gap-1 bg-[#05101A] p-0.5 rounded-md border border-[#12304A]">
          {BOT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onStatusFilterChange(tab.id)}
              className={cn(
                "px-2.5 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1",
                statusFilter === tab.id
                  ? "bg-[#168BFF] text-[#F8FAFC]"
                  : "text-[#7D8EA5] hover:text-[#F8FAFC]"
              )}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right Utility: View Switcher & Export */}
        <div className="flex items-center gap-1.5">
          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="p-1.5 rounded-md bg-[#05101A] border border-[#12304A] hover:border-[#168BFF]/40 text-[#7D8EA5] hover:text-[#F8FAFC] transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-medium"
              title="Export Bot Fleet"
            >
              <Download className="h-3 w-3" />
              <span>Export</span>
            </button>

            {showExportDropdown && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-[#0A1422] border border-[#12304A] rounded-lg shadow-xl z-30 py-1 font-mono text-[11px]">
                {onExportCsv && (
                  <button
                    onClick={() => {
                      setShowExportDropdown(false);
                      onExportCsv();
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-[#0F1C2F] text-[#F8FAFC] flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3 w-3 text-[#00E89A]" />
                    <span>CSV Format</span>
                  </button>
                )}
                {onExportJson && (
                  <button
                    onClick={() => {
                      setShowExportDropdown(false);
                      onExportJson();
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-[#0F1C2F] text-[#F8FAFC] flex items-center gap-2 cursor-pointer"
                  >
                    <FileCode className="h-3 w-3 text-[#22D3EE]" />
                    <span>JSON Format</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-0.5 p-0.5 bg-[#05101A] border border-[#12304A] rounded-md">
            <button
              onClick={() => onViewModeChange("table")}
              className={cn(
                "p-1 rounded transition-colors cursor-pointer",
                viewMode === "table"
                  ? "bg-[#168BFF] text-[#F8FAFC]"
                  : "text-[#7D8EA5] hover:text-[#F8FAFC]"
              )}
              title="Table View"
            >
              <Table className="h-3 w-3" />
            </button>
            <button
              onClick={() => onViewModeChange("cards")}
              className={cn(
                "p-1 rounded transition-colors cursor-pointer",
                viewMode === "cards"
                  ? "bg-[#168BFF] text-[#F8FAFC]"
                  : "text-[#7D8EA5] hover:text-[#F8FAFC]"
              )}
              title="Card Grid View"
            >
              <LayoutGrid className="h-3 w-3" />
            </button>
            <button
              onClick={() => onViewModeChange("matrix")}
              className={cn(
                "p-1 rounded transition-colors cursor-pointer",
                viewMode === "matrix"
                  ? "bg-[#168BFF] text-[#F8FAFC]"
                  : "text-[#7D8EA5] hover:text-[#F8FAFC]"
              )}
              title="Strategy Matrix View"
            >
              <PieChart className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Row 2: Market Filter Pills & Sources Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#10263A] text-xs">
        {/* Market Filter Pills */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] text-[#7D8EA5] uppercase font-semibold mr-1">Markets:</span>
          {PRIMARY_MARKETS.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                onSelectMarket(m.id);
                setShowMoreDropdown(false);
              }}
              className={cn(
                "px-2.5 py-0.5 rounded text-[10px] font-semibold transition-colors border cursor-pointer",
                selectedMarket === m.id && !isMoreSelected
                  ? "bg-[#168BFF] border-[#168BFF] text-[#F8FAFC]"
                  : "bg-[#05101A] border-[#12304A] text-[#7D8EA5] hover:text-[#F8FAFC] hover:border-[#168BFF]/30"
              )}
            >
              {m.label}
            </button>
          ))}

          {/* More Markets Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMoreDropdown(!showMoreDropdown)}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-semibold transition-colors border flex items-center gap-1 cursor-pointer",
                isMoreSelected
                  ? "bg-[#168BFF] border-[#168BFF] text-[#F8FAFC]"
                  : "bg-[#05101A] border-[#12304A] text-[#7D8EA5] hover:text-[#F8FAFC]"
              )}
            >
              <span>{isMoreSelected ? activeMoreLabel : "More"}</span>
              <ChevronDown className="h-2.5 w-2.5" />
            </button>

            {showMoreDropdown && (
              <div className="absolute left-0 top-full mt-1 w-36 bg-[#0A1422] border border-[#12304A] rounded-lg shadow-xl z-30 py-1 font-sans text-[11px]">
                {MORE_MARKETS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onSelectMarket(m.id);
                      setShowMoreDropdown(false);
                    }}
                    className="w-full px-3 py-1 text-left hover:bg-[#0F1C2F] text-[#F8FAFC] flex items-center justify-between cursor-pointer"
                  >
                    <span>{m.label}</span>
                    {selectedMarket === m.id && <Check className="h-3 w-3 text-[#22D3EE]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Broker Source Filter Pills */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] text-[#7D8EA5] uppercase font-semibold mr-1 flex items-center gap-1">
            <Radio className="h-2.5 w-2.5 text-[#22D3EE]" />
            <span>Sources:</span>
          </span>
          {BROKER_FILTERS.map((b) => (
            <button
              key={b.id}
              onClick={() => onSelectBroker && onSelectBroker(b.id)}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-semibold transition-colors border cursor-pointer",
                selectedBroker === b.id
                  ? "bg-[#168BFF] border-[#168BFF] text-[#F8FAFC]"
                  : "bg-[#05101A] border-[#12304A] text-[#7D8EA5] hover:text-[#F8FAFC]"
              )}
            >
              {b.label}
            </button>
          ))}
          <div className="text-[10px] text-[#7D8EA5] ml-2 font-mono">
            (<span className="text-[#F8FAFC] font-semibold">{showingCount}</span>/{totalCount})
          </div>
        </div>
      </div>
    </div>
  );
}
