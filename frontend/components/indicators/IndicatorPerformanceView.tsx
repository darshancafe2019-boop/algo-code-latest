"use client";

import React from "react";
import { Activity, Zap, Cpu, Server, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function IndicatorPerformanceView() {
  const benchmarks = [
    { name: "EMA 9 / 20 / 50 / 200", complexity: "O(1) Recursive", latency: "1.2ms", memory: "128 KB", cacheHit: "99.9%", status: "HEALTHY" },
    { name: "Supertrend (10, 3)", complexity: "O(1) State Tracking", latency: "2.4ms", memory: "256 KB", cacheHit: "99.8%", status: "HEALTHY" },
    { name: "MACD (12, 26, 9)", complexity: "O(1) Differential", latency: "1.8ms", memory: "192 KB", cacheHit: "99.9%", status: "HEALTHY" },
    { name: "RSI (14) + Divergence", complexity: "O(N) Peak Detection", latency: "4.1ms", memory: "512 KB", cacheHit: "99.5%", status: "HEALTHY" },
    { name: "Bollinger Bands (20, 2)", complexity: "O(1) Variance Window", latency: "2.1ms", memory: "220 KB", cacheHit: "99.8%", status: "HEALTHY" },
    { name: "VWAP & Bands", complexity: "O(1) Cumulative Intraday", latency: "1.5ms", memory: "310 KB", cacheHit: "99.9%", status: "HEALTHY" },
    { name: "Standard Pivot Points", complexity: "O(1) Session Levels", latency: "0.8ms", memory: "64 KB", cacheHit: "100%", status: "HEALTHY" },
  ];

  return (
    <div className="space-y-3">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded bg-[#0A1422] border border-[#122A42]">
          <span className="text-[10px] text-[#7D8EA5] uppercase font-semibold">Mean Calc Latency</span>
          <p className="text-[20px] font-mono font-bold text-[#00E89A] mt-1">1.8 ms</p>
          <span className="text-[9px] text-[#7D8EA5]">p99: 4.2ms</span>
        </div>
        <div className="p-3 rounded bg-[#0A1422] border border-[#122A42]">
          <span className="text-[10px] text-[#7D8EA5] uppercase font-semibold">Throughput</span>
          <p className="text-[20px] font-mono font-bold text-[#00F0FF] mt-1">42,500/s</p>
          <span className="text-[9px] text-[#7D8EA5]">Bar calculations / sec</span>
        </div>
        <div className="p-3 rounded bg-[#0A1422] border border-[#122A42]">
          <span className="text-[10px] text-[#7D8EA5] uppercase font-semibold">Cache Hit Ratio</span>
          <p className="text-[20px] font-mono font-bold text-[#A855F7] mt-1">99.8%</p>
          <span className="text-[9px] text-[#7D8EA5]">Zero cold recalculation</span>
        </div>
        <div className="p-3 rounded bg-[#0A1422] border border-[#122A42]">
          <span className="text-[10px] text-[#7D8EA5] uppercase font-semibold">Dropped Ticks</span>
          <p className="text-[20px] font-mono font-bold text-[#00E89A] mt-1">0</p>
          <span className="text-[9px] text-[#7D8EA5]">Zero data loss policy</span>
        </div>
      </div>

      {/* Benchmarks Table */}
      <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] overflow-x-auto">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="h-[32px] bg-[#06101B] border-b border-[#122A42] text-[10px] uppercase font-semibold text-[#7D8EA5]">
              <th className="px-3 py-1">Indicator</th>
              <th className="px-3 py-1">Algorithmic Complexity</th>
              <th className="px-3 py-1 text-right">Calculation Latency</th>
              <th className="px-3 py-1 text-right">Memory Footprint</th>
              <th className="px-3 py-1 text-center">Cache Hit Rate</th>
              <th className="px-3 py-1 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#10263A]/60">
            {benchmarks.map((b) => (
              <tr key={b.name} className="h-[36px] hover:bg-[#0E1E34] transition-colors">
                <td className="px-3 py-1 font-semibold text-[#F8FAFC]">{b.name}</td>
                <td className="px-3 py-1 text-[#22D3EE] font-mono text-[10px]">{b.complexity}</td>
                <td className="px-3 py-1 text-right tabular-nums font-mono text-[#00E89A] font-semibold">{b.latency}</td>
                <td className="px-3 py-1 text-right tabular-nums font-mono text-[#F8FAFC] text-[10px]">{b.memory}</td>
                <td className="px-3 py-1 text-center font-mono text-[10px] text-[#A855F7] font-semibold">{b.cacheHit}</td>
                <td className="px-3 py-1 text-center">
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#00E89A]/15 text-[#00E89A] border border-[#00E89A]/30">
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

