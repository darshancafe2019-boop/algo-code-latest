"use client";

import React from "react";
import { X } from "lucide-react";
import { useStocksStore } from "../state/stocks-store";

export const ActiveFilterChips: React.FC = () => {
  const { filters, setFilters, resetFilters } = useStocksStore();

  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (filters.search) {
    chips.push({
      key: "search",
      label: `Search: "${filters.search}"`,
      onRemove: () => setFilters({ search: "" }),
    });
  }
  if (filters.country && filters.country !== "ALL") {
    chips.push({
      key: "country",
      label: `Country: ${filters.country}`,
      onRemove: () => setFilters({ country: undefined }),
    });
  }
  if (filters.exchange && filters.exchange !== "ALL") {
    chips.push({
      key: "exchange",
      label: `Exchange: ${filters.exchange}`,
      onRemove: () => setFilters({ exchange: "ALL" }),
    });
  }
  if (filters.sector && filters.sector !== "ALL") {
    chips.push({
      key: "sector",
      label: `Sector: ${filters.sector}`,
      onRemove: () => setFilters({ sector: "ALL" }),
    });
  }
  if (filters.price_direction) {
    chips.push({
      key: "price_direction",
      label: `Direction: ${filters.price_direction}`,
      onRemove: () => setFilters({ price_direction: undefined }),
    });
  }
  if (filters.min_change_pct !== undefined) {
    chips.push({
      key: "min_change_pct",
      label: `Min Return: >${filters.min_change_pct}%`,
      onRemove: () => setFilters({ min_change_pct: undefined }),
    });
  }
  if (filters.min_relative_volume !== undefined) {
    chips.push({
      key: "min_relative_volume",
      label: `Rel Vol: >${filters.min_relative_volume}x`,
      onRemove: () => setFilters({ min_relative_volume: undefined }),
    });
  }
  if (filters.directional_bias) {
    chips.push({
      key: "directional_bias",
      label: `Bias: ${filters.directional_bias}`,
      onRemove: () => setFilters({ directional_bias: undefined }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1">
      <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mr-1">
        Active Filters:
      </span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium bg-slate-800/80 border border-slate-700 text-slate-200"
        >
          <span>{chip.label}</span>
          <button
            onClick={chip.onRemove}
            className="text-slate-400 hover:text-white p-0.5 rounded transition"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <button
        onClick={resetFilters}
        className="text-[10px] text-cyan-400 hover:underline font-mono ml-2"
      >
        Clear all
      </button>
    </div>
  );
};
