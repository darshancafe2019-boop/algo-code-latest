"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Filter,
  Layers,
  Sparkles,
  Zap,
  Play,
  Save,
  Trash2,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { MarketInstrument, SavedScanner } from "@/types/market-universe";
import { WatchlistStarButton } from "@/components/watchlists/WatchlistStarButton";

interface MarketScannerWorkbenchProps {
  onSelectInstrument: (inst: MarketInstrument) => void;
}

export function MarketScannerWorkbench({ onSelectInstrument }: MarketScannerWorkbenchProps) {
  const queryClient = useQueryClient();
  const [selectedScannerId, setSelectedScannerId] = useState<string>("scan_momentum");
  const [assetClass, setAssetClass] = useState<string>("ALL");
  const [customRuleField, setCustomRuleField] = useState<string>("momentum_score");
  const [customRuleOp, setCustomRuleOp] = useState<string>(">=");
  const [customRuleVal, setCustomRuleVal] = useState<string>("70");
  const [scanResults, setScanResults] = useState<MarketInstrument[]>([]);

  // 1. Fetch Saved Scanners
  const { data: scannersData } = useQuery<{ status: string; scanners: SavedScanner[] }>({
    queryKey: ["savedScanners"],
    queryFn: async () => {
      const res = await fetch("/api/universe/scanners");
      if (!res.ok) throw new Error("Failed to load scanners");
      return res.json();
    },
  });

  const scanners = scannersData?.scanners || [];

  // 2. Run Scanner Mutation
  const runMutation = useMutation({
    mutationFn: async (rules: any) => {
      const res = await fetch("/api/universe/scanners/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: rules || {
            all: [{ field: customRuleField, op: customRuleOp, value: Number(customRuleVal) || customRuleVal }],
          },
          asset_class: assetClass,
          limit: 25,
        }),
      });
      if (!res.ok) throw new Error("Failed to execute scanner");
      return res.json();
    },
    onSuccess: (data) => {
      setScanResults(data.results || []);
    },
  });

  const handleSelectPreset = (scanner: SavedScanner) => {
    setSelectedScannerId(scanner.id);
    runMutation.mutate(scanner.rules);
  };

  const handleRunCustom = () => {
    runMutation.mutate({
      all: [
        {
          field: customRuleField,
          op: customRuleOp,
          value: isNaN(Number(customRuleVal)) ? customRuleVal : Number(customRuleVal),
        },
      ],
    });
  };

  return (
    <div className="bg-[#0B131E] border border-[#1E293B] rounded-2xl p-4 shadow-xl select-none font-sans space-y-4">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E293B] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Server-Side Quantitative Market Scanner
            </h3>
            <span className="text-[10px] text-slate-500">
              Evaluates multi-condition rule trees (ALL, ANY, NOT) against canonical database
            </span>
          </div>
        </div>

        {/* Preset Selector Buttons */}
        <div className="flex items-center gap-1 bg-[#070D14] p-1 rounded-xl border border-[#1E293B] text-[11px] font-mono overflow-x-auto scrollbar-none">
          {scanners.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSelectPreset(s)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                selectedScannerId === s.id
                  ? "bg-cyan-950 text-cyan-300 border border-cyan-800 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Custom Condition Builder Row */}
      <div className="p-3 bg-[#070D14] border border-[#1E293B] rounded-xl flex flex-wrap items-center gap-2.5 font-mono text-xs">
        <span className="text-[10px] font-bold text-slate-400 uppercase">Rule Condition:</span>

        <select
          value={customRuleField}
          onChange={(e) => setCustomRuleField(e.target.value)}
          className="bg-[#0B131E] border border-[#1E293B] rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
        >
          <option value="momentum_score">Momentum Score (0-100)</option>
          <option value="volatility_score">Volatility Score (0-100)</option>
          <option value="change_24h">24h Change %</option>
          <option value="volume_24h">24h Volume</option>
          <option value="directional_bias">Directional Bias</option>
        </select>

        <select
          value={customRuleOp}
          onChange={(e) => setCustomRuleOp(e.target.value)}
          className="bg-[#0B131E] border border-[#1E293B] rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
        >
          <option value=">=">&gt;= (Greater or Equal)</option>
          <option value="<=">&lt;= (Less or Equal)</option>
          <option value="==">== (Exact Match)</option>
        </select>

        <input
          type="text"
          value={customRuleVal}
          onChange={(e) => setCustomRuleVal(e.target.value)}
          placeholder="Threshold value..."
          className="bg-[#0B131E] border border-[#1E293B] rounded-lg px-2.5 py-1 text-slate-200 w-28 focus:outline-none"
        />

        <button
          onClick={handleRunCustom}
          disabled={runMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold transition-all ml-auto disabled:opacity-40"
        >
          <Play className="h-3 w-3 fill-current" />
          <span>{runMutation.isPending ? "Scanning..." : "Execute Scan"}</span>
        </button>
      </div>

      {/* 3. Scanned Results Grid */}
      {scanResults.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono text-xs">
          {scanResults.map((inst, idx) => {
            const sym = inst.canonical_symbol || inst.symbol || "UNKNOWN";
            const isPos = (inst.change_24h || 0) >= 0;
            const currSymbol = inst.currency === "INR" ? "₹" : "$";

            return (
              <div
                key={idx}
                onClick={() => onSelectInstrument(inst)}
                className="p-3 bg-[#070D14] hover:bg-[#0F1B2A] border border-[#1E293B] hover:border-cyan-700 rounded-xl transition-all cursor-pointer space-y-1.5 group shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div onClick={(e) => e.stopPropagation()}>
                      <WatchlistStarButton instrument={inst} size="sm" />
                    </div>
                    <span className="font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {sym}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#162231] text-slate-400">
                      {inst.exchange}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${
                      isPos
                        ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                        : "bg-rose-950/60 border-rose-800 text-rose-300"
                    }`}
                  >
                    {isPos ? "+" : ""}
                    {(inst.change_24h || 0).toFixed(2)}%
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    {currSymbol}
                    {inst.last_price ? inst.last_price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
                  </span>
                  <span className="text-[10px] text-cyan-400">
                    Mom: {inst.momentum_score || 50}/100
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-5 text-center text-xs font-mono text-slate-500 bg-[#070D14] rounded-xl border border-[#1E293B]">
          Select a scanner preset or execute custom conditions to view matched instruments.
        </div>
      )}
    </div>
  );
}
