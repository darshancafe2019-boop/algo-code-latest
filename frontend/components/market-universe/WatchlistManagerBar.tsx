"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  Plus,
  Star,
  Columns,
  Download,
  Upload,
  Folder,
  Trash2,
  Settings2,
  Check
} from "lucide-react";
import { UserWatchlist } from "@/types/market-universe";

interface WatchlistManagerBarProps {
  watchlists: UserWatchlist[];
  activeWatchlistId: string;
  onSelectWatchlist: (id: string) => void;
  onToggleColumnsModal?: () => void;
}

export function WatchlistManagerBar({
  watchlists,
  activeWatchlistId,
  onSelectWatchlist,
  onToggleColumnsModal,
}: WatchlistManagerBarProps) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListFolder, setNewListFolder] = useState("General");

  // Create Watchlist Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/universe/watchlists/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName, folder: newListFolder }),
      });
      if (!res.ok) throw new Error("Failed to create watchlist");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["userWatchlistsMaster"] });
      if (data.watchlist_id) onSelectWatchlist(data.watchlist_id);
      setIsCreating(false);
      setNewListName("");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    createMutation.mutate();
  };

  const handleExportCSV = () => {
    const active = watchlists.find((w) => w.id === activeWatchlistId);
    if (!active || !active.items?.length) return;

    const headers = ["Symbol", "Name", "Exchange", "Asset Class", "Last Price", "24h Change %", "24h Volume"];
    const rows = active.items.map((i) => [
      i.canonical_symbol || i.symbol,
      i.company_name || i.display_symbol,
      i.exchange,
      i.asset_class,
      i.last_price || 0,
      i.change_24h || 0,
      i.volume_24h || 0,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${active.name.toLowerCase().replace(/\s+/g, "_")}_watchlist.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#0B131E] border border-[#1E293B] rounded-2xl p-3 shadow-xl select-none font-sans flex flex-wrap items-center justify-between gap-3">
      {/* 1. Watchlist Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none font-mono text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 mr-2">
          <Bookmark className="h-4 w-4 text-cyan-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            My Watchlists:
          </span>
        </div>

        {watchlists.map((wl) => (
          <button
            key={wl.id}
            onClick={() => onSelectWatchlist(wl.id)}
            className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-2 whitespace-nowrap ${
              activeWatchlistId === wl.id
                ? "bg-cyan-950 text-cyan-200 border-cyan-800 font-bold shadow-md"
                : "bg-[#070D14] border-[#1E293B] text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>{wl.name}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#162231] text-slate-400">
              {wl.items_count || (wl.items ? wl.items.length : 0)}
            </span>
          </button>
        ))}

        {/* New Watchlist Trigger */}
        {!isCreating ? (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#070D14] hover:bg-[#162231] border border-dashed border-[#1E293B] text-slate-400 hover:text-cyan-300 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New List</span>
          </button>
        ) : (
          <form onSubmit={handleCreateSubmit} className="flex items-center gap-1">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="List name..."
              autoFocus
              className="bg-[#070D14] border border-cyan-700 rounded-lg px-2 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none w-28"
            />
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="p-1 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-[10px] text-slate-500 hover:text-slate-300 px-1"
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      {/* 2. Utility Actions (Export CSV, Columns Customizer) */}
      <div className="flex items-center gap-1.5 font-mono text-xs">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#070D14] hover:bg-[#162231] border border-[#1E293B] text-slate-400 hover:text-slate-200 transition-colors"
          title="Export Active Watchlist to CSV"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export CSV</span>
        </button>

        {onToggleColumnsModal && (
          <button
            onClick={onToggleColumnsModal}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#070D14] hover:bg-[#162231] border border-[#1E293B] text-slate-400 hover:text-slate-200 transition-colors"
            title="Configure Visible Columns"
          >
            <Columns className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Columns</span>
          </button>
        )}
      </div>
    </div>
  );
}
