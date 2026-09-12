"use client";

import React, { useState } from "react";
import {
  Search,
  Filter,
  Download,
  Bookmark,
  BookmarkPlus,
  Trash2,
  RefreshCw,
  Sliders,
  Play,
  Pause,
  X,
  Command,
} from "lucide-react";

interface TradeFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusChange: (s: string) => void;
  directionFilter: string;
  onDirectionChange: (d: string) => void;
  strategyFilter: string;
  onStrategyChange: (s: string) => void;
  isRealtimeLive: boolean;
  onToggleRealtime: () => void;
  onExportCsv: () => void;
  isExporting: boolean;
}

export function TradeFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  directionFilter,
  onDirectionChange,
  strategyFilter,
  onStrategyChange,
  isRealtimeLive,
  onToggleRealtime,
  onExportCsv,
  isExporting,
}: TradeFilterBarProps) {
  const [savedPresets, setSavedPresets] = useState<Array<{ name: string; status: string; direction: string; query: string }>>([
    { name: "BTC Only", status: "ALL", direction: "ALL", query: "BTC" },
    { name: "Winning Trades", status: "WIN", direction: "ALL", query: "" },
    { name: "Losing Trades", status: "LOSS", direction: "ALL", query: "" },
    { name: "Active Positions", status: "OPEN", direction: "ALL", query: "" },
  ]);

  const [newPresetName, setNewPresetName] = useState("");
  const [isSavingPreset, setIsSavingPreset] = useState(false);

  const handleSaveCurrentFilter = () => {
    if (!newPresetName.trim()) return;
    setSavedPresets((prev) => [
      ...prev,
      { name: newPresetName.trim(), status: statusFilter, direction: directionFilter, query: searchQuery },
    ]);
    setNewPresetName("");
    setIsSavingPreset(false);
  };

  const handleApplyPreset = (preset: { status: string; direction: string; query: string }) => {
    onStatusChange(preset.status);
    onDirectionChange(preset.direction);
    onSearchChange(preset.query);
  };

  const handleDeletePreset = (index: number) => {
    setSavedPresets((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-2xl p-4 shadow-xl select-none font-sans space-y-3.5">
      {/* Top Filter Row: Search & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="h-4 w-4 text-[#52627A] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by Trade ID, Symbol, Strategy, Bot ID, or Remarks..."
            className="w-full bg-[#07101A] border border-[#122033] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#52627A] focus:outline-none focus:border-[#22D3EE] font-mono"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="bg-[#07101A] border border-[#122033] rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-[#22D3EE]"
          >
            <option value="ALL">All Outcomes</option>
            <option value="OPEN">Open Positions</option>
            <option value="CLOSED">Closed Trades</option>
            <option value="WIN">Winning Trades (P&L &gt; 0)</option>
            <option value="LOSS">Losing Trades (P&L &lt; 0)</option>
          </select>

          {/* Direction */}
          <select
            value={directionFilter}
            onChange={(e) => onDirectionChange(e.target.value)}
            className="bg-[#07101A] border border-[#122033] rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-[#22D3EE]"
          >
            <option value="ALL">All Directions</option>
            <option value="LONG">LONG (Buy)</option>
            <option value="SHORT">SHORT (Sell)</option>
          </select>

          {/* Strategy */}
          <select
            value={strategyFilter}
            onChange={(e) => onStrategyChange(e.target.value)}
            className="bg-[#07101A] border border-[#122033] rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-[#22D3EE]"
          >
            <option value="ALL">All Strategies</option>
            <option value="Trend Confluence">Trend Confluence</option>
            <option value="EMA Dynamic Crossover">EMA Crossover</option>
            <option value="Iron Condor">Iron Condor</option>
          </select>

          {/* Realtime Stream Toggle */}
          <button
            onClick={onToggleRealtime}
            className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              isRealtimeLive
                ? "bg-[rgba(37,99,235,0.18)] text-[#22D3EE] border border-[#00E890]/60"
                : "bg-[#07101A] text-amber-400 border border-amber-800"
            }`}
          >
            {isRealtimeLive ? (
              <>
                <span className="h-2 w-2 rounded-full bg-[#22D3EE] animate-pulse" />
                <span>LIVE FEED</span>
              </>
            ) : (
              <>
                <Pause className="h-3 w-3 fill-current" />
                <span>PAUSED</span>
              </>
            )}
          </button>

          {/* CSV Export Button */}
          <button
            onClick={onExportCsv}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold flex items-center gap-1.5 transition-all shadow-md"
          >
            {isExporting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Saved Filter Presets Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#122033] text-xs font-mono">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-[#52627A] uppercase font-bold flex items-center gap-1">
            <Bookmark className="h-3 w-3" />
            <span>Saved Views:</span>
          </span>

          {savedPresets.map((preset, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1 bg-[#07101A] border border-[#122033] hover:border-[#2563EB] rounded-lg px-2.5 py-1 text-[11px] text-[#7C8CA3] group transition-colors"
            >
              <button
                onClick={() => handleApplyPreset(preset)}
                className="hover:text-white font-semibold"
              >
                {preset.name}
              </button>
              <button
                onClick={() => handleDeletePreset(idx)}
                className="text-[#52627A] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Save Current Filter Trigger */}
        {isSavingPreset ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              autoFocus
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Preset name..."
              className="bg-[#07101A] border border-[#122033] rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:border-[#22D3EE]"
            />
            <button
              onClick={handleSaveCurrentFilter}
              className="px-2 py-0.5 bg-[rgba(37,99,235,0.18)] text-[#22D3EE] rounded-lg font-bold text-[11px] border border-[#00E890]/40"
            >
              Save
            </button>
            <button
              onClick={() => setIsSavingPreset(false)}
              className="text-[#52627A] hover:text-white p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsSavingPreset(true)}
            className="text-[10px] text-[#22D3EE] hover:text-white flex items-center gap-1 font-bold"
          >
            <BookmarkPlus className="h-3 w-3" />
            <span>+ Save Current View</span>
          </button>
        )}
      </div>
    </div>
  );
}
