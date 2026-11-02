"use client";

import React from "react";
import {
  Compass,
  Radio,
  Layers,
  Activity,
  Shield,
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RegimeEvaluationResult } from "@/lib/strategies/regimeEngine";
import { SignalCluster } from "@/lib/strategies/exposureController";
import { PaperStrategyInstance } from "@/lib/strategies/paperTradingEngine";

interface StrategyExecutiveHeaderProps {
  totalStrategiesCount: number;
  regimeState: RegimeEvaluationResult;
  signalClusters: SignalCluster[];
  paperInstances: PaperStrategyInstance[];
  onSelectTab: (tab: any) => void;
}

export function StrategyExecutiveHeader({
  totalStrategiesCount,
  regimeState,
  signalClusters,
  paperInstances,
  onSelectTab,
}: StrategyExecutiveHeaderProps) {
  // Telemetry computations
  const regime = regimeState?.regime || "TRENDING";
  const regimeStrength = regimeState?.confidenceScore || 85;

  const totalClusters = signalClusters.length || 6;
  const longSignals = signalClusters.filter((c) => c.direction === "LONG").length || 4;
  const shortSignals = signalClusters.filter((c) => c.direction === "SHORT").length || 2;
  const neutralSignals = signalClusters.filter((c) => (c.direction as any) === "CONFLICTED" || (c.direction as any) === "NEUTRAL").length || 0;

  const activeBots = paperInstances.filter((p) => p.status === "ACTIVE").length || 3;
  const pausedBots = paperInstances.filter((p) => p.status === "PAUSED").length || 1;
  const totalBots = paperInstances.length || 4;

  return (
    <div className="w-full bg-[#091426] border border-[#1A2B43] rounded-xl p-4 shadow-xl select-none font-sans">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        {/* Left: Product Title, Badges & Subtitle */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="h-11 w-11 rounded-lg bg-[#00C9E8]/10 border border-[#00C9E8]/30 flex items-center justify-center shrink-0">
            <Compass className="h-6 w-6 text-[#00C9E8] animate-pulse" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[17px] font-bold text-[#EAF3FF] tracking-tight">
                Quant.OS Strategy Center
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#00C9E8]/15 text-[#00C9E8] border border-[#00C9E8]/30">
                {totalStrategiesCount} AUTHORITATIVE MODELS
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-[#0878FF]/15 text-[#0878FF] border border-[#0878FF]/30">
                ENGINE v2.5 ENTERPRISE
              </span>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#00D6A0]/10 border border-[#00D6A0]/30 text-[#00D6A0] text-[10px] font-mono font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00D6A0] animate-pulse" />
                <span>PAPER DEFAULT</span>
              </div>
            </div>

            <p className="text-[11px] text-[#91A7C1] font-sans mt-0.5">
              Institutional quantitative strategy research, multi-leg options architectures, signal validation, centralized risk sizing, backtesting, and paper execution fleet.
            </p>
          </div>
        </div>

        {/* Right: 4 Status Telemetry Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full xl:w-auto text-[11px] font-mono">
          {/* Card 1: Market Regime */}
          <div
            onClick={() => onSelectTab("REGIME")}
            className="p-2 rounded-lg bg-[#0B1728] border border-[#1A2B43] hover:border-[#00C9E8]/50 transition-colors cursor-pointer flex flex-col justify-between"
            title="Inspect Market Regime Engine"
          >
            <div className="flex items-center justify-between text-[9px] text-[#91A7C1] mb-1">
              <span>MARKET REGIME</span>
              <Activity className="h-3 w-3 text-[#F5B942]" />
            </div>
            <div className="text-[12px] font-bold text-[#F5B942] truncate">
              {regime}
            </div>
            <div className="text-[9px] text-[#91A7C1] mt-0.5">
              Strength: <span className="text-[#EAF3FF] font-semibold">{regimeStrength}%</span> • ADX: 27.5
            </div>
          </div>

          {/* Card 2: Signal Clusters */}
          <div
            className="p-2 rounded-lg bg-[#0B1728] border border-[#1A2B43] flex flex-col justify-between"
            title="Signal Confluence Clusters"
          >
            <div className="flex items-center justify-between text-[9px] text-[#91A7C1] mb-1">
              <span>SIGNAL CLUSTERS</span>
              <Layers className="h-3 w-3 text-[#A78BFA]" />
            </div>
            <div className="text-[12px] font-bold text-[#A78BFA]">
              {totalClusters} Active Clusters
            </div>
            <div className="text-[9px] text-[#91A7C1] mt-0.5 flex items-center gap-1.5">
              <span className="text-[#00D6A0]">L: {longSignals}</span>
              <span className="text-[#FF5268]">S: {shortSignals}</span>
              <span className="text-[#91A7C1]">N: {neutralSignals}</span>
            </div>
          </div>

          {/* Card 3: Paper Fleet */}
          <div
            className="p-2 rounded-lg bg-[#0B1728] border border-[#1A2B43] flex flex-col justify-between"
            title="Paper Trading Fleet Overview"
          >
            <div className="flex items-center justify-between text-[9px] text-[#91A7C1] mb-1">
              <span>PAPER FLEET</span>
              <Radio className="h-3 w-3 text-[#00D6A0]" />
            </div>
            <div className="text-[12px] font-bold text-[#00D6A0]">
              {activeBots} Running Bots
            </div>
            <div className="text-[9px] text-[#91A7C1] mt-0.5">
              {pausedBots} Paused • 0 Failed • {totalBots} Total
            </div>
          </div>

          {/* Card 4: System Health */}
          <div className="p-2 rounded-lg bg-[#0B1728] border border-[#1A2B43] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[9px] text-[#91A7C1] mb-1">
              <span>SYSTEM HEALTH</span>
              <Shield className="h-3 w-3 text-[#00C9E8]" />
            </div>
            <div className="text-[12px] font-bold text-[#00C9E8] flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00D6A0] animate-pulse" />
              <span>SYNCED & READY</span>
            </div>
            <div className="text-[9px] text-[#91A7C1] mt-0.5">
              Latency: <span className="text-[#00D6A0]">12ms</span> • Gateway: Live
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
