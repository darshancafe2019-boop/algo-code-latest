"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lock,
} from "lucide-react";
import { RiskProfile } from "@/types/risk";

interface RiskProfilesPanelProps {
  profiles?: RiskProfile[];
  currentProfileId?: string;
}

export function RiskProfilesPanel({
  profiles = [],
  currentProfileId = "balanced",
}: RiskProfilesPanelProps) {
  const queryClient = useQueryClient();
  const [selectedProfileId, setSelectedProfileId] = useState<string>(currentProfileId);
  const [isConfirming, setIsConfirming] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const defaultProfiles: RiskProfile[] = profiles.length > 0 ? profiles : [
    {
      profile_id: "conservative",
      name: "Conservative Institutional",
      description: "Low-drawdown capital preservation for high-net-worth institutional accounts.",
      is_default: currentProfileId === "conservative",
      max_daily_loss_pct: 2.5,
      max_portfolio_risk_pct: 3.0,
      max_single_trade_risk_pct: 0.5,
      max_leverage: 3.0,
      max_symbol_concentration_pct: 15.0,
      max_asset_class_concentration_pct: 30.0,
      drawdown_halt_threshold_pct: 8.0,
      circuit_breaker_cooldown_mins: 60,
    },
    {
      profile_id: "balanced",
      name: "Balanced Quantitative",
      description: "Standard algorithmic risk profile balancing momentum growth and capital protection.",
      is_default: currentProfileId === "balanced",
      max_daily_loss_pct: 5.0,
      max_portfolio_risk_pct: 6.0,
      max_single_trade_risk_pct: 1.0,
      max_leverage: 10.0,
      max_symbol_concentration_pct: 30.0,
      max_asset_class_concentration_pct: 50.0,
      drawdown_halt_threshold_pct: 15.0,
      circuit_breaker_cooldown_mins: 30,
    },
    {
      profile_id: "aggressive",
      name: "Aggressive Alpha Scalper",
      description: "High-frequency intraday execution with wider loss tolerance and increased leverage.",
      is_default: currentProfileId === "aggressive",
      max_daily_loss_pct: 10.0,
      max_portfolio_risk_pct: 12.0,
      max_single_trade_risk_pct: 2.0,
      max_leverage: 20.0,
      max_symbol_concentration_pct: 50.0,
      max_asset_class_concentration_pct: 75.0,
      drawdown_halt_threshold_pct: 25.0,
      circuit_breaker_cooldown_mins: 15,
    },
  ];

  const activeProfile = defaultProfiles.find((p) => p.profile_id === selectedProfileId) || defaultProfiles[1];

  const applyProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const res = await fetch("/api/risk/profiles/default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: profileId }),
      });
      return res.json();
    },
    onSuccess: () => {
      setFeedback(`Risk Profile '${activeProfile.name}' successfully activated across all bot workers.`);
      setIsConfirming(false);
      queryClient.invalidateQueries({ queryKey: ["riskOverview"] });
      queryClient.invalidateQueries({ queryKey: ["riskProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["riskLimits"] });
    },
    onError: (err: any) => {
      setFeedback(err.message || "Failed to apply risk profile");
    },
  });

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Risk Profiles & Policy Governance
          </h3>
          <p className="text-[11px] text-[#A8BDB0]">
            Select and review institutional risk templates before deploying changes to runtime risk gates.
          </p>
        </div>
        <span className="text-[10px] px-2.5 py-0.5 rounded font-mono font-bold uppercase bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40">
          Strict Confirmation Required
        </span>
      </div>

      {/* Profile Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
        {defaultProfiles.map((prof) => {
          const isSelected = prof.profile_id === selectedProfileId;
          const isCurrent = prof.is_default;
          return (
            <button
              key={prof.profile_id}
              onClick={() => {
                setSelectedProfileId(prof.profile_id);
                setIsConfirming(false);
                setFeedback(null);
              }}
              className={`p-4 rounded-2xl text-left border transition-all space-y-2 ${
                isSelected
                  ? "bg-[#123C2A] border-[#39B978]/60 shadow-lg"
                  : "bg-[#0D1914] border-[#1B3328] hover:border-[#2E7D5B]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs uppercase">{prof.name}</span>
                {isCurrent && (
                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#A8BDB0] font-sans line-clamp-2">
                {prof.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Selected Profile Specification Matrix & Activation Bar */}
      <div className="p-5 rounded-2xl bg-[#0D1914] border border-[#1B3328] space-y-4">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#1B3328] pb-2.5 flex items-center justify-between">
          <span>Parameters for: {activeProfile.name}</span>
          <span className="text-[10px] text-[#70877A] font-mono">Profile ID: {activeProfile.profile_id}</span>
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-[#07110D] border border-[#1B3328]">
            <span className="text-[10px] text-[#70877A] uppercase font-bold block">Max Risk / Trade</span>
            <span className="text-sm font-bold text-[#55C98A]">{activeProfile.max_single_trade_risk_pct}%</span>
          </div>

          <div className="p-3 rounded-xl bg-[#07110D] border border-[#1B3328]">
            <span className="text-[10px] text-[#70877A] uppercase font-bold block">Max Daily Loss</span>
            <span className="text-sm font-bold text-amber-400">{activeProfile.max_daily_loss_pct}%</span>
          </div>

          <div className="p-3 rounded-xl bg-[#07110D] border border-[#1B3328]">
            <span className="text-[10px] text-[#70877A] uppercase font-bold block">Drawdown Halt</span>
            <span className="text-sm font-bold text-red-400">{activeProfile.drawdown_halt_threshold_pct}%</span>
          </div>

          <div className="p-3 rounded-xl bg-[#07110D] border border-[#1B3328]">
            <span className="text-[10px] text-[#70877A] uppercase font-bold block">Max Leverage</span>
            <span className="text-sm font-bold text-cyan-300">{activeProfile.max_leverage}x</span>
          </div>

          <div className="p-3 rounded-xl bg-[#07110D] border border-[#1B3328]">
            <span className="text-[10px] text-[#70877A] uppercase font-bold block">Symbol Concentration</span>
            <span className="text-sm font-bold text-purple-300">{activeProfile.max_symbol_concentration_pct}%</span>
          </div>

          <div className="p-3 rounded-xl bg-[#07110D] border border-[#1B3328]">
            <span className="text-[10px] text-[#70877A] uppercase font-bold block">Asset Class Exposure</span>
            <span className="text-sm font-bold text-white">{activeProfile.max_asset_class_concentration_pct}%</span>
          </div>

          <div className="p-3 rounded-xl bg-[#07110D] border border-[#1B3328]">
            <span className="text-[10px] text-[#70877A] uppercase font-bold block">Cooldown Window</span>
            <span className="text-sm font-bold text-white">{activeProfile.circuit_breaker_cooldown_mins} Mins</span>
          </div>

          <div className="p-3 rounded-xl bg-[#07110D] border border-[#1B3328]">
            <span className="text-[10px] text-[#70877A] uppercase font-bold block">Portfolio Risk Cap</span>
            <span className="text-sm font-bold text-emerald-400">{activeProfile.max_portfolio_risk_pct}%</span>
          </div>
        </div>

        {/* Confirmation & Apply Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#1B3328]">
          <div className="text-xs text-[#A8BDB0]">
            {isConfirming ? (
              <span className="text-amber-400 font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                <span>Confirming will immediately re-configure server-side risk gates.</span>
              </span>
            ) : (
              <span>Review parameters carefully. Applying a new profile adjusts all live bot limits.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isConfirming ? (
              <>
                <button
                  onClick={() => setIsConfirming(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#07110D] hover:bg-[#123C2A] text-slate-300 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => applyProfileMutation.mutate(activeProfile.profile_id)}
                  disabled={applyProfileMutation.isPending}
                  className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                >
                  {applyProfileMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  <span>Yes, Apply Profile</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsConfirming(true)}
                className="px-5 py-2 rounded-xl bg-[#123C2A] hover:bg-[#1B4D36] text-[#55C98A] border border-[#39B978]/60 text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <Sliders className="h-4 w-4" />
                <span>Apply Profile to Platform</span>
              </button>
            )}
          </div>
        </div>

        {feedback && (
          <div className="p-3 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-mono font-bold">
            {feedback}
          </div>
        )}
      </div>
    </div>
  );
}
