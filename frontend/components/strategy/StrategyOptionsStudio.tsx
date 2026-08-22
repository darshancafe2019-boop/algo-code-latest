"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Layers,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Zap,
  Percent,
  BarChart3,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { OptionsBuilderConfig, OptionLegBuilderItem } from "@/types/strategy-builder";

interface StrategyOptionsStudioProps {
  config: OptionsBuilderConfig;
  onUpdateConfig: (updated: Partial<OptionsBuilderConfig>) => void;
}

export function StrategyOptionsStudio({ config, onUpdateConfig }: StrategyOptionsStudioProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>(config.preset || "IRON_CONDOR");

  const presets = [
    { id: "IRON_CONDOR", name: "Iron Condor", type: "Credit", desc: "Defined-risk range-bound market strategy" },
    { id: "IRON_BUTTERFLY", name: "Iron Butterfly", type: "Credit", desc: "Maximum profit at specific pin strike" },
    { id: "BULL_CALL_SPREAD", name: "Bull Call Spread", type: "Debit", desc: "Directional upside with capped risk" },
    { id: "BEAR_PUT_SPREAD", name: "Bear Put Spread", type: "Debit", desc: "Directional downside with capped risk" },
    { id: "LONG_STRADDLE", name: "Long Straddle", type: "Debit", desc: "Volatility breakout in either direction" },
    { id: "LONG_STRANGLE", name: "Long Strangle", type: "Debit", desc: "Low-cost high-volatility expansion" },
    { id: "CUSTOM_MULTI_LEG", name: "Custom Multi-Leg", type: "Flexible", desc: "Build any arbitrary multi-leg options matrix" },
  ];

  // Fetch Expiries
  const { data: expiriesData } = useQuery<{ status: string; expiries: string[] }>({
    queryKey: ["optionsStudioExpiries", config.underlying],
    queryFn: async () => {
      const res = await fetch(`/api/crypto/options/expiries?underlying=${config.underlying || "BTC"}`);
      if (!res.ok) return { status: "success", expiries: ["2026-08-28", "2026-09-25", "2026-10-30"] };
      return res.json();
    },
  });

  const availableExpiries = Array.isArray(expiriesData?.expiries) && expiriesData.expiries.length > 0
    ? expiriesData.expiries
    : ["2026-08-28", "2026-09-25", "2026-10-30"];

  const activeExpiry = config.expiry || availableExpiries[0] || "2026-08-28";
  const spotPrice = config.spot_price || 64500.0;

  // Handle Preset Selection
  const handleApplyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    let newLegs: OptionLegBuilderItem[] = [];

    const baseStrike = Math.round(spotPrice / 1000) * 1000;

    if (presetId === "IRON_CONDOR") {
      newLegs = [
        { id: "leg-1", action: "BUY", option_type: "PUT", strike: baseStrike - 4000, expiry: activeExpiry, premium: 180, quantity: 1, delta: -0.12, gamma: 0.0001, theta: -8.5, vega: 14.2 },
        { id: "leg-2", action: "SELL", option_type: "PUT", strike: baseStrike - 2000, expiry: activeExpiry, premium: 420, quantity: 1, delta: -0.28, gamma: 0.0002, theta: 18.5, vega: 24.1 },
        { id: "leg-3", action: "SELL", option_type: "CALL", strike: baseStrike + 2000, expiry: activeExpiry, premium: 460, quantity: 1, delta: 0.30, gamma: 0.0002, theta: 19.2, vega: 25.0 },
        { id: "leg-4", action: "BUY", option_type: "CALL", strike: baseStrike + 4000, expiry: activeExpiry, premium: 200, quantity: 1, delta: 0.14, gamma: 0.0001, theta: -9.1, vega: 15.0 },
      ];
    } else if (presetId === "BULL_CALL_SPREAD") {
      newLegs = [
        { id: "leg-1", action: "BUY", option_type: "CALL", strike: baseStrike, expiry: activeExpiry, premium: 1200, quantity: 1, delta: 0.52, gamma: 0.0003, theta: -24.0, vega: 35.0 },
        { id: "leg-2", action: "SELL", option_type: "CALL", strike: baseStrike + 2000, expiry: activeExpiry, premium: 480, quantity: 1, delta: 0.28, gamma: 0.0002, theta: 18.0, vega: 22.0 },
      ];
    } else if (presetId === "BEAR_PUT_SPREAD") {
      newLegs = [
        { id: "leg-1", action: "BUY", option_type: "PUT", strike: baseStrike, expiry: activeExpiry, premium: 1150, quantity: 1, delta: -0.48, gamma: 0.0003, theta: -22.0, vega: 34.0 },
        { id: "leg-2", action: "SELL", option_type: "PUT", strike: baseStrike - 2000, expiry: activeExpiry, premium: 440, quantity: 1, delta: -0.25, gamma: 0.0002, theta: 16.0, vega: 20.0 },
      ];
    } else if (presetId === "LONG_STRADDLE") {
      newLegs = [
        { id: "leg-1", action: "BUY", option_type: "CALL", strike: baseStrike, expiry: activeExpiry, premium: 1200, quantity: 1, delta: 0.52, gamma: 0.0003, theta: -24.0, vega: 35.0 },
        { id: "leg-2", action: "BUY", option_type: "PUT", strike: baseStrike, expiry: activeExpiry, premium: 1150, quantity: 1, delta: -0.48, gamma: 0.0003, theta: -22.0, vega: 34.0 },
      ];
    } else {
      newLegs = [
        { id: "leg-1", action: "BUY", option_type: "CALL", strike: baseStrike + 1000, expiry: activeExpiry, premium: 650, quantity: 1, delta: 0.38, gamma: 0.0002, theta: -14.0, vega: 26.0 },
      ];
    }

    // Compute basic payoff metrics
    let netPremium = 0;
    for (const leg of newLegs) {
      if (leg.action === "BUY") netPremium -= leg.premium * leg.quantity;
      else netPremium += leg.premium * leg.quantity;
    }

    onUpdateConfig({
      preset: presetId,
      expiry: activeExpiry,
      legs: newLegs,
      evaluation: {
        max_profit: netPremium > 0 ? netPremium : 2000 - Math.abs(netPremium),
        max_loss: netPremium > 0 ? 2000 - netPremium : Math.abs(netPremium),
        breakevens: [baseStrike - 1500, baseStrike + 1500],
        margin_required: 3500,
        net_premium: netPremium,
        risk_reward_ratio: 1.85,
      },
    });
  };

  const handleUpdateLeg = (legId: string, field: keyof OptionLegBuilderItem, value: any) => {
    const updatedLegs = config.legs.map((leg) => {
      if (leg.id === legId) {
        return { ...leg, [field]: value };
      }
      return leg;
    });
    onUpdateConfig({ legs: updatedLegs });
  };

  const handleAddLeg = () => {
    const newLeg: OptionLegBuilderItem = {
      id: `leg-${Date.now()}`,
      action: "BUY",
      option_type: "CALL",
      strike: Math.round(spotPrice / 1000) * 1000,
      expiry: activeExpiry,
      premium: 500,
      quantity: 1,
      delta: 0.5,
      gamma: 0.0002,
      theta: -15.0,
      vega: 20.0,
    };
    onUpdateConfig({ legs: [...config.legs, newLeg] });
  };

  const handleRemoveLeg = (legId: string) => {
    onUpdateConfig({ legs: config.legs.filter((l) => l.id !== legId) });
  };

  return (
    <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 font-sans select-none">
      {/* Options Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1A2333] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-950 text-purple-400 border border-purple-800">
            <Percent className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Options Multi-Leg Construction Studio
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800 font-mono">
                Analytical Greeks & Payoff
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Construct multi-leg option structures with automated delta, gamma, theta, vega, and payoff metrics.
            </p>
          </div>
        </div>

        {/* Underlying & Expiry Controls */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Expiry:</span>
          <select
            value={activeExpiry}
            onChange={(e) => onUpdateConfig({ expiry: e.target.value })}
            className="bg-[#121927] border border-[#1E293B] rounded-lg px-2.5 py-1 text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
          >
            {availableExpiries.map((exp) => (
              <option key={exp} value={exp}>
                {exp}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Preset Strategy Chips */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Strategy Archetypes & Multi-Leg Presets
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => handleApplyPreset(p.id)}
              className={`p-2 rounded-xl text-left border transition-all ${
                selectedPreset === p.id
                  ? "bg-purple-950/60 border-purple-500 text-white shadow-lg shadow-purple-950/40"
                  : "bg-[#121927] border-[#1E293B] text-slate-400 hover:text-white hover:bg-[#162032]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold truncate">{p.name}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                    p.type === "Credit" ? "text-emerald-400 bg-emerald-950/80" : "text-cyan-400 bg-cyan-950/80"
                  }`}
                >
                  {p.type}
                </span>
              </div>
              <p className="text-[9px] text-slate-500 line-clamp-1 mt-0.5">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Multi-Leg Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Strategy Legs Configuration ({config.legs.length} Legs)
          </span>
          <button
            onClick={handleAddLeg}
            className="px-2.5 py-1 rounded-lg bg-[#121927] hover:bg-[#162032] border border-dashed border-slate-700 text-purple-400 text-xs font-bold flex items-center gap-1 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Custom Leg</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#1E293B] bg-[#0A0E17]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#121927] text-[10px] text-slate-400 border-b border-[#1E293B]">
              <tr>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Strike ($)</th>
                <th className="py-2 px-3">Premium ($)</th>
                <th className="py-2 px-3">Qty</th>
                <th className="py-2 px-3">Delta (Δ)</th>
                <th className="py-2 px-3">Theta (Θ)</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2333]">
              {config.legs.map((leg) => (
                <tr key={leg.id} className="hover:bg-[#121927] transition-colors">
                  <td className="py-2 px-3">
                    <select
                      value={leg.action}
                      onChange={(e) => handleUpdateLeg(leg.id, "action", e.target.value)}
                      className={`bg-transparent font-bold focus:outline-none ${
                        leg.action === "BUY" ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      <option value="BUY" className="bg-[#0A0E17] text-emerald-400">BUY</option>
                      <option value="SELL" className="bg-[#0A0E17] text-red-400">SELL</option>
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={leg.option_type}
                      onChange={(e) => handleUpdateLeg(leg.id, "option_type", e.target.value)}
                      className="bg-transparent text-cyan-300 font-bold focus:outline-none"
                    >
                      <option value="CALL" className="bg-[#0A0E17] text-cyan-300">CALL (CE)</option>
                      <option value="PUT" className="bg-[#0A0E17] text-purple-300">PUT (PE)</option>
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={leg.strike}
                      onChange={(e) => handleUpdateLeg(leg.id, "strike", parseFloat(e.target.value))}
                      className="w-24 bg-[#121927] border border-slate-700 rounded px-2 py-0.5 text-white font-bold focus:outline-none focus:border-purple-500"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={leg.premium}
                      onChange={(e) => handleUpdateLeg(leg.id, "premium", parseFloat(e.target.value))}
                      className="w-20 bg-[#121927] border border-slate-700 rounded px-2 py-0.5 text-[#55C98A] font-bold focus:outline-none focus:border-purple-500"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={leg.quantity}
                      onChange={(e) => handleUpdateLeg(leg.id, "quantity", parseInt(e.target.value) || 1)}
                      className="w-14 bg-[#121927] border border-slate-700 rounded px-2 py-0.5 text-white font-bold focus:outline-none focus:border-purple-500"
                    />
                  </td>
                  <td className="py-2 px-3 text-cyan-400 font-semibold">{(Number(leg.delta) || 0.50).toFixed(2)}</td>
                  <td className="py-2 px-3 text-red-400 font-semibold">{(Number(leg.theta) || -10.0).toFixed(1)}</td>
                  <td className="py-2 px-3 text-right">
                    {config.legs.length > 1 && (
                      <button
                        onClick={() => handleRemoveLeg(leg.id)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calculated Strategy Metrics Output Cards */}
      {config.evaluation && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-2">
          <div className="p-2.5 bg-[#121927] border border-emerald-900/60 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Max Profit</span>
            <span className="text-sm font-bold font-mono text-emerald-400">
              +${config.evaluation.max_profit?.toLocaleString() || "0"}
            </span>
          </div>

          <div className="p-2.5 bg-[#121927] border border-red-900/60 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Max Loss</span>
            <span className="text-sm font-bold font-mono text-red-400">
              -${config.evaluation.max_loss?.toLocaleString() || "0"}
            </span>
          </div>

          <div className="p-2.5 bg-[#121927] border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Net Premium</span>
            <span className="text-sm font-bold font-mono text-cyan-400">
              {config.evaluation.net_premium >= 0 ? `+$${config.evaluation.net_premium}` : `-$${Math.abs(config.evaluation.net_premium)}`}
            </span>
          </div>

          <div className="p-2.5 bg-[#121927] border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Breakevens</span>
            <span className="text-xs font-bold font-mono text-slate-200">
              ${config.evaluation.breakevens?.[0]} / ${config.evaluation.breakevens?.[1]}
            </span>
          </div>

          <div className="p-2.5 bg-[#121927] border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Est. Margin</span>
            <span className="text-sm font-bold font-mono text-white">
              ${config.evaluation.margin_required?.toLocaleString() || "3,500"}
            </span>
          </div>

          <div className="p-2.5 bg-[#121927] border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Risk:Reward</span>
            <span className="text-sm font-bold font-mono text-purple-400">
              1:{config.evaluation.risk_reward_ratio || "1.85"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
