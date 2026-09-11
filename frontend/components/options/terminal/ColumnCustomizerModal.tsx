"use client";

import React from "react";
import { Columns, RotateCcw, Check, X } from "lucide-react";
import { ColumnVisibilityConfig } from "@/types/option-terminal";

interface ColumnCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ColumnVisibilityConfig;
  onChangeConfig: (newConfig: ColumnVisibilityConfig) => void;
}

export const DEFAULT_COLUMN_CONFIG: ColumnVisibilityConfig = {
  oi: true,
  oiChange: true,
  oiChangePercent: false,
  volume: true,
  volumeOiRatio: true,
  iv: true,
  intrinsicValue: false,
  timeValue: false,
  ltp: true,
  change: true,
  changePercent: true,
  bid: true,
  ask: true,
  bidQty: false,
  askQty: false,
  delta: true,
  gamma: false,
  theta: true,
  vega: false,
  rho: false,
  buildupBadge: true,
};

export const GREEKS_COLUMN_CONFIG: ColumnVisibilityConfig = {
  ...DEFAULT_COLUMN_CONFIG,
  delta: true,
  gamma: true,
  theta: true,
  vega: true,
  rho: true,
  iv: true,
};

export const SCALPING_COLUMN_CONFIG: ColumnVisibilityConfig = {
  oi: true,
  oiChange: true,
  oiChangePercent: true,
  volume: true,
  volumeOiRatio: true,
  iv: true,
  intrinsicValue: false,
  timeValue: false,
  ltp: true,
  change: true,
  changePercent: true,
  bid: true,
  ask: true,
  bidQty: true,
  askQty: true,
  delta: true,
  gamma: false,
  theta: true,
  vega: false,
  rho: false,
  buildupBadge: true,
};

export const FULL_COLUMN_CONFIG: ColumnVisibilityConfig = {
  oi: true,
  oiChange: true,
  oiChangePercent: true,
  volume: true,
  volumeOiRatio: true,
  iv: true,
  intrinsicValue: true,
  timeValue: true,
  ltp: true,
  change: true,
  changePercent: true,
  bid: true,
  ask: true,
  bidQty: true,
  askQty: true,
  delta: true,
  gamma: true,
  theta: true,
  vega: true,
  rho: true,
  buildupBadge: true,
};

const COLUMN_GROUPS: Array<{
  group: string;
  columns: Array<{ key: keyof ColumnVisibilityConfig; label: string; desc: string }>;
}> = [
  {
    group: "Price & Quotes",
    columns: [
      { key: "ltp", label: "LTP", desc: "Last Traded Price" },
      { key: "change", label: "Change", desc: "Net price change" },
      { key: "changePercent", label: "Change %", desc: "Percentage price change" },
      { key: "bid", label: "Bid", desc: "Best buyer price" },
      { key: "ask", label: "Ask", desc: "Best seller price" },
      { key: "bidQty", label: "Bid Qty", desc: "Quantity at best bid" },
      { key: "askQty", label: "Ask Qty", desc: "Quantity at best ask" },
    ],
  },
  {
    group: "Open Interest & Volume",
    columns: [
      { key: "oi", label: "OI", desc: "Open Interest (Contracts)" },
      { key: "oiChange", label: "ΔOI", desc: "Open Interest change" },
      { key: "oiChangePercent", label: "ΔOI %", desc: "Percentage OI change" },
      { key: "volume", label: "Volume", desc: "Total traded volume" },
      { key: "volumeOiRatio", label: "Vol / OI", desc: "Volume to OI activity ratio" },
      { key: "buildupBadge", label: "Buildup", desc: "Long/Short buildup tag" },
    ],
  },
  {
    group: "Option Greeks & Analytics",
    columns: [
      { key: "iv", label: "IV", desc: "Implied Volatility %" },
      { key: "delta", label: "Delta (Δ)", desc: "Directional rate of change" },
      { key: "theta", label: "Theta (Θ)", desc: "Daily time decay" },
      { key: "gamma", label: "Gamma (Γ)", desc: "Rate of change of delta" },
      { key: "vega", label: "Vega (ν)", desc: "Sensitivity to IV changes" },
      { key: "rho", label: "Rho (ρ)", desc: "Sensitivity to interest rates" },
      { key: "intrinsicValue", label: "Intrinsic", desc: "In-the-money intrinsic value" },
      { key: "timeValue", label: "Time Val", desc: "Extrinsic time premium" },
    ],
  },
];

export const ColumnCustomizerModal: React.FC<ColumnCustomizerModalProps> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
}) => {
  if (!isOpen) return null;

  const toggleColumn = (key: keyof ColumnVisibilityConfig) => {
    const updated = { ...config, [key]: !config[key] };
    onChangeConfig(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs">
      <div className="bg-[#0B1222] border border-slate-700/80 rounded-2xl p-5 max-w-xl w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Columns className="w-4 h-4 text-cyan-400" />
            <span>Option Chain Column Visibility</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-slate-400 uppercase">Quick Presets:</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onChangeConfig(DEFAULT_COLUMN_CONFIG)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold"
            >
              Default Standard
            </button>
            <button
              type="button"
              onClick={() => onChangeConfig(GREEKS_COLUMN_CONFIG)}
              className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold"
            >
              All Greeks View
            </button>
            <button
              type="button"
              onClick={() => onChangeConfig(SCALPING_COLUMN_CONFIG)}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold"
            >
              Scalping & Depth
            </button>
            <button
              type="button"
              onClick={() => onChangeConfig(FULL_COLUMN_CONFIG)}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold"
            >
              Full Matrix (All Columns)
            </button>
          </div>
        </div>

        {/* Columns Grid by Category */}
        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
          {COLUMN_GROUPS.map((grp) => (
            <div key={grp.group} className="space-y-2">
              <span className="text-[11px] font-bold text-cyan-400 block border-b border-slate-800/80 pb-1">
                {grp.group}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {grp.columns.map((col) => {
                  const isChecked = config[col.key];
                  return (
                    <button
                      key={col.key}
                      type="button"
                      onClick={() => toggleColumn(col.key)}
                      className={`flex items-start gap-2.5 p-2 rounded-xl border text-left transition ${
                        isChecked
                          ? "bg-cyan-500/10 border-cyan-500/40 text-white"
                          : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center border flex-shrink-0 ${
                          isChecked
                            ? "bg-cyan-500 border-cyan-400 text-slate-950"
                            : "border-slate-700 bg-slate-950"
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs">{col.label}</div>
                        <div className="text-[10px] text-slate-500">{col.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => onChangeConfig(DEFAULT_COLUMN_CONFIG)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition text-xs shadow-md shadow-cyan-500/20"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
