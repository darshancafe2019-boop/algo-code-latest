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
    <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-3 sm:p-4 font-sans select-none space-y-3">
      {/* Primary Top Bar: Search, Market Filter Pills, Export & Views */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Bar with '/' Shortcut */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0D1727] border border-[#1A2A3F] hover:border-[#29415F] focus-within:border-[#22D3EE] rounded-lg max-w-sm w-full transition-colors">
          <Search className="w-4 h-4 text-[#52627A] shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search bot, symbol, strategy (Press '/' to focus)..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-transparent text-[#F7FAFC] text-xs focus:outline-none placeholder:text-[#52627A] font-sans"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="text-[10px] text-[#52627A] hover:text-[#F7FAFC] px-1 rounded cursor-pointer"
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
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors border cursor-pointer",
                  selectedMarket === m.id && !isMoreSelected
                    ? "bg-[#2563EB]/20 border-[#2563EB]/40 text-[#19C5FF]"
                    : "bg-[#0D1727] border-[#1A2A3F] text-[#7C8CA3] hover:text-[#F7FAFC] hover:bg-[#101B2D]"
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
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors border flex items-center gap-1 cursor-pointer",
                  isMoreSelected
                    ? "bg-[#2563EB]/20 border-[#2563EB]/40 text-[#19C5FF]"
                    : "bg-[#0D1727] border-[#1A2A3F] text-[#7C8CA3] hover:text-[#F7FAFC] hover:bg-[#101B2D]"
                )}
              >
                <span>{isMoreSelected ? activeMoreLabel : "More"}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showMoreDropdown && (
                <div className="absolute right-0 top-full mt-1.5 w-40 bg-[#0A1422] border border-[#1A2A3F] rounded-lg shadow-xl z-30 py-1 font-sans text-xs">
                  {MORE_MARKETS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        onSelectMarket(m.id);
                        setShowMoreDropdown(false);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-[#101B2D] text-[#F7FAFC] flex items-center justify-between cursor-pointer"
                    >
                      <span>{m.label}</span>
                      {selectedMarket === m.id && <Check className="w-3.5 h-3.5 text-[#22D3EE]" />}
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
              className="p-1.5 rounded-md bg-[#0D1727] border border-[#1A2A3F] hover:border-[#29415F] text-[#7C8CA3] hover:text-[#F7FAFC] transition-colors cursor-pointer"
              title="Export Bot Fleet Data"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {showExportDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-40 bg-[#0A1422] border border-[#1A2A3F] rounded-lg shadow-xl z-30 py-1 font-mono text-xs">
                {onExportCsv && (
                  <button
                    onClick={() => {
                      setShowExportDropdown(false);
                      onExportCsv();
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-[#101B2D] text-[#F7FAFC] flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#00E890]" />
                    <span>Export CSV</span>
                  </button>
                )}
                {onExportJson && (
                  <button
                    onClick={() => {
                      setShowExportDropdown(false);
                      onExportJson();
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-[#101B2D] text-[#F7FAFC] flex items-center gap-2 cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-[#19C5FF]" />
                    <span>Export JSON</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-0.5 p-0.5 bg-[#0D1727] border border-[#1A2A3F] rounded-md">
            <button
              onClick={() => onViewModeChange("table")}
              className={cn(
                "p-1 rounded cursor-pointer",
                viewMode === "table"
                  ? "bg-[#2563EB] text-[#F7FAFC]"
                  : "text-[#52627A] hover:text-[#F7FAFC]"
              )}
              title="Table View"
            >
              <Table className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange("cards")}
              className={cn(
                "p-1 rounded cursor-pointer",
                viewMode === "cards"
                  ? "bg-[#2563EB] text-[#F7FAFC]"
                  : "text-[#52627A] hover:text-[#F7FAFC]"
              )}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange("matrix")}
              className={cn(
                "p-1 rounded cursor-pointer",
                viewMode === "matrix"
                  ? "bg-[#2563EB] text-[#F7FAFC]"
                  : "text-[#52627A] hover:text-[#F7FAFC]"
              )}
              title="Strategy Matrix View"
            >
              <PieChart className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Bar: Broker Source Filter Pills & Status Counters */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#122033] text-xs font-mono">
        {/* Source Broker Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-[#52627A] uppercase font-semibold mr-1 flex items-center gap-1">
            <Radio className="w-3 h-3 text-[#22D3EE]" />
            <span>Sources:</span>
          </span>
          {BROKER_FILTERS.map((b) => (
            <button
              key={b.id}
              onClick={() => onSelectBroker && onSelectBroker(b.id)}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-semibold transition-colors border cursor-pointer",
                selectedBroker === b.id
                  ? "bg-[#2563EB]/20 border-[#2563EB]/40 text-[#19C5FF]"
                  : "bg-[#0D1727] border-[#1A2A3F] text-[#7C8CA3] hover:text-[#F7FAFC]"
              )}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Showing Count */}
        <div className="text-[11px] text-[#52627A]">
          Showing <span className="font-semibold text-[#F7FAFC]">{showingCount}</span> of {totalCount} bots
        </div>
      </div>
    </div>
  );
}
