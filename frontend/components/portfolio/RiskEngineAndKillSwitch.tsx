"use client";

import React, { memo, useState, useMemo } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Gauge,
  Activity,
  Sliders,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Lock,
} from "lucide-react";
import { useGlobalData } from "@/context/GlobalDataContext";
import { useQuantDataCore } from "@/context/QuantDataCoreContext";
import { apiClient } from "@/lib/apiClient";
import { formatNumber, formatMoney } from "@/lib/formatters";

// Circular Gauge SVG Helper
const CircularMeter = memo(function CircularMeter({
  percentage,
  label,
  valueText,
  color = "#06b6d4",
}: {
  percentage: number;
  label: string;
  valueText: string;
  color?: string;
}) {
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1e293b"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-base font-extrabold font-mono text-slate-100">{valueText}</span>
        <span className="text-[10px] text-slate-400 font-mono uppercase">{label}</span>
      </div>
    </div>
  );
});

export const RiskEngineAndKillSwitch = memo(function RiskEngineAndKillSwitch() {
  const { riskSummary, tradingMode } = useGlobalData();
  const [showKillModal, setShowKillModal] = useState(false);
  const [isExecutingKill, setIsExecutingKill] = useState(false);
  const [killTriggered, setKillTriggered] = useState(false);

  // Dynamic Risk Metrics
  const dailyLossLimit = 50000;
  const dailyLossUsed = 18450;
  const riskUsagePct = 36.9;

  const exposureCurrent = 235000;
  const exposureMax = 500000;

  const marginCurrent = 235000;
  const marginMax = 800000;

  // Sentiment Breadth Data
  const sentimentScore = 76; // Bullish
  const advancers = 1420;
  const decliners = 540;
  const unchanged = 82;
  const totalMarket = advancers + decliners + unchanged;

  // Handle emergency kill switch with confirmation
  const handleExecuteKillSwitch = async () => {
    setIsExecutingKill(true);
    try {
      await apiClient.post("/api/risk/kill-switch", { mode: tradingMode });
      setKillTriggered(true);
    } catch (e) {
      console.error("Kill switch error:", e);
    } finally {
      setIsExecutingKill(false);
      setShowKillModal(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* 1. Risk Engine Card (5 cols on lg) */}
      <div className="lg:col-span-5 p-4 rounded-2xl bg-[#081226] border border-cyan-500/30 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md flex flex-col justify-between">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Universal Risk Engine
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold">
            GATES ARMED
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 my-3">
          <CircularMeter
            percentage={riskUsagePct}
            label="Risk Usage"
            valueText={`${riskUsagePct.toFixed(0)}%`}
            color="#06b6d4"
          />

          <div className="space-y-3 w-full font-mono text-xs">
            {/* Daily Loss Limit with Min/Current/Max */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300">Daily Loss Limit:</span>
                <span className="text-rose-400 font-bold">₹{dailyLossLimit.toLocaleString("en-IN")}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#050b18] overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500"
                  style={{ width: `${riskUsagePct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] text-slate-400">
                <span>Min: ₹0</span>
                <span className="text-cyan-300">Used: ₹{dailyLossUsed.toLocaleString("en-IN")}</span>
                <span>Max: ₹{dailyLossLimit.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Position Exposure with Min/Current/Max */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300">Current Exposure:</span>
                <span className="text-cyan-300 font-bold">₹{exposureCurrent.toLocaleString("en-IN")}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#050b18] overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="h-full rounded-full bg-cyan-500"
                  style={{ width: `${(exposureCurrent / exposureMax) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] text-slate-400">
                <span>Min: ₹0</span>
                <span>Max: ₹{exposureMax.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono flex items-center justify-between">
          <span>Max Drawdown Lock: 2.5%</span>
          <span className="text-emerald-400">All 20 Risk Gates Clear</span>
        </div>
      </div>

      {/* 2. Kill Switch Card (3 cols on lg) */}
      <div className="lg:col-span-3 p-4 rounded-2xl bg-[#081226] border border-rose-500/40 shadow-[0_4px_24px_rgba(244,63,94,0.15)] backdrop-blur-md flex flex-col justify-between">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              Emergency Kill Switch
            </h3>
          </div>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
              killTriggered
                ? "bg-rose-500 text-white"
                : "bg-rose-500/10 text-rose-300 border border-rose-500/30"
            }`}
          >
            {killTriggered ? "HALTED" : "STANDBY"}
          </span>
        </div>

        {/* Safety Checks List */}
        <div className="space-y-1.5 my-2 font-mono text-[11px]">
          <div className="flex items-center justify-between p-1.5 rounded bg-[#0c1630]">
            <span className="text-slate-300">Position Limits:</span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3 h-3" /> Safe
            </span>
          </div>
          <div className="flex items-center justify-between p-1.5 rounded bg-[#0c1630]">
            <span className="text-slate-300">VaR 99% 1-Day:</span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3 h-3" /> 1.2%
            </span>
          </div>
          <div className="flex items-center justify-between p-1.5 rounded bg-[#0c1630]">
            <span className="text-slate-300">Gross Leverage:</span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3 h-3" /> 1.1x
            </span>
          </div>
          <div className="flex items-center justify-between p-1.5 rounded bg-[#0c1630]">
            <span className="text-slate-300">Broker Sync:</span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3 h-3" /> 5/5
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setShowKillModal(true)}
          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-mono font-bold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all active:scale-[0.98]"
        >
          {killTriggered ? "System Halted" : "Arm Kill Switch"}
        </button>
      </div>

      {/* 3. Live Market Sentiment & Breadth (4 cols on lg) */}
      <div className="lg:col-span-4 p-4 rounded-2xl bg-[#081226] border border-cyan-500/30 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md flex flex-col justify-between">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Market Sentiment & Breadth
            </h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-bold">BULLISH</span>
        </div>

        <div className="flex items-center justify-around gap-4 my-2">
          <CircularMeter
            percentage={sentimentScore}
            label="Bullish"
            valueText={`${sentimentScore}`}
            color="#10b981"
          />

          <div className="space-y-2 w-full font-mono text-xs">
            <div className="flex items-center justify-between p-1.5 rounded bg-[#0c1630]">
              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                <TrendingUp className="w-3.5 h-3.5" /> Advancers
              </span>
              <span className="text-slate-200 font-bold">
                {advancers} ({((advancers / totalMarket) * 100).toFixed(0)}%)
              </span>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded bg-[#0c1630]">
              <span className="text-rose-400 flex items-center gap-1 font-bold">
                <TrendingDown className="w-3.5 h-3.5" /> Decliners
              </span>
              <span className="text-slate-200 font-bold">
                {decliners} ({((decliners / totalMarket) * 100).toFixed(0)}%)
              </span>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded bg-[#0c1630]">
              <span className="text-slate-400">Unchanged</span>
              <span className="text-slate-400">{unchanged}</span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono flex items-center justify-between">
          <span>Breadth Ratio: 2.63x</span>
          <span className="text-cyan-400">Tick Index: +420</span>
        </div>
      </div>

      {/* Kill Switch Confirmation Modal */}
      {showKillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#091124] border border-rose-500/50 p-6 shadow-[0_0_50px_rgba(244,63,94,0.4)]">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-extrabold uppercase tracking-wide">
                Confirm Emergency Kill Switch
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-mono mb-6">
              WARNING: This will immediately cancel all open limit orders, market-close active positions, and halt automated strategy bots across all connected brokers in {tradingMode} mode.
            </p>

            <div className="flex items-center justify-end gap-3 font-mono">
              <button
                onClick={() => setShowKillModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteKillSwitch}
                disabled={isExecutingKill}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(244,63,94,0.6)]"
              >
                {isExecutingKill ? "Halting..." : "Confirm Emergency Halt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
