"use client";

import React from "react";
import {
  Crosshair,
  TrendingUp,
  Minus,
  Split,
  Square,
  Percent,
  Maximize2,
  Type,
  Trash2,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

export type DrawingToolType =
  | "crosshair"
  | "trendline"
  | "horizontal"
  | "vertical"
  | "rectangle"
  | "fibonacci"
  | "measure"
  | "text";

interface TerminalLeftToolbarProps {
  activeTool: DrawingToolType;
  onSelectTool: (tool: DrawingToolType) => void;
  onClearDrawings: () => void;
  drawingsCount: number;
  drawingsLocked?: boolean;
  onToggleLock?: () => void;
  drawingsHidden?: boolean;
  onToggleHide?: () => void;
}

const TOOLS: { id: DrawingToolType; label: string; icon: React.ElementType; shortcut?: string }[] = [
  { id: "crosshair", label: "Crosshair", icon: Crosshair, shortcut: "C" },
  { id: "trendline", label: "Trend Line", icon: TrendingUp, shortcut: "T" },
  { id: "horizontal", label: "Horizontal Line", icon: Minus, shortcut: "H" },
  { id: "vertical", label: "Vertical Line", icon: Split, shortcut: "V" },
  { id: "rectangle", label: "Rectangle / Zone", icon: Square, shortcut: "R" },
  { id: "fibonacci", label: "Fibonacci Retracement", icon: Percent, shortcut: "F" },
  { id: "measure", label: "Measure Tool (Price & Bars)", icon: Maximize2, shortcut: "M" },
  { id: "text", label: "Text Annotation", icon: Type, shortcut: "A" },
];

export function TerminalLeftToolbar({
  activeTool,
  onSelectTool,
  onClearDrawings,
  drawingsCount,
  drawingsLocked = false,
  onToggleLock,
  onToggleHide,
  drawingsHidden = false,
}: TerminalLeftToolbarProps) {
  return (
    <aside
      aria-label="Drawing Tools"
      className="w-11 bg-[#131722] border-r border-[#2A2E39] flex flex-col items-center py-2 z-20 select-none shrink-0"
    >
      <div className="flex flex-col items-center gap-1 w-full px-1">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              className={`group relative w-8 h-8 rounded flex items-center justify-center transition-all ${
                isActive
                  ? "bg-[#2962FF] text-white shadow-sm"
                  : "text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#1E222D]"
              }`}
              title={`${tool.label} ${tool.shortcut ? `(${tool.shortcut})` : ""}`}
            >
              <Icon className="w-4 h-4" />

              {/* Tooltip on hover */}
              <span className="pointer-events-none absolute left-full ml-2 px-2 py-1 bg-[#1E222D] text-[#D1D4DC] border border-[#2A2E39] rounded text-[11px] font-sans font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                {tool.label} {tool.shortcut && <span className="text-[#787B86] font-mono ml-1">[{tool.shortcut}]</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="w-6 h-[1px] bg-[#2A2E39] my-2" />

      {/* Drawing Management Tools */}
      <div className="flex flex-col items-center gap-1 w-full px-1">
        {/* Toggle Hide/Show */}
        <button
          onClick={onToggleHide}
          className={`group relative w-8 h-8 rounded flex items-center justify-center transition-all ${
            drawingsHidden
              ? "bg-[#EF5350]/20 text-[#EF5350]"
              : "text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#1E222D]"
          }`}
          title={drawingsHidden ? "Show All Drawings" : "Hide All Drawings"}
        >
          {drawingsHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span className="pointer-events-none absolute left-full ml-2 px-2 py-1 bg-[#1E222D] text-[#D1D4DC] border border-[#2A2E39] rounded text-[11px] font-sans whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
            {drawingsHidden ? "Show Drawings" : "Hide Drawings"}
          </span>
        </button>

        {/* Toggle Lock */}
        <button
          onClick={onToggleLock}
          className={`group relative w-8 h-8 rounded flex items-center justify-center transition-all ${
            drawingsLocked
              ? "bg-[#2962FF]/20 text-[#2962FF]"
              : "text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#1E222D]"
          }`}
          title={drawingsLocked ? "Unlock Drawings" : "Lock Drawings"}
        >
          <Lock className="w-4 h-4" />
          <span className="pointer-events-none absolute left-full ml-2 px-2 py-1 bg-[#1E222D] text-[#D1D4DC] border border-[#2A2E39] rounded text-[11px] font-sans whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
            {drawingsLocked ? "Unlock All Drawings" : "Lock Drawings"}
          </span>
        </button>

        {/* Clear All Drawings */}
        <button
          onClick={onClearDrawings}
          disabled={drawingsCount === 0}
          className={`group relative w-8 h-8 rounded flex items-center justify-center transition-all ${
            drawingsCount > 0
              ? "text-[#787B86] hover:text-[#EF5350] hover:bg-[#EF5350]/10 cursor-pointer"
              : "text-[#787B86]/40 cursor-not-allowed"
          }`}
          title={`Clear All Drawings (${drawingsCount})`}
        >
          <Trash2 className="w-4 h-4" />
          <span className="pointer-events-none absolute left-full ml-2 px-2 py-1 bg-[#1E222D] text-[#D1D4DC] border border-[#2A2E39] rounded text-[11px] font-sans whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
            Remove All Objects ({drawingsCount})
          </span>
        </button>
      </div>

      <div className="mt-auto flex flex-col items-center">
        <span className="text-[9px] font-mono text-[#787B86] tabular-nums" title="Active drawings on chart">
          {drawingsCount} obj
        </span>
      </div>
    </aside>
  );
}
