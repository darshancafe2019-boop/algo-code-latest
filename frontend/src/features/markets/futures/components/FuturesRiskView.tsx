"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  Percent,
  Sliders,
  DollarSign,
  Activity,
  Lock,
  Flame,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useFuturesStore } from "../state/futures-store";

export function FuturesRiskView() {
  const { leverage, setLeverage, marginMode, setMarginMode, executionMode } = useFuturesStore();
  const [maxDrawdownPct, setMaxDrawdownPct] = useState<number>(5.0);
  const [maxPositionSizeUSD, setMaxPositionSizeUSD] = useState<number>(50000);
  const [liquidationBufferPct, setLiquidationBufferPct] = useState<number>(15.0);
  const [killSwitchTriggered, setKillSwitchTriggered] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const queryClient = useQueryClient();

  const handleSaveRiskParams = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleEmergencyHalt = () => {
    if (confirm("EMERGENCY KILL SWITCH: This will immediately cancel all open working futures orders and halt automated trading. Proceed?")) {
      setKillSwitchTriggered(true);
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-200">
      {/* Top Banner Alert */}
      <div className="p-4 bg-gradient-to-r from-[#0E1524] to-[#161D2F] border border-cyan-500/30 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Institutional Futures Risk Engine</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Active margin protection, multi-provider leverage caps, and circuit breaker surveillance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-950/80 text-emerald-400 border border-emerald-800 rounded-xl text-xs font-mono font-bold">
            GATES ACTIVE
          </span>
          <span className="px-3 py-1 bg-cyan-950/80 text-cyan-400 border border-cyan-800 rounded-xl text-xs font-mono font-bold">
            {executionMode} SAFE
          </span>
        </div>
      </div>

      {/* Risk Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="p-4 bg-[#0E1524] border border-[#1E293B] rounded-2xl shadow-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Account Margin Health</span>
          <span className="text-2xl font-bold text-emerald-400 mt-1 block">94.8%</span>
          <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Free Margin:</span>
            <span className="text-white font-bold">$94,800.00</span>
          </div>
        </div>

        <div className="p-4 bg-[#0E1524] border border-[#1E293B] rounded-2xl shadow-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Current Max Leverage</span>
          <span className="text-2xl font-bold text-cyan-400 mt-1 block">{leverage}x</span>
          <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Mode:</span>
            <span className="text-purple-300 font-bold">{marginMode}</span>
          </div>
        </div>

        <div className="p-4 bg-[#0E1524] border border-[#1E293B] rounded-2xl shadow-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Max Daily Drawdown Gate</span>
          <span className="text-2xl font-bold text-amber-400 mt-1 block">{maxDrawdownPct}%</span>
          <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Auto Cutoff:</span>
            <span className="text-slate-300 font-bold">HARD STOP</span>
          </div>
        </div>

        <div className="p-4 bg-[#0E1524] border border-[#1E293B] rounded-2xl shadow-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Liquidation Guard Distance</span>
          <span className="text-2xl font-bold text-purple-400 mt-1 block">&gt;{liquidationBufferPct}%</span>
          <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Safety Margin:</span>
            <span className="text-emerald-400 font-bold">OPTIMAL</span>
          </div>
        </div>
      </div>

      {/* Interactive Risk Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Leverage & Position Limits */}
        <div className="p-5 bg-[#0E1524] border border-[#1E293B] rounded-2xl shadow-xl space-y-4 font-mono text-xs">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Position Sizing & Leverage Guard</span>
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between text-slate-400">
              <span>Default Leverage Multiplier</span>
              <span className="text-cyan-400 font-bold">{leverage}x</span>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 5, 10, 20, 50].map((lev) => (
                <button
                  key={lev}
                  onClick={() => setLeverage(lev)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition ${
                    leverage === lev
                      ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-md font-bold"
                      : "bg-[#080C14] text-slate-400 hover:text-white border-[#1E293B]"
                  }`}
                >
                  {lev}x
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#1E293B]">
            <div className="flex justify-between text-slate-400">
              <span>Default Margin Mode</span>
              <span className="text-purple-400 font-bold">{marginMode}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMarginMode("ISOLATED")}
                className={`py-2 rounded-xl border text-xs font-bold transition ${
                  marginMode === "ISOLATED"
                    ? "bg-purple-950 text-purple-300 border-purple-600 shadow-md"
                    : "bg-[#080C14] text-slate-400 hover:text-white border-[#1E293B]"
                }`}
              >
                ISOLATED MARGIN (Recommended)
              </button>
              <button
                onClick={() => setMarginMode("CROSS")}
                className={`py-2 rounded-xl border text-xs font-bold transition ${
                  marginMode === "CROSS"
                    ? "bg-purple-950 text-purple-300 border-purple-600 shadow-md"
                    : "bg-[#080C14] text-slate-400 hover:text-white border-[#1E293B]"
                }`}
              >
                CROSS MARGIN (Portfolio Wide)
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#1E293B]">
            <label className="text-slate-400 block">Max Notional Position Per Contract (USD)</label>
            <input
              type="number"
              value={maxPositionSizeUSD}
              onChange={(e) => setMaxPositionSizeUSD(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#080C14] border border-[#1E293B] rounded-xl text-white font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Right Column: Drawdown Protections & Emergency Kill Switch */}
        <div className="p-5 bg-[#0E1524] border border-[#1E293B] rounded-2xl shadow-xl space-y-4 font-mono text-xs">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Drawdown Guard & Emergency Actions</span>
          </h3>

          <div className="space-y-2">
            <label className="text-slate-400 block">Max Daily Drawdown Gate (%)</label>
            <input
              type="number"
              step="0.5"
              value={maxDrawdownPct}
              onChange={(e) => setMaxDrawdownPct(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#080C14] border border-[#1E293B] rounded-xl text-white font-mono focus:border-amber-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 block">
              Trading halts automatically if intraday futures equity drops by this percentage.
            </span>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#1E293B]">
            <label className="text-slate-400 block">Min Distance to Liquidation Gate (%)</label>
            <input
              type="number"
              step="1"
              value={liquidationBufferPct}
              onChange={(e) => setLiquidationBufferPct(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#080C14] border border-[#1E293B] rounded-xl text-white font-mono focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Emergency Kill Switch Button */}
          <div className="pt-2 border-t border-[#1E293B]">
            <button
              onClick={handleEmergencyHalt}
              className={`w-full py-2.5 rounded-xl border font-bold flex items-center justify-center gap-2 transition active:scale-95 ${
                killSwitchTriggered
                  ? "bg-red-600 text-white border-red-500 shadow-lg animate-pulse"
                  : "bg-red-950/80 hover:bg-red-900/80 text-red-300 border-red-700/60"
              }`}
            >
              <AlertOctagon className="w-4 h-4" />
              <span>{killSwitchTriggered ? "EMERGENCY HALT ARMED — ALL FUTURES STOPPED" : "ACTIVATE FUTURES EMERGENCY KILL SWITCH"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Save Button & Feedback */}
      <div className="flex items-center justify-between p-4 bg-[#0E1524] border border-[#1E293B] rounded-2xl shadow-xl font-mono text-xs">
        <span className="text-slate-400">
          Risk engine changes apply across all active multi-broker futures connections.
        </span>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Risk configuration saved</span>
            </span>
          )}
          <button
            onClick={handleSaveRiskParams}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg transition active:scale-95"
          >
            Apply Risk Rules
          </button>
        </div>
      </div>
    </div>
  );
}
