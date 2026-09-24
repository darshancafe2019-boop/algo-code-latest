"use client";

import React, { useState, useMemo } from "react";
import { indicatorRegistry } from "@/lib/indicators/registry";
import { IndicatorCategory, IndicatorDefinition } from "@/lib/indicators/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Sliders,
  Search,
  Check,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  BarChart2,
  Zap,
} from "lucide-react";

export interface SelectedIndicatorConfig {
  indicator_id: string;
  name: string;
  category: string;
  overlay: boolean;
  params: Record<string, any>;
  enabled: boolean;
}

interface BotIndicatorSelectorProps {
  value: SelectedIndicatorConfig[];
  onChange: (indicators: SelectedIndicatorConfig[]) => void;
  compact?: boolean;
}

const CATEGORIES: { key: IndicatorCategory; label: string }[] = [
  { key: "ALL", label: "All Indicators" },
  { key: "TREND", label: "Trend" },
  { key: "MOMENTUM", label: "Momentum" },
  { key: "VOLATILITY", label: "Volatility" },
  { key: "VOLUME", label: "Volume" },
  { key: "STRENGTH", label: "Strength" },
  { key: "STRUCTURE", label: "Structure" },
  { key: "OPTIONS", label: "Options" },
];

export function BotIndicatorSelector({
  value = [],
  onChange,
  compact = false,
}: BotIndicatorSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<IndicatorCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // All registered indicators from registry
  const allDefinitions = useMemo(() => {
    return indicatorRegistry.getAll();
  }, []);

  // Filtered indicators based on category & search query
  const filteredDefinitions = useMemo(() => {
    return allDefinitions.filter((ind) => {
      const matchCategory =
        activeCategory === "ALL" || ind.category === activeCategory;
      const matchSearch =
        !searchQuery.trim() ||
        ind.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ind.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ind.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ind.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [allDefinitions, activeCategory, searchQuery]);

  // Check if an indicator is selected
  const isSelected = (indicatorId: string) => {
    return value.some((item) => item.indicator_id === indicatorId);
  };

  // Toggle selection
  const handleToggleIndicator = (def: IndicatorDefinition<any>) => {
    if (isSelected(def.id)) {
      const updated = value.filter((item) => item.indicator_id !== def.id);
      onChange(updated);
      if (expandedId === def.id) setExpandedId(null);
    } else {
      // Build default params from definition
      const defaultParams: Record<string, any> = {};
      if (def.parameters) {
        Object.entries(def.parameters).forEach(([pKey, pDef]) => {
          defaultParams[pKey] = pDef.default;
        });
      }

      const newItem: SelectedIndicatorConfig = {
        indicator_id: def.id,
        name: def.name,
        category: def.category,
        overlay: def.overlay,
        params: defaultParams,
        enabled: true,
      };

      const updated = [...value, newItem];
      onChange(updated);
      setExpandedId(def.id);
    }
  };

  // Remove indicator
  const handleRemove = (indicatorId: string) => {
    const updated = value.filter((item) => item.indicator_id !== indicatorId);
    onChange(updated);
    if (expandedId === indicatorId) setExpandedId(null);
  };

  // Handle parameter change
  const handleParamChange = (indicatorId: string, paramKey: string, newValue: any) => {
    const updated = value.map((item) => {
      if (item.indicator_id === indicatorId) {
        return {
          ...item,
          params: {
            ...item.params,
            [paramKey]: newValue,
          },
        };
      }
      return item;
    });
    onChange(updated);
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Category Pills & Search */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--theme-accent)]" />
            <span className="font-mono font-bold text-xs uppercase text-[var(--theme-text-primary)]">
              QUANTITATIVE INDICATOR ENGINE
            </span>
            <Badge variant="outline" className="text-[10px] font-mono">
              {value.length} Active
            </Badge>
          </div>
          <span className="text-[10px] text-[var(--theme-text-muted)]">
            Total {allDefinitions.length} Indicators Available
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--theme-text-muted)]" />
          <input
            type="text"
            placeholder="Search indicator by name, category, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl text-xs font-mono text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] focus:outline-none focus:border-[var(--theme-accent)]"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap transition-all ${
                activeCategory === cat.key
                  ? "bg-[var(--theme-accent)] text-black font-bold shadow"
                  : "bg-[var(--theme-elevated)] border border-[var(--theme-border)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Indicators Summary Bar */}
      {value.length > 0 && (
        <div className="p-3 bg-[var(--theme-elevated)] border border-[var(--theme-accent)]/30 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-[var(--theme-accent)] flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Configured Bot Indicators ({value.length})
            </span>
            <span className="text-[10px] font-mono text-[var(--theme-text-muted)]">
              Parameters applied to runtime
            </span>
          </div>

          <div className="space-y-2">
            {value.map((item) => {
              const def = indicatorRegistry.get(item.indicator_id);
              const isExpanded = expandedId === item.indicator_id;

              return (
                <div
                  key={item.indicator_id}
                  className="bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-lg p-2.5 transition-all hover:border-[var(--theme-accent)]/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[var(--theme-text-primary)]">
                        {item.name}
                      </span>
                      <Badge variant="outline" className="text-[9px] uppercase font-mono">
                        {item.category}
                      </Badge>
                      {item.overlay && (
                        <Badge variant="secondary" className="text-[9px] font-mono bg-cyan-500/10 text-cyan-400">
                          Overlay
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : item.indicator_id)
                        }
                        className="p-1 hover:bg-[var(--theme-elevated)] rounded text-[var(--theme-text-secondary)]"
                        title="Configure Settings"
                      >
                        <Sliders className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(item.indicator_id)}
                        className="p-1 hover:bg-rose-500/20 text-rose-400 rounded"
                        title="Remove Indicator"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Param Summary */}
                  <div className="mt-1 text-[10px] font-mono text-[var(--theme-text-muted)] flex flex-wrap gap-2">
                    {Object.entries(item.params).map(([pk, pv]) => (
                      <span key={pk} className="bg-[var(--theme-elevated)] px-1.5 py-0.5 rounded border border-[var(--theme-border)]">
                        {pk}: <strong className="text-[var(--theme-text-primary)]">{String(pv)}</strong>
                      </span>
                    ))}
                  </div>

                  {/* Expanded Settings Tuner */}
                  {isExpanded && def && def.parameters && (
                    <div className="mt-2.5 pt-2.5 border-t border-[var(--theme-border)] space-y-2.5 font-mono">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--theme-accent)]">
                        <span>PARAMETER SETTINGS</span>
                        <span className="text-[9px] text-[var(--theme-text-muted)] font-normal">
                          {def.description}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        {Object.entries(def.parameters).map(([pKey, pDef]) => {
                          const val = item.params[pKey] ?? pDef.default;

                          if (pDef.type === "select" && pDef.options) {
                            return (
                              <div key={pKey}>
                                <label className="block text-[10px] text-[var(--theme-text-secondary)] mb-1 uppercase">
                                  {pDef.label || pKey}
                                </label>
                                <select
                                  value={val}
                                  onChange={(e) =>
                                    handleParamChange(
                                      item.indicator_id,
                                      pKey,
                                      e.target.value
                                    )
                                  }
                                  className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-lg px-2 py-1 text-xs text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent)]"
                                >
                                  {pDef.options.map((opt) => (
                                    <option key={String(opt.value)} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          }

                          return (
                            <div key={pKey}>
                              <label className="block text-[10px] text-[var(--theme-text-secondary)] mb-1 uppercase">
                                {pDef.label || pKey}
                              </label>
                              <input
                                type={pDef.type === "number" ? "number" : "text"}
                                min={pDef.min}
                                max={pDef.max}
                                step={pDef.step || 1}
                                value={val}
                                onChange={(e) =>
                                  handleParamChange(
                                    item.indicator_id,
                                    pKey,
                                    pDef.type === "number"
                                      ? Number(e.target.value)
                                      : e.target.value
                                  )
                                }
                                className="w-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-lg px-2 py-1 text-xs text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent)]"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Indicators Grid */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono text-[var(--theme-text-muted)] uppercase">
          Select Indicators to Add ({filteredDefinitions.length})
        </span>

        <div className={`grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
          {filteredDefinitions.map((ind) => {
            const selected = isSelected(ind.id);

            return (
              <div
                key={ind.id}
                onClick={() => handleToggleIndicator(ind)}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  selected
                    ? "bg-[var(--theme-accent)]/10 border-[var(--theme-accent)] shadow-sm"
                    : "bg-[var(--theme-elevated)] border-[var(--theme-border)] hover:border-[var(--theme-accent)]/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs text-[var(--theme-text-primary)]">
                      {ind.shortName || ind.name}
                    </span>
                    <Badge variant="outline" className="text-[9px] uppercase font-mono">
                      {ind.category}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1">
                    {selected ? (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-[var(--theme-accent)]">
                        <Check className="h-3.5 w-3.5" /> Added
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]">
                        <Plus className="h-3.5 w-3.5" /> Add
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-[var(--theme-text-secondary)] line-clamp-2">
                  {ind.description}
                </p>

                <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono text-[var(--theme-text-muted)]">
                  <span>Overlay: {ind.overlay ? "Yes" : "No"}</span>
                  <span>Min Candles: {ind.requiredCandles}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
