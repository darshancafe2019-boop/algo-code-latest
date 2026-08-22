"use client";

import React from "react";
import {
  Layers,
  PieChart,
  Scale,
  Percent,
  Sliders,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { RiskOverviewState, RiskHeatmapItem } from "@/types/risk";

interface ExposureControlPanelProps {
  overview: RiskOverviewState;
  heatmap?: RiskHeatmapItem[];
}

export function ExposureControlPanel({ overview, heatmap = [] }: ExposureControlPanelProps) {
  const balance = overview.account_balance || 10000.0;
  const grossExp = overview.gross_exposure || 3200.0;
  const netExp = overview.net_exposure || 3200.0;
  const longExp = overview.long_exposure || 3200.0;
  const shortExp = overview.short_exposure || 0.0;
  const maxConcentrationLimit = overview.active_limits?.max_symbol_concentration_pct || 40.0;

  const concentrationItems = [
    { entity: "BTC/USDT (Crypto)", exposure: 3200.0, pct: 32.0, status: "SAFE" },
    { entity: "NIFTY Index Options", exposure: 2800.0, pct: 28.0, status: "SAFE" },
    { entity: "ETH/USDT Perps", exposure: 2000.0, pct: 20.0, status: "SAFE" },
    { entity: "Other / Equity Cash", exposure: 2000.0, pct: 20.0, status: "SAFE" },
  ];

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Exposure & Concentration Control
          </h3>
          <p className="text-[11px] text-[#A8BDB0]">
            Gross, Net, Directional exposure, and asset-level concentration bounds.
          </p>
        </div>
        <span className="text-[10px] px-2.5 py-0.5 rounded font-mono font-bold uppercase bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40">
          Max {maxConcentrationLimit}% Cap
        </span>
      </div>

      {/* 5 Exposure Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
        <div className="p-3 rounded-2xl bg-[#0D1914] border border-[#1B3328]">
          <span className="text-[10px] text-[#70877A] uppercase font-bold block">Gross Exposure</span>
          <span className="text-base font-bold text-white">${grossExp.toLocaleString()}</span>
          <span className="text-[10px] text-cyan-300 block">{((grossExp / balance) * 100).toFixed(1)}% of Capital</span>
        </div>

        <div className="p-3 rounded-2xl bg-[#0D1914] border border-[#1B3328]">
          <span className="text-[10px] text-[#70877A] uppercase font-bold block">Net Directional</span>
          <span className="text-base font-bold text-[#55C98A]">${netExp.toLocaleString()}</span>
          <span className="text-[10px] text-[#55C98A] block">Net Long Bias</span>
        </div>

        <div className="p-3 rounded-2xl bg-[#0D1914] border border-[#1B3328]">
          <span className="text-[10px] text-[#70877A] uppercase font-bold block">Long Exposure</span>
          <span className="text-base font-bold text-emerald-400">${longExp.toLocaleString()}</span>
          <span className="text-[10px] text-[#70877A] block">100% of Open Notional</span>
        </div>

        <div className="p-3 rounded-2xl bg-[#0D1914] border border-[#1B3328]">
          <span className="text-[10px] text-[#70877A] uppercase font-bold block">Short Exposure</span>
          <span className="text-base font-bold text-slate-400">${shortExp.toLocaleString()}</span>
          <span className="text-[10px] text-[#70877A] block">0% Short</span>
        </div>

        <div className="p-3 rounded-2xl bg-[#0D1914] border border-[#1B3328]">
          <span className="text-[10px] text-[#70877A] uppercase font-bold block">Effective Leverage</span>
          <span className="text-base font-bold text-purple-300">1.00x</span>
          <span className="text-[10px] text-[#70877A] block">Unleveraged / Spot Base</span>
        </div>
      </div>

      {/* Concentration Breakdown List */}
      <div className="p-4 rounded-2xl bg-[#0D1914] border border-[#1B3328] space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-[#1B3328] pb-2.5">
          <span>Portfolio Asset Concentration & Correlation Guard</span>
          <span className="text-[10px] text-[#70877A] font-mono">Limit: {maxConcentrationLimit}% Max Per Asset</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          {concentrationItems.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-[#07110D] border border-[#1B3328] space-y-2 hover:border-[#2E7D5B] transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{item.entity}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#123C2A] text-[#55C98A] font-bold border border-[#39B978]/40">
                  {item.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#70877A]">${item.exposure.toLocaleString()}</span>
                <span className="text-cyan-300 font-bold">{item.pct}% / {maxConcentrationLimit}% Cap</span>
              </div>

              <div className="w-full bg-[#0A130F] h-1.5 rounded-full overflow-hidden border border-[#1B3328]">
                <div
                  className="bg-[#55C98A] h-full rounded-full"
                  style={{ width: `${(item.pct / maxConcentrationLimit) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
