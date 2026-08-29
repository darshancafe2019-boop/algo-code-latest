"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, RefreshCw, Layers } from "lucide-react";
import { NormalizedLtp } from "@/lib/upstox/types";

const TEST_INSTRUMENTS = [
  { key: "NSE_INDEX|Nifty 50", symbol: "NIFTY 50", name: "Nifty 50 Benchmark Index" },
  { key: "NSE_INDEX|Nifty Bank", symbol: "BANK NIFTY", name: "Nifty Banking Sector Index" },
  { key: "NSE_INDEX|India VIX", symbol: "INDIA VIX", name: "India Volatility Index" },
  { key: "NSE_EQ|INE002A01018", symbol: "RELIANCE", name: "Reliance Industries Ltd" },
];

function InstrumentQuoteCard({ inst }: { inst: { key: string; symbol: string; name: string } }) {
  const { data, isLoading, isError, error, refetch } = useQuery<NormalizedLtp & { status?: string; message?: string }>({
    queryKey: ["upstoxLtp", inst.key],
    queryFn: async () => {
      const res = await fetch(`/api/upstox/ltp?instrument_key=${encodeURIComponent(inst.key)}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to fetch quote");
      }
      return json;
    },
    refetchInterval: 10000,
  });

  const isPositive = (data?.change || 0) >= 0;

  return (
    <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-white font-mono">{inst.symbol}</h4>
          <span className="text-[10px] text-slate-400 font-sans block truncate max-w-[140px]">
            {inst.name}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="text-slate-500 hover:text-slate-300 transition p-1"
          title="Refresh Quote"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="py-2 text-slate-500 text-xs font-mono">Loading quote...</div>
      ) : isError ? (
        <div className="py-1">
          <span className="text-[11px] text-amber-400 font-mono block">Auth Required</span>
          <span className="text-[9px] text-slate-500 block truncate font-sans">
            {(error as any)?.message || "Token missing"}
          </span>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-base font-extrabold text-white font-mono tracking-tight">
              ₹{(data?.ltp || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            <span
              className={`flex items-center text-xs font-bold font-mono ${
                isPositive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
              {isPositive ? "+" : ""}
              {(data?.change || 0).toFixed(2)} ({isPositive ? "+" : ""}
              {(data?.changePct || 0).toFixed(2)}%)
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/60">
            <span>Prev: ₹{(data?.previousClose || 0).toFixed(2)}</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[9px]">
              {data?.source || "SNAPSHOT"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function UpstoxDevTestPanel() {
  return (
    <div className="bg-[#0B132B]/90 border border-slate-800 rounded-2xl p-5 md:p-6 backdrop-blur-md shadow-xl font-mono text-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            UPSTOX LIVE QUOTES TEST BENCH
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-sans">
          Real-time snapshot validation (Zero simulated ticks)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {TEST_INSTRUMENTS.map((inst) => (
          <InstrumentQuoteCard key={inst.key} inst={inst} />
        ))}
      </div>
    </div>
  );
}
