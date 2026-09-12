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
import { OptionLegBuilderItem, OptionsBuilderConfig } from "@/types/strategy-builder";
import { normalizeExpiriesList } from "@/lib/expiry-utils";
import { RawExpiryItem } from "@/types/option-chain";
import { QosButton, QosBadge } from "@/components/ui/QosComponents";

interface Props {
  config: OptionsBuilderConfig;
  onUpdateConfig: (partial: Partial<OptionsBuilderConfig>) => void;
}

export function StrategyOptionsStudio({ config, onUpdateConfig }: Props) {
  const [selectedPreset, setSelectedPreset] = useState<string>("IRON_CONDOR");

  const presets = [
    { id: "IRON_CONDOR", name: "Iron Condor", type: "Neutral", desc: "4-Leg range-bound income strategy" },
    { id: "BULL_CALL_SPREAD", name: "Bull Call Spread", type: "Bullish", desc: "2-Leg defined risk directional upside" },
    { id: "BEAR_PUT_SPREAD", name: "Bear Put Spread", type: "Bearish", desc: "2-Leg defined risk directional downside" },
    { id: "LONG_STRADDLE", name: "Long Straddle", type: "Volatility", desc: "2-Leg long volatility breakout" },
    { id: "STRANGLE", name: "Long Strangle", type: "Volatility", desc: "2-Leg OTM long volatility play" },
    { id: "CALENDAR_SPREAD", name: "Calendar Spread", type: "Time Decay", desc: "Time decay harvesting across expiries" },
    { id: "CUSTOM_MULTI_LEG", name: "Custom Multi-Leg", type: "Flexible", desc: "Build any arbitrary multi-leg options matrix" },
  ];

  // Fetch Expiries
  const { data: expiriesData } = useQuery<{ status: string; expiries: RawExpiryItem[] }>({
    queryKey: ["optionsStudioExpiries", config.underlying],
    queryFn: async () => {
      const res = await fetch(`/api/crypto/options/expiries?underlying=${config.underlying || "BTC"}`);
      if (!res.ok) return { status: "success", expiries: ["2026-08-28", "2026-09-25", "2026-10-30"] };
      return res.json();
    },
  });

  const normalizedExpiries = React.useMemo(() => {
    const raw = Array.isArray(expiriesData?.expiries) && expiriesData.expiries.length > 0
      ? expiriesData.expiries
      : ["2026-08-28", "2026-09-25", "2026-10-30"];
    return normalizeExpiriesList(raw, config.underlying || "BTC");
  }, [expiriesData?.expiries, config.underlying]);

  const activeExpiry = config.expiry || normalizedExpiries[0]?.value || "2026-08-28";
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

    let netPremium = 0;
    for (const leg of newLegs) {
      if (leg.action === "BUY") netPremium -= leg.premium * leg.quantity;
      else netPremium += leg.premium * leg.quantity;
    }

    onUpdateConfig({
      preset: presetId as any,
      legs: newLegs,
      max_profit: netPremium > 0 ? netPremium : 2000 - Math.abs(netPremium),
      max_loss: netPremium > 0 ? 2000 - netPremium : Math.abs(netPremium),
      greeks_total: {
        delta: Math.round(newLegs.reduce((acc, l) => acc + (l.delta || 0) * (l.action === "BUY" ? 1 : -1), 0) * 100) / 100,
        gamma: Math.round(newLegs.reduce((acc, l) => acc + (l.gamma || 0), 0) * 10000) / 10000,
        theta: Math.round(newLegs.reduce((acc, l) => acc + (l.theta || 0) * (l.action === "BUY" ? 1 : -1), 0) * 10) / 10,
        vega: Math.round(newLegs.reduce((acc, l) => acc + (l.vega || 0) * (l.action === "BUY" ? 1 : -1), 0) * 10) / 10,
      },
    });
  };

  const legs = config.legs || [];

  return (
    <div className="bg-[#0A1422] border border-[#12304A] rounded-xl p-3.5 sm:p-4 shadow-sm space-y-3.5 font-sans select-none text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#12304A] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#A78BFA]/10 text-[#A78BFA] border border-[#A78BFA]/30">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
              Options Multi-Leg Architecture Studio
            </h3>
            <p className="text-[11px] text-[#7D8EA5]">
              Configure single & multi-leg spreads, strike offsets, delta targets, and net Greeks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-[#7D8EA5]">Underlying Spot:</span>
          <span className="text-[#F8FAFC] font-bold">${spotPrice.toLocaleString()}</span>
        </div>
      </div>

      {/* Preset Strategy Templates */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono text-[#7D8EA5] uppercase font-bold">Strategy Presets</span>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {presets.map((p) => {
            const isSelected = selectedPreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                  isSelected
                    ? "bg-[#168BFF] text-white border-[#168BFF] font-bold"
                    : "bg-[#0C1727] text-[#7D8EA5] hover:text-[#F8FAFC] border-[#12304A]"
                }`}
              >
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Options Legs Table */}
      <div className="space-y-1.5 font-mono text-xs">
        <div className="flex items-center justify-between text-[10px] text-[#7D8EA5] uppercase font-bold">
          <span>Configured Option Legs ({legs.length})</span>
          <span>Expiry: {activeExpiry}</span>
        </div>

        <div className="space-y-1.5">
          {legs.map((leg, idx) => (
            <div
              key={leg.id || idx}
              className="p-2.5 rounded-lg bg-[#0C1727] border border-[#12304A] flex items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    leg.action === "BUY"
                      ? "bg-[#00E89A]/15 text-[#00E89A] border border-[#00E89A]/30"
                      : "bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30"
                  }`}
                >
                  {leg.action}
                </span>
                <span className="font-bold text-[#F8FAFC]">
                  {leg.strike} {leg.option_type}
                </span>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-[#7D8EA5]">
                <span>Prem: ${leg.premium}</span>
                <span>Delta: {leg.delta}</span>
                <span>Qty: {leg.quantity}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
