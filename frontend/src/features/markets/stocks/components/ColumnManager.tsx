"use client";

import React, { useRef, useEffect } from "react";
import { Check, X } from "lucide-react";
import { useStocksStore } from "../state/stocks-store";

export const ColumnManager: React.FC = () => {
  const { columns, toggleColumn, setColumnManagerOpen } = useStocksStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setColumnManagerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setColumnManagerOpen]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 space-y-2 font-mono text-xs animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <span className="font-bold text-white text-[11px] uppercase tracking-wider">Customize Columns</span>
        <button
          onClick={() => setColumnManagerOpen(false)}
          className="text-slate-400 hover:text-white p-0.5 rounded"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
        {columns.map((col) => (
          <button
            key={col.id}
            disabled={col.required}
            onClick={() => toggleColumn(col.id)}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${
              col.required
                ? "opacity-50 cursor-not-allowed text-slate-500"
                : col.visible
                ? "text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/15"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <span>{col.label}</span>
            {col.visible && <Check className="w-3.5 h-3.5 text-cyan-400" />}
          </button>
        ))}
      </div>
    </div>
  );
};
