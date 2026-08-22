"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Sparkles,
  Sliders,
  TrendingDown,
  TrendingUp,
  Activity,
  AlertTriangle,
  RefreshCw,
  Shield,
  Layers,
  ArrowRight,
} from "lucide-react";
import { WhatIfScenarioResult } from "@/types/risk";

export function WhatIfSimulator() {
  const [selectedScenario, setSelectedScenario] = useState<string>("market_drop_5");
  const [customPricePct, setCustomPricePct] = useState<number>(-5.0);
  const [customVolPct, setCustomVolPct] = useState<number>(10.0);
  const [simResults, setSimResults] = useState<WhatIfScenarioResult[] | null>(null);

  const presetScenarios = [
    { id: "market_drop_5", name: "BTC / Market Shock -5%", price: -5.0, vol: 10.0 },
    { id: "market_drop_10", name: "Market Crash -10%", price: -10.0, vol: 25.0 },
    { id: "market_drop_20", name: "Severe Macro Crash -20%", price: -20.0, vol: 50.0 },
    { id: "market_pump_5", name: "Bull Rally +5%", price: 5.0, vol: -5.0 },
    { id: "vol_spike_50", name: "Volatility Explosion +50%", price: -2.0, vol: 50.0 },
    { id: "gap_down_3", name: "Overnight Gap Down -3%", price: -3.0, vol: 15.0 },
  ];

  // Stress Test / What-If Simulation Mutation
  const stressTestMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        equity: 10000.0,
        positions: [
          { symbol: "BTC/USDT", direction: "LONG", position_value: 3271.0, leverage: 1.0, beta: 1.0 },
          { symbol: "NIFTY-CE", direction: "LONG", position_value: 8250.0, leverage: 1.0, beta: 1.2 },
        ],
      };

      const res = await fetch("/api/risk/stress-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      setSimResults(data.scenarios || []);
    },
  });

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            What-If Scenario Stress Testing Simulator
          </h3>
          <p className="text-[11px] text-[#A8BDB0]">
            Simulate macro price shocks, volatility spikes, and gap downs against your live portfolio.
          </p>
        </div>
        <span className="text-[10px] px-2.5 py-0.5 rounded font-mono font-bold uppercase bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40">
          Simulation Only • Zero Order Execution
        </span>
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs font-mono">
        {presetScenarios.map((sc) => (
          <button
            key={sc.id}
            type="button"
            onClick={() => {
              setSelectedScenario(sc.id);
              setCustomPricePct(sc.price);
              setCustomVolPct(sc.vol);
            }}
            className={`p-2.5 rounded-xl text-left border transition-all space-y-1 ${
              selectedScenario === sc.id
                ? "bg-[#123C2A] text-[#55C98A] border-[#39B978]/60 shadow-md"
                : "bg-[#0D1914] text-[#A8BDB0] hover:text-white border-[#1B3328]"
            }`}
          >
            <span className="font-bold block text-[11px] truncate">{sc.name}</span>
            <span className="text-[10px] text-[#70877A] block">
              {sc.price > 0 ? "+" : ""}{sc.price}% Price • {sc.vol > 0 ? "+" : ""}{sc.vol}% Vol
            </span>
          </button>
        ))}
      </div>

      {/* Action Trigger Card */}
      <div className="p-4 rounded-2xl bg-[#0D1914] border border-[#1B3328] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#123C2A] text-[#55C98A]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="text-white font-bold block">
              Active Scenario: {presetScenarios.find((s) => s.id === selectedScenario)?.name || "Custom Shock"}
            </span>
            <span className="text-[11px] text-[#A8BDB0]">
              Evaluates multi-asset portfolio drawdown, liquidation buffer, and margin strain.
            </span>
          </div>
        </div>

        <button
          onClick={() => stressTestMutation.mutate()}
          disabled={stressTestMutation.isPending}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md"
        >
          {stressTestMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
          <span>Run Portfolio Stress Simulation</span>
        </button>
      </div>

      {/* Simulation Results Grid */}
      {simResults && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono animate-fadeIn">
          {simResults.map((res) => {
            const isLoss = res.projected_pnl < 0;
            return (
              <div
                key={res.scenario_id}
                className="p-3.5 rounded-2xl bg-[#07110D] border border-[#1B3328] space-y-2 hover:border-[#2E7D5B] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-[11px]">{res.scenario_name}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      res.risk_status === "CRITICAL"
                        ? "bg-red-950 text-red-400 border border-red-800"
                        : res.risk_status === "HIGH RISK"
                        ? "bg-amber-950 text-amber-400 border border-amber-800"
                        : "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40"
                    }`}
                  >
                    {res.risk_status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] text-[#70877A] block">Projected P&L</span>
                    <span
                      className={`text-sm font-bold block ${
                        isLoss ? "text-red-400" : "text-[#55C98A]"
                      }`}
                    >
                      {res.projected_pnl > 0 ? "+" : ""}${res.projected_pnl.toFixed(2)} ({res.projected_pnl_pct}%)
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#70877A] block">Projected Equity</span>
                    <span className="text-sm font-bold text-white block">
                      ${res.projected_equity.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
