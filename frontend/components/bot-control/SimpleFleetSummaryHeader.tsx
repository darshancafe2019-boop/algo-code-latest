"use client";

import React, { useState } from "react";
import { Plus, Play, Shield, ShieldAlert, CheckCircle2, ShieldCheck, DollarSign, Activity, AlertOctagon, TrendingUp, AlertTriangle } from "lucide-react";

interface FleetMetrics {
  total_bots: number;
  running: number;
  paused: number;
  stopped: number;
  error: number;
  draft: number;
  healthy_count: number;
  health_display: string;
  today_pnl: number;
  realized_pnl: number;
  unrealized_pnl: number;
  allocated_capital: number;
  capital_used: number;
  current_exposure: number;
  available_capital: number;
  emergency_halt_active: boolean;
}

interface SimpleFleetSummaryHeaderProps {
  metrics: FleetMetrics;
  environment: "PAPER" | "LIVE";
  onEnvironmentChange: (env: "PAPER" | "LIVE") => void;
  onCreateBot: () => void;
  onStartEligible: () => void;
  onToggleEmergencyHalt: () => void;
}

export function SimpleFleetSummaryHeader({
  metrics,
  environment,
  onEnvironmentChange,
  onCreateBot,
  onStartEligible,
  onToggleEmergencyHalt,
}: SimpleFleetSummaryHeaderProps) {
  const isHaltActive = metrics.emergency_halt_active;
  const isPnlPositive = metrics.today_pnl >= 0;

  return (
    <div className="bg-[#0B132B]/90 border border-slate-800 rounded-2xl p-4 md:p-5 backdrop-blur-md shadow-xl font-mono text-xs space-y-4">
      {/* Top Strip: Fleet Status & Environment Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-black text-white uppercase tracking-wider">
                BOT COMMAND CENTER
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                {environment}
              </span>
            </div>
            {/* Strict Mutually Exclusive Counts Invariant Strip */}
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-sans mt-0.5">
              <span className="font-bold text-white font-mono">{metrics.total_bots} Total</span>
              <span>•</span>
              <span className="text-emerald-400 font-mono font-bold">{metrics.running} Running</span>
              <span>•</span>
              <span className="text-amber-400 font-mono font-bold">{metrics.paused} Paused</span>
              <span>•</span>
              <span className="text-slate-400 font-mono font-bold">{metrics.stopped} Stopped</span>
              {metrics.error > 0 && (
                <>
                  <span>•</span>
                  <span className="text-rose-400 font-mono font-bold">{metrics.error} Error</span>
                </>
              )}
              {metrics.draft > 0 && (
                <>
                  <span>•</span>
                  <span className="text-slate-500 font-mono">{metrics.draft} Draft</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Global Primary Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateBot}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Create Bot</span>
          </button>

          <button
            onClick={onStartEligible}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-400 text-emerald-400 font-bold text-xs transition flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Eligible</span>
          </button>

          <button
            onClick={onToggleEmergencyHalt}
            className={`px-3 py-1.5 rounded-xl font-black text-xs transition flex items-center gap-1.5 border ${
              isHaltActive
                ? "bg-rose-600 text-white border-rose-500 animate-pulse"
                : "bg-rose-500/10 border-rose-500/40 text-rose-400 hover:bg-rose-500/20"
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
            <span>{isHaltActive ? "HALT ACTIVE" : "Emergency Halt"}</span>
          </button>
        </div>
      </div>

      {/* 4 Essential Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. TODAY P&L */}
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans">
            <span>Today P&L</span>
            <TrendingUp className={`w-3.5 h-3.5 ${isPnlPositive ? "text-emerald-400" : "text-rose-400"}`} />
          </div>
          <div className={`text-base md:text-lg font-black font-mono ${isPnlPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {metrics.today_pnl >= 0 ? "+" : "-"}${Math.abs(metrics.today_pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Realized: {metrics.realized_pnl >= 0 ? "+" : "-"}${Math.abs(metrics.realized_pnl).toFixed(2)}
          </div>
        </div>

        {/* 2. CURRENT EXPOSURE */}
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans">
            <span>Current Exposure</span>
            <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-base md:text-lg font-black font-mono text-white">
            ${metrics.current_exposure.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Active Open Positions
          </div>
        </div>

        {/* 3. CAPITAL USED */}
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans">
            <span>Capital Used</span>
            <Shield className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-base md:text-lg font-black font-mono text-white">
            ${metrics.capital_used.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Allocated: ${(metrics.allocated_capital / 1000).toFixed(1)}K
          </div>
        </div>

        {/* 4. SYSTEM HEALTH */}
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans">
            <span>Fleet Health</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base md:text-lg font-black font-mono text-emerald-400">
            {metrics.health_display}
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Workers & Feeds Alive
          </div>
        </div>
      </div>
    </div>
  );
}
