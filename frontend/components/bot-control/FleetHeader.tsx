"use client";

import React, { useState } from "react";
import {
  Bot,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
  CheckCircle2,
  MoreVertical,
  Activity,
  Layers,
  Download,
  Play,
  Pause,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FleetHeaderProps {
  totalBots: number;
  runningBots: number;
  loading: boolean;
  onSync: () => void;
  onDeploy: () => void;
  onBulkAction?: (action: "start_all" | "pause_all" | "export") => void;
}

export function FleetHeader({
  totalBots,
  runningBots,
  loading,
  onSync,
  onDeploy,
  onBulkAction,
}: FleetHeaderProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const lastSyncTime = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date());

  return (
    <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-3.5 sm:p-4 shadow-lg select-none font-sans">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
        {/* Title & Engine Metadata */}
        <div className="flex items-start sm:items-center gap-3">
          <div className="h-10 w-10 rounded-[6px] bg-[#00C9E8]/10 border border-[#00C9E8]/30 flex items-center justify-center shrink-0">
            <Bot className="h-5 w-5 text-[#00C9E8]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#EAF3FF] font-mono">
                QUANTITATIVE BOT FLEET
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#0878FF]/15 text-[#00C9E8] border border-[#0878FF]/30">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00C9E8] animate-pulse" />
                QUANT.OS ENGINE v4.8.2-PROD
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#050B16] text-[#91A7C1] border border-[#1A2B43] font-semibold">
                {totalBots} {totalBots === 1 ? "Unit" : "Units"} Enrolled ({runningBots} Running)
              </span>
              <span className="text-[10px] font-mono text-[#91A7C1] hidden md:inline">
                • Last Sync: <strong className="text-[#EAF3FF]">{lastSyncTime}</strong>
              </span>
            </div>
            <p className="text-[11px] text-[#91A7C1] mt-0.5 max-w-3xl leading-relaxed">
              Institutional algorithmic trading fleet with isolated risk gates, high-frequency execution telemetry, and deterministic canonical lifecycle controls.
            </p>
          </div>
        </div>

        {/* Right-Side Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Fleet Synced Status Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-[#050B16] border border-[#1A2B43] text-[10px] font-mono font-semibold text-[#00D6A0]">
            <CheckCircle2 className="h-3 w-3 text-[#00D6A0]" />
            <span>Fleet Synced</span>
          </div>

          {/* Sync Fleet */}
          <button
            type="button"
            onClick={onSync}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#050B16] border border-[#1A2B43] hover:border-[#0878FF]/50 text-xs font-mono font-semibold text-[#91A7C1] hover:text-[#EAF3FF] transition-colors cursor-pointer disabled:opacity-50"
            title="Synchronize fleet telemetry with core backend"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading ? "animate-spin text-[#00C9E8]" : "text-[#91A7C1]")} />
            <span>Sync Fleet</span>
          </button>

          {/* Deploy New Bot */}
          <button
            type="button"
            onClick={onDeploy}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] bg-[#00C9E8]/15 border border-[#00C9E8]/40 text-xs font-mono font-bold text-[#00C9E8] hover:bg-[#00C9E8]/25 transition-colors cursor-pointer"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Deploy New Bot</span>
          </button>

          {/* More Actions Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-1.5 rounded-[6px] bg-[#050B16] border border-[#1A2B43] hover:border-[#0878FF]/50 text-[#91A7C1] hover:text-[#EAF3FF] transition-colors cursor-pointer"
              title="More Fleet Actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMoreMenu && (
              <div
                className="absolute right-0 mt-1 w-44 rounded-[6px] bg-[#0B1728] border border-[#1A2B43] shadow-2xl py-1 z-30 font-mono text-[11px]"
                onMouseLeave={() => setShowMoreMenu(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    onBulkAction?.("start_all");
                  }}
                  className="w-full text-left px-3 py-1.5 text-[#00D6A0] hover:bg-[#091426] flex items-center gap-2"
                >
                  <Play className="h-3 w-3" />
                  <span>Start All Bots</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    onBulkAction?.("pause_all");
                  }}
                  className="w-full text-left px-3 py-1.5 text-[#F5B942] hover:bg-[#091426] flex items-center gap-2"
                >
                  <Pause className="h-3 w-3" />
                  <span>Pause All Bots</span>
                </button>
                <div className="border-t border-[#1A2B43] my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    onBulkAction?.("export");
                  }}
                  className="w-full text-left px-3 py-1.5 text-[#91A7C1] hover:text-[#EAF3FF] hover:bg-[#091426] flex items-center gap-2"
                >
                  <Download className="h-3 w-3" />
                  <span>Export Fleet CSV</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
