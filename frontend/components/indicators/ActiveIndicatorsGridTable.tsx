"use client";

import React from "react";
import {
  TrendingUp,
  Activity,
  BarChart2,
  Waves,
  Sliders,
  Play,
  Square,
  Pause,
  Trash2,
  Settings2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActiveIndicatorItem {
  id: string;
  name: string;
  category: "TREND" | "MOMENTUM" | "VOLATILITY" | "VOLUME" | "SUPPORT_RESISTANCE";
  parameters: Record<string, any>;
  timeframe: string;
  latestValue: number | string;
  signal: "BUY" | "SELL" | "NEUTRAL" | "NONE";
  signalReason?: string;
  status: "ENABLED" | "DISABLED" | "WARNING" | "ERROR";
  latencyMs?: number;
  lastUpdated?: string;
}

interface ActiveIndicatorsGridTableProps {
  indicators: ActiveIndicatorItem[];
  selectedId: string | null;
  onSelectIndicator: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
  onConfigure: (item: ActiveIndicatorItem) => void;
  onDelete?: (id: string) => void;
  selectedIds: string[];
  onToggleSelectAll: () => void;
  onToggleSelectRow: (id: string) => void;
}

export function ActiveIndicatorsGridTable({
  indicators,
  selectedId,
  onSelectIndicator,
  onToggleStatus,
  onConfigure,
  onDelete,
  selectedIds,
  onToggleSelectAll,
  onToggleSelectRow,
}: ActiveIndicatorsGridTableProps) {
  const allSelected = indicators.length > 0 && selectedIds.length === indicators.length;

  const renderCategoryIcon = (cat: string) => {
    switch (cat) {
      case "TREND":
        return <TrendingUp className="h-3.5 w-3.5 text-[#00E89A]" />;
      case "MOMENTUM":
        return <Activity className="h-3.5 w-3.5 text-[#00F0FF]" />;
      case "VOLATILITY":
        return <Waves className="h-3.5 w-3.5 text-[#A855F7]" />;
      case "VOLUME":
        return <BarChart2 className="h-3.5 w-3.5 text-[#F59E0B]" />;
      default:
        return <Sliders className="h-3.5 w-3.5 text-[#7D8EA5]" />;
    }
  };

  const formatParams = (params: Record<string, any>) => {
    if (!params || Object.keys(params).length === 0) return "Default";
    return Object.entries(params)
      .slice(0, 3)
      .map(([k, v]) => `${k}:${v}`)
      .join(", ");
  };

  return (
    <div className="overflow-x-auto rounded-[8px] border border-[#122A42] bg-[#0A1422]">
      <table className="w-full text-left text-[11px]">
        <thead>
          <tr className="h-[32px] bg-[#06101B] border-b border-[#122A42] text-[10px] uppercase font-semibold text-[#7D8EA5]">
            <th className="w-8 px-2 text-center">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
                className="rounded border-[#10263A] bg-[#0A1422] text-[#00F0FF] focus:ring-0 cursor-pointer"
              />
            </th>
            <th className="w-8 px-1 text-center">#</th>
            <th className="px-3 py-1.5">Indicator Name</th>
            <th className="px-2 py-1.5">Category</th>
            <th className="px-2 py-1.5">Parameters</th>
            <th className="px-2 py-1.5 text-center">TF</th>
            <th className="px-3 py-1.5 text-right font-mono">Latest Value</th>
            <th className="px-3 py-1.5 text-center">Signal Condition</th>
            <th className="px-2 py-1.5 text-center">Latency</th>
            <th className="px-2 py-1.5 text-center">State</th>
            <th className="px-3 py-1.5 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#10263A]/60">
          {indicators.length === 0 ? (
            <tr>
              <td colSpan={11} className="py-12 text-center text-xs text-[#7D8EA5]">
                No indicators match the selected criteria.
              </td>
            </tr>
          ) : (
            indicators.map((ind, idx) => {
              const isSelected = selectedId === ind.id;
              const isChecked = selectedIds.includes(ind.id);
              const isEnabled = ind.status === "ENABLED";
              const valNum = Number(ind.latestValue);
              const valDisplay = !isNaN(valNum)
                ? valNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                : String(ind.latestValue ?? "—");

              return (
                <tr
                  key={ind.id}
                  onClick={() => onSelectIndicator(ind.id)}
                  className={cn(
                    "h-[36px] transition-colors cursor-pointer",
                    isSelected ? "bg-[#168BFF]/15 border-l-2 border-[#00F0FF]" : "hover:bg-[#0E1E34]"
                  )}
                >
                  {/* Checkbox */}
                  <td className="px-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleSelectRow(ind.id)}
                      className="rounded border-[#10263A] bg-[#06101B] text-[#00F0FF] focus:ring-0 cursor-pointer"
                    />
                  </td>

                  {/* Index */}
                  <td className="px-1 text-center font-mono text-[10px] text-[#7D8EA5]">
                    {String(idx + 1).padStart(2, "0")}
                  </td>

                  {/* Name + Icon */}
                  <td className="px-3 py-1 font-semibold text-[#F8FAFC]">
                    <div className="flex items-center gap-1.5">
                      <div className="p-1 rounded bg-[#06101B] border border-[#10263A]">
                        {renderCategoryIcon(ind.category)}
                      </div>
                      <div className="truncate max-w-[170px]">
                        <span className="text-[12px] text-[#F8FAFC]">{ind.name}</span>
                        <span className="block text-[9px] font-mono text-[#7D8EA5] truncate">{ind.id}</span>
                      </div>
                    </div>
                  </td>

                  {/* Category Badge */}
                  <td className="px-2 py-1">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#06101B] border border-[#10263A] text-[#7D8EA5]">
                      {ind.category}
                    </span>
                  </td>

                  {/* Parameters */}
                  <td className="px-2 py-1 text-[10px] font-mono text-[#7D8EA5] truncate max-w-[140px]">
                    {formatParams(ind.parameters)}
                  </td>

                  {/* Timeframe */}
                  <td className="px-2 py-1 text-center">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#168BFF]/10 text-[#22D3EE] border border-[#168BFF]/30">
                      {ind.timeframe}
                    </span>
                  </td>

                  {/* Latest Value */}
                  <td className="px-3 py-1 text-right tabular-nums font-mono font-bold text-[#F8FAFC]">
                    {valDisplay}
                  </td>

                  {/* Signal Badge */}
                  <td className="px-3 py-1 text-center">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "px-2 py-0.2 rounded text-[9px] font-mono font-bold tracking-wider",
                          ind.signal === "BUY"
                            ? "bg-[#00E89A]/15 text-[#00E89A] border border-[#00E89A]/30"
                            : ind.signal === "SELL"
                            ? "bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30"
                            : ind.signal === "NEUTRAL"
                            ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30"
                            : "bg-[#7D8EA5]/15 text-[#7D8EA5] border border-[#7D8EA5]/30"
                        )}
                      >
                        {ind.signal}
                      </span>
                      {ind.signalReason && (
                        <span className="text-[8px] text-[#7D8EA5] truncate max-w-[110px] mt-0.5 font-mono">
                          {ind.signalReason}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Latency */}
                  <td className="px-2 py-1 text-center font-mono text-[10px] text-[#00E89A]">
                    {ind.latencyMs ? `${ind.latencyMs}ms` : "12ms"}
                  </td>

                  {/* Status Toggle */}
                  <td className="px-2 py-1 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border",
                        isEnabled
                          ? "bg-[#00E89A]/10 text-[#00E89A] border-[#00E89A]/30"
                          : "bg-slate-500/10 text-slate-400 border-slate-500/30"
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", isEnabled ? "bg-[#00E89A] animate-pulse" : "bg-slate-500")} />
                      {ind.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-1 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onToggleStatus(ind.id, ind.status)}
                        className={cn(
                          "p-1 rounded bg-[#06101B] hover:bg-[#122A42] border border-[#10263A] transition-colors",
                          isEnabled ? "text-amber-400 hover:text-amber-300" : "text-[#00E89A] hover:text-[#00E89A]"
                        )}
                        title={isEnabled ? "Disable Indicator" : "Enable Indicator"}
                      >
                        {isEnabled ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => onConfigure(ind)}
                        className="p-1 rounded bg-[#06101B] hover:bg-[#122A42] text-[#00F0FF] border border-[#10263A] transition-colors"
                        title="Configure Parameters"
                      >
                        <Settings2 className="h-3 w-3" />
                      </button>

                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(ind.id)}
                          className="p-1 rounded bg-[#06101B] hover:bg-[#122A42] text-[#FF3B5C] border border-[#10263A] transition-colors"
                          title="Delete Indicator"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

