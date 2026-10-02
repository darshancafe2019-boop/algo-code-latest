"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Zap,
  Clock,
  Radio,
  X,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

export function LiveDataCommandCenter() {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 font-sans select-none text-[#F8FAFC]">
      {/* ── Left Gateway & Providers Console (8 Columns on desktop) ── */}
      <div className="lg:col-span-8 p-3.5 rounded-2xl bg-[#08101e] border border-[#13233c] shadow-lg flex flex-col justify-between space-y-3">
        {/* Gateway Telemetry Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-[#13233c] text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#10b981] animate-pulse" />
            <span className="font-extrabold text-sm text-white tracking-wide">LIVE DATA GATEWAY</span>
            <span className="px-2 py-0.5 rounded-full bg-[#064e3b]/80 border border-[#10b981]/50 text-[#10b981] text-[11px] font-bold">
              ACTIVE : 5051
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs text-[#64748b]">
            <div>
              <span>Providers</span> <strong className="text-[#38bdf8] font-mono">4 / 7</strong>
            </div>
            <div>
              <span>Feeds/Subs</span> <strong className="text-[#38bdf8] font-mono">175</strong>
            </div>
            <div>
              <span>Throughput</span> <strong className="text-white font-mono">48.5</strong> <span className="text-[10px]">t/s</span>
            </div>
            <div>
              <span>Avg Latency</span> <strong className="text-[#10b981] font-mono">18 ms</strong>
            </div>
            <div>
              <span>P95</span> <strong className="text-white font-mono">34 ms</strong>
            </div>
            <div>
              <span>Dropped</span> <strong className="text-white font-mono">0</strong>
            </div>
            <div>
              <span>Reconnects</span> <strong className="text-white font-mono">1</strong>
            </div>
            <div>
              <span>Queue</span> <strong className="text-white font-mono">2</strong>
            </div>

            {/* Mini Cyan Waveform */}
            <svg className="w-14 h-4 stroke-[#0284c7] fill-none hidden sm:block" viewBox="0 0 50 14">
              <path d="M0,7 Q10,1 20,8 T35,3 T50,7" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* PROVIDERS SUB-ROW */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] font-mono block">
            PROVIDERS
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 font-mono">
            {/* UPSTOX */}
            <div className="p-2 rounded-xl bg-[#0a1526] border border-[#1d4ed8]/40 hover:border-[#38bdf8] transition-all flex flex-col justify-between h-[72px]">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
                <span className="font-bold text-[11px] text-white">UPSTOX</span>
              </div>
              <div className="flex items-center gap-1 text-[9px] font-bold">
                <span className="px-1.5 py-0.2 rounded bg-[#064e3b] text-[#10b981]">DATA LIVE</span>
                <span className="px-1.5 py-0.2 rounded bg-[#064e3b] text-[#10b981]">EXEC READY</span>
              </div>
              <div className="text-[11px] font-bold text-[#38bdf8]">18 ms</div>
            </div>

            {/* DHAN */}
            <div className="p-2 rounded-xl bg-[#1f0b12] border border-[#ef4444]/40 hover:border-[#ef4444] transition-all flex flex-col justify-between h-[72px]">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
                <span className="font-bold text-[11px] text-[#ef4444]">DHAN</span>
              </div>
              <div>
                <span className="px-1.5 py-0.5 rounded bg-[#450a0a] border border-[#ef4444]/40 text-[#ef4444] text-[9px] font-bold">
                  AUTH FAILED
                </span>
              </div>
              <div className="text-[11px] text-[#64748b]">--</div>
            </div>

            {/* DELTA INDIA */}
            <div className="p-2 rounded-xl bg-[#0a1526] border border-[#10b981]/40 hover:border-[#10b981] transition-all flex flex-col justify-between h-[72px]">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
                <span className="font-bold text-[11px] text-white">DELTA INDIA</span>
              </div>
              <div className="flex items-center gap-1 text-[9px] font-bold">
                <span className="px-1.5 py-0.2 rounded bg-[#064e3b] text-[#10b981]">DATA LIVE</span>
                <span className="px-1.5 py-0.2 rounded bg-[#064e3b] text-[#10b981]">EXEC READY</span>
              </div>
              <div className="text-[11px] font-bold text-[#38bdf8]">24 ms</div>
            </div>

            {/* BINANCE */}
            <div className="p-2 rounded-xl bg-[#0a1526] border border-[#10b981]/40 hover:border-[#10b981] transition-all flex flex-col justify-between h-[72px]">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
                <span className="font-bold text-[11px] text-white">BINANCE</span>
              </div>
              <div className="flex items-center gap-1 text-[9px] font-bold">
                <span className="px-1.5 py-0.2 rounded bg-[#064e3b] text-[#10b981]">DATA LIVE</span>
                <span className="px-1.5 py-0.2 rounded bg-[#064e3b] text-[#10b981]">EXEC READY</span>
              </div>
              <div className="text-[11px] font-bold text-[#38bdf8]">31 ms</div>
            </div>

            {/* ZERODHA */}
            <div className="p-2 rounded-xl bg-[#1c1408] border border-[#f59e0b]/40 hover:border-[#f59e0b] transition-all flex flex-col justify-between h-[72px]">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
                <span className="font-bold text-[11px] text-[#fbbf24]">ZERODHA</span>
              </div>
              <div className="flex items-center gap-1 text-[9px] font-bold">
                <span className="px-1.5 py-0.2 rounded bg-[#451a03] text-[#fbbf24]">DEGRADED</span>
                <span className="px-1.5 py-0.2 rounded bg-[#064e3b] text-[#10b981]">EXEC READY</span>
              </div>
              <div className="text-[11px] font-bold text-[#fbbf24]">52 ms</div>
            </div>

            {/* ANGEL */}
            <div className="p-2 rounded-xl bg-[#08101e] border border-[#13233c] flex flex-col justify-between h-[72px]">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#64748b]" />
                <span className="font-bold text-[11px] text-[#64748b]">ANGEL</span>
              </div>
              <div>
                <span className="px-1.5 py-0.5 rounded bg-[#1e293b] text-[#94a3b8] text-[9px] font-bold">
                  NOT CONFIGURED
                </span>
              </div>
              <div className="text-[11px] text-[#64748b]">--</div>
            </div>

            {/* PAPER SIM */}
            <div className="p-2 rounded-xl bg-[#0a1526] border border-[#6366f1]/40 hover:border-[#818cf8] transition-all flex flex-col justify-between h-[72px] relative">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
                <span className="font-bold text-[11px] text-white">PAPER SIM</span>
              </div>
              <div className="flex items-center gap-1 text-[9px] font-bold">
                <span className="px-1.5 py-0.2 rounded bg-[#064e3b] text-[#10b981]">DATA LIVE</span>
                <span className="px-1.5 py-0.2 rounded bg-[#064e3b] text-[#10b981]">EXEC READY</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#10b981]">12 ms</span>
                {/* Purple waveform */}
                <svg className="w-8 h-3 stroke-[#818cf8] fill-none" viewBox="0 0 30 10">
                  <path d="M0,5 Q7,0 15,8 T30,4" strokeWidth="1.2" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Box: SYSTEM HEALTH + MARKET OVERVIEW (4 Columns on desktop) ── */}
      <div className="lg:col-span-4 flex flex-col gap-2.5 justify-between">
        {/* SYSTEM HEALTH Card */}
        <div className="p-3 rounded-2xl bg-[#08101e] border border-[#13233c] shadow-lg flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] font-mono mb-2">
            SYSTEM HEALTH
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[#94a3b8]">Gateway</span>
              <span className="text-[#10b981] font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" /> Healthy
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#94a3b8]">Providers</span>
              <span className="text-[#fbbf24] font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#fbbf24]" /> Degraded
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#94a3b8]">Bot Workers</span>
              <span className="text-[#10b981] font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" /> Healthy
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#94a3b8]">OMS</span>
              <span className="text-[#10b981] font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" /> Healthy
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#94a3b8]">Risk Engine</span>
              <span className="text-[#10b981] font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" /> Healthy
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#94a3b8]">Database</span>
              <span className="text-[#10b981] font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" /> Healthy
              </span>
            </div>
          </div>
        </div>

        {/* MARKET OVERVIEW Card */}
        <div className="p-3 rounded-2xl bg-[#08101e] border border-[#13233c] shadow-lg flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] font-mono mb-2">
            MARKET OVERVIEW
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#050b14] border border-[#13233c]">
              <span className="font-bold text-[#38bdf8]">NIFTY</span>
              <span className="text-[#10b981] font-bold">506.25 +1.2%</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#050b14] border border-[#13233c]">
              <span className="font-bold text-[#38bdf8]">BANKNIFTY</span>
              <span className="text-[#ef4444] font-bold">-120.40 -0.8%</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#050b14] border border-[#13233c]">
              <span className="font-bold text-white">BTCUSDT</span>
              <span className="text-[#10b981] font-bold">84632.15 +2.4%</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#050b14] border border-[#13233c]">
              <span className="font-bold text-white">ETHUSDT</span>
              <span className="text-[#ef4444] font-bold">3142.60 -1.1%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
