"use client";

import React, { useState } from "react";
import {
  DollarSign,
  PieChart,
  Bot,
  Layers,
  Coins,
  Shield,
  TrendingUp,
  Percent,
  Wallet,
} from "lucide-react";
import { RiskOverviewState } from "@/types/risk";

interface CapitalControlCenterProps {
  overview: RiskOverviewState;
}

export function CapitalControlCenter({ overview }: CapitalControlCenterProps) {
  const [allocationTab, setAllocationTab] = useState<"bot" | "strategy" | "symbol" | "asset">("bot");

  const totalCap = overview.account_balance || 10000.0;
  const availCap = overview.available_capital || 6800.0;
  const usedCap = overview.capital_used || 3200.0;
  const reserveCap = 3500.0;
  const marginUsed = overview.margin_used || 3200.0;
  const marginAvail = totalCap - marginUsed;

  const botAllocations = [
    { name: "BTC Scalper Bot", allocated: 2000.0, used: 1200.0, pct: 20.0, pnl: 145.2, status: "ACTIVE" },
    { name: "NIFTY Alpha Trend", allocated: 3000.0, used: 1100.0, pct: 30.0, pnl: 88.4, status: "ACTIVE" },
    { name: "Options Iron Condor", allocated: 1500.0, used: 900.0, pct: 15.0, pnl: 52.5, status: "ACTIVE" },
    { name: "Capital Reserve & Buffer", allocated: 3500.0, used: 0.0, pct: 35.0, pnl: 0.0, status: "LOCKED" },
  ];

  const strategyAllocations = [
    { name: "Multi-Timeframe Trend Confluence", allocated: 3500.0, used: 1400.0, pct: 35.0 },
    { name: "EMA Dynamic Crossover", allocated: 2500.0, used: 900.0, pct: 25.0 },
    { name: "Iron Condor Range", allocated: 1500.0, used: 900.0, pct: 15.0 },
    { name: "Unallocated Reserve", allocated: 2500.0, used: 0.0, pct: 25.0 },
  ];

  const symbolAllocations = [
    { name: "BTC/USDT", allocated: 3200.0, used: 1800.0, pct: 32.0 },
    { name: "NIFTY 50", allocated: 2800.0, used: 1400.0, pct: 28.0 },
    { name: "ETH/USDT", allocated: 1500.0, used: 0.0, pct: 15.0 },
    { name: "Cash Reserve", allocated: 2500.0, used: 0.0, pct: 25.0 },
  ];

  const assetAllocations = [
    { name: "Crypto Derivatives", allocated: 4500.0, used: 1800.0, pct: 45.0 },
    { name: "Index Options & Futures", allocated: 3000.0, used: 1400.0, pct: 30.0 },
    { name: "Equities / Spot", allocated: 1000.0, used: 0.0, pct: 10.0 },
    { name: "Cash Treasury", allocated: 1500.0, used: 0.0, pct: 15.0 },
  ];

  const activeList =
    allocationTab === "bot"
      ? botAllocations
      : allocationTab === "strategy"
      ? strategyAllocations
      : allocationTab === "symbol"
      ? symbolAllocations
      : assetAllocations;

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Capital Control Center
          </h3>
          <p className="text-[11px] text-[#A8BDB0]">
            Authoritative balance ledger, reserved margins, and capital distribution tiers.
          </p>
        </div>
        <span className="text-[10px] px-2.5 py-0.5 rounded font-mono font-bold uppercase bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40">
          Server Authoritative
        </span>
      </div>

      {/* 6 Key Capital Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
        <div className="p-3 rounded-2xl bg-[#0D1914] border border-[#1B3328]">
          <span className="text-[10px] text-[#70877A] uppercase font-bold block">Total Capital</span>
          <span className="text-base font-bold text-white">${totalCap.toLocaleString()}</span>
          <span className="text-[10px] text-[#A8BDB0] block">Account Equity</span>
        </div>

        <div className="p-3 rounded-2xl bg-[#0D1914] border border-[#1B3328]">
          <span className="text-[10px] text-[#70877A] uppercase font-bold block">Available Capital</span>
          <span className="text-base font-bold text-[#55C98A]">${availCap.toLocaleString()}</span>
          <span className="text-[10px] text-[#70877A] block">{((availCap / totalCap) * 100).toFixed(0)}% Free Cash</span>
        </div>

        <div className="p-3 rounded-2xl bg-[#0D1914] border border-[#1B3328]">
          <span className="text-[10px] text-[#70877A] uppercase font-bold block">Used Capital</span>
          <span className="text-base font-bold text-cyan-300">${usedCap.toLocaleString()}</span>
          <span className="text-[10px] text-[#70877A] block">Active In Trade</span>
        </div>

        <div className="p-3 rounded-2xl bg-[#0D1914] border border-[#1B3328]">
          <span className="text-[10px] text-[#70877A] uppercase font-bold block">Reserved Capital</span>
          <span className="text-base font-bold text-purple-300">${reserveCap.toLocaleString()}</span>
          <span className="text-[10px] text-[#70877A] block">Safety Buffer</span>
        </div>

        <div className="p-3 rounded-2xl bg-[#0D1914] border border-[#1B3328]">
          <span className="text-[10px] text-[#70877A] uppercase font-bold block">Margin Available</span>
          <span className="text-base font-bold text-emerald-400">${marginAvail.toLocaleString()}</span>
          <span className="text-[10px] text-[#70877A] block">For New Orders</span>
        </div>

        <div className="p-3 rounded-2xl bg-[#0D1914] border border-[#1B3328]">
          <span className="text-[10px] text-[#70877A] uppercase font-bold block">Today&apos;s P&L</span>
          <span className="text-base font-bold text-[#55C98A]">+$286.10</span>
          <span className="text-[10px] text-[#70877A] block">+2.86% Return</span>
        </div>
      </div>

      {/* Capital Allocation Explorer Table with Tabs */}
      <div className="p-4 rounded-2xl bg-[#0D1914] border border-[#1B3328] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1B3328] pb-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-[#55C98A]" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Capital Distribution & Quota Management
            </h4>
          </div>

          <div className="flex items-center gap-1 bg-[#07110D] p-1 rounded-xl border border-[#1B3328] text-xs font-mono">
            {(["bot", "strategy", "symbol", "asset"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setAllocationTab(t)}
                className={`px-3 py-1 rounded-lg font-bold uppercase transition-all ${
                  allocationTab === t
                    ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40 shadow-sm"
                    : "text-[#A8BDB0] hover:text-white"
                }`}
              >
                By {t}
              </button>
            ))}
          </div>
        </div>

        {/* Allocation List */}
        <div className="space-y-2.5 text-xs font-mono">
          {activeList.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-[#07110D] border border-[#1B3328] flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-[#2E7D5B] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#123C2A] text-[#55C98A] font-bold">
                  {item.pct}%
                </div>
                <div>
                  <span className="font-bold text-white block">{item.name}</span>
                  <span className="text-[10px] text-[#70877A]">Allocated: ${item.allocated.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <span className="text-[10px] text-[#70877A] block">Active Used</span>
                  <span className="font-bold text-cyan-300">${item.used.toLocaleString()}</span>
                </div>
                <div className="w-24 bg-[#0A130F] h-2 rounded-full overflow-hidden border border-[#1B3328] hidden sm:block">
                  <div
                    className="bg-[#55C98A] h-full rounded-full"
                    style={{ width: `${(item.used / item.allocated) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
