"use client";

import React, { useState, useEffect } from "react";
import {
  Bot,
  Play,
  Pause,
  Square,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Copy,
  Check,
  Sliders,
  AlertTriangle,
  ArrowLeft,
  Radio,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BotConfig, BotStatus } from "@/types/bot";
import { formatDateTime } from "@/lib/formatters";

interface BotCommandHeaderProps {
  bot: BotConfig;
  status: BotStatus;
  connectionStatus: "CONNECTED" | "RECONNECTING" | "OFFLINE";
  onAction: (action: "VALIDATE" | "START" | "PAUSE" | "RESUME" | "STOP" | "RESTART" | "KILL_SWITCH") => void;
  onOpenSettings: () => void;
  onBack?: () => void;
  actionLoading: string | null;
}

export function BotCommandHeader({
  bot,
  status,
  connectionStatus,
  onAction,
  onOpenSettings,
  onBack,
  actionLoading,
}: BotCommandHeaderProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [showKillModal, setShowKillModal] = useState(false);
  const [runningDuration, setRunningDuration] = useState("");

  const isRunning = status === "RUNNING";
  const isPaused = status === "PAUSED";
  const isStopped = status === "STOPPED";
  const isReady = status === "READY" || status === "DRAFT";
  const isError = status === "ERROR";

  const mode = (bot.execution?.mode || "PAPER").toUpperCase();
  const isLive = mode === "LIVE";
  const symbol = bot.market?.symbol || "NIFTY";
  const exchange = (bot.market?.exchange || "NSE").toUpperCase();
  const strategyName = bot.strategy?.type || "Trend Pullback to EMA";
  const timeframe = bot.strategy?.timeframe || "1m";

  // Calculate Running Duration
  useEffect(() => {
    const startTime = new Date(bot.created_at || Date.now()).getTime();
    const updateDuration = () => {
      const diffMs = Math.max(0, Date.now() - startTime);
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      setRunningDuration(`${hours}h ${minutes}m ${seconds}s`);
    };
    updateDuration();
    const timer = setInterval(updateDuration, 1000);
    return () => clearInterval(timer);
  }, [bot.created_at]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(bot.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <>
      <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-4 shadow-xl select-none font-sans">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Left Side: Bot Identity & Navigation */}
          <div className="flex items-start sm:items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-[6px] border border-[#1A2B43] bg-[#050B16] text-[#91A7C1] hover:text-[#EAF3FF] hover:border-[#00C9E8]/40 transition-colors cursor-pointer"
                title="Return to Bot Fleet"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}

            <div className="h-11 w-11 rounded-[6px] bg-[#00C9E8]/10 border border-[#00C9E8]/30 flex items-center justify-center shrink-0">
              <Bot className="h-6 w-6 text-[#00C9E8]" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-bold font-mono text-[#EAF3FF] tracking-tight">
                  {bot.name}
                </h1>

                {/* Bot ID & Copy */}
                <div className="flex items-center gap-1 bg-[#050B16] border border-[#1A2B43] px-2 py-0.5 rounded text-xs font-mono text-[#91A7C1]">
                  <span>{bot.id}</span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="hover:text-[#00C9E8] p-0.5"
                    title="Copy Bot ID"
                  >
                    {copiedId ? <Check className="h-3 w-3 text-[#00D6A0]" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[6px] text-xs font-mono font-bold border">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      isRunning
                        ? "bg-[#00D6A0] animate-pulse"
                        : isPaused
                        ? "bg-[#FFB020]"
                        : isReady
                        ? "bg-[#0878FF]"
                        : isError
                        ? "bg-[#FF5268] animate-ping"
                        : "bg-[#91A7C1]"
                    )}
                  />
                  <span
                    className={cn(
                      isRunning
                        ? "text-[#00D6A0]"
                        : isPaused
                        ? "text-[#FFB020]"
                        : isReady
                        ? "text-[#0878FF]"
                        : isError
                        ? "text-[#FF5268]"
                        : "text-[#91A7C1]"
                    )}
                  >
                    {status}
                  </span>
                </div>

                {/* Mode Indicator */}
                <span
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-mono font-bold border uppercase",
                    isLive
                      ? "bg-[#FF5268]/20 text-[#FF5268] border-[#FF5268]/40 animate-pulse"
                      : "bg-[#050B16] text-[#00C9E8] border-[#00C9E8]/30"
                  )}
                >
                  {mode}
                </span>

                {/* Gateway Connection Indicator */}
                <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-[#050B16] border border-[#1A2B43]">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      connectionStatus === "CONNECTED"
                        ? "bg-[#00D6A0] animate-pulse"
                        : connectionStatus === "RECONNECTING"
                        ? "bg-[#FFB020] animate-ping"
                        : "bg-[#FF5268]"
                    )}
                  />
                  <span
                    className={cn(
                      "font-semibold",
                      connectionStatus === "CONNECTED"
                        ? "text-[#00D6A0]"
                        : connectionStatus === "RECONNECTING"
                        ? "text-[#FFB020]"
                        : "text-[#FF5268]"
                    )}
                  >
                    {connectionStatus}
                  </span>
                </div>
              </div>

              {/* Bot Meta Strip */}
              <div className="flex items-center gap-2 text-xs font-mono text-[#91A7C1] mt-1 flex-wrap">
                <span>Symbol: <strong className="text-[#00C9E8]">{symbol}</strong></span>
                <span>•</span>
                <span>Venue: <strong className="text-[#EAF3FF]">{exchange}</strong></span>
                <span>•</span>
                <span>Strategy: <strong className="text-[#EAF3FF]">{strategyName}</strong> ({timeframe})</span>
                <span>•</span>
                <span>Created: <strong>{formatDateTime(bot.created_at)}</strong></span>
                <span>•</span>
                <span>Duration: <strong className="text-[#00C9E8] tabular-nums">{runningDuration}</strong></span>
              </div>
            </div>
          </div>

          {/* Right Side: Command Controls */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* 1. Validate Bot */}
            <button
              type="button"
              onClick={() => onAction("VALIDATE")}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#050B16] border border-[#1A2B43] hover:border-[#0878FF]/50 text-xs font-mono font-semibold text-[#91A7C1] hover:text-[#EAF3FF] transition-all cursor-pointer disabled:opacity-40"
              title="Validate parameters & pre-flight conditions"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-[#0878FF]" />
              <span>Validate</span>
            </button>

            {/* 2 & 3. Pause / Resume / Start */}
            {isRunning ? (
              <button
                type="button"
                onClick={() => onAction("PAUSE")}
                disabled={!!actionLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] bg-[#FFB020]/15 hover:bg-[#FFB020]/25 text-[#FFB020] border border-[#FFB020]/40 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-40"
              >
                <Pause className="h-3.5 w-3.5" />
                <span>Pause</span>
              </button>
            ) : isPaused ? (
              <button
                type="button"
                onClick={() => onAction("RESUME")}
                disabled={!!actionLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] bg-[#00D6A0]/15 hover:bg-[#00D6A0]/25 text-[#00D6A0] border border-[#00D6A0]/40 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-40"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Resume</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onAction("START")}
                disabled={!!actionLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] bg-[#00D6A0]/15 hover:bg-[#00D6A0]/25 text-[#00D6A0] border border-[#00D6A0]/40 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-40"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Start</span>
              </button>
            )}

            {/* 4. Stop Button (With confirmation) */}
            <button
              type="button"
              onClick={() => setShowStopModal(true)}
              disabled={!!actionLoading || isStopped}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#FF5268]/15 hover:bg-[#FF5268]/25 text-[#FF5268] border border-[#FF5268]/40 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-30"
              title="Stop execution loop"
            >
              <Square className="h-3.5 w-3.5" />
              <span>Stop</span>
            </button>

            {/* 5. Emergency Kill Switch */}
            <button
              type="button"
              onClick={() => setShowKillModal(true)}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] bg-[#FF5268] hover:bg-[#E0294A] text-white text-xs font-mono font-bold transition-all shadow-md shadow-[#FF5268]/20 cursor-pointer disabled:opacity-40"
              title="Emergency Circuit Breaker"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Kill Switch</span>
            </button>

            {/* 6. Restart / Refresh */}
            <button
              type="button"
              onClick={() => onAction("RESTART")}
              disabled={!!actionLoading}
              className="p-2 rounded-[6px] bg-[#050B16] border border-[#1A2B43] hover:border-[#00C9E8]/40 text-[#91A7C1] hover:text-[#00C9E8] transition-all cursor-pointer disabled:opacity-40"
              title="Restart worker loop & telemetry"
            >
              <RefreshCw className={cn("h-4 w-4", actionLoading === "RESTART" && "animate-spin text-[#00C9E8]")} />
            </button>

            {/* 7. Bot Settings */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#050B16] border border-[#1A2B43] hover:border-[#0878FF]/50 text-xs font-mono font-semibold text-[#91A7C1] hover:text-[#EAF3FF] transition-all cursor-pointer"
              title="Configure parameters & risk boundaries"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stop Confirmation Dialog */}
      {showStopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-[8px] border border-[#FF5268]/40 bg-[#091426] p-5 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center gap-3 text-[#FF5268]">
              <div className="h-10 w-10 rounded-[6px] bg-[#FF5268]/10 border border-[#FF5268]/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-[#FF5268]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#EAF3FF]">Halt Trading Execution</h3>
                <span className="text-[10px] text-[#FF5268] font-bold uppercase">Controlled Stop</span>
              </div>
            </div>
            <p className="text-[#91A7C1] leading-relaxed">
              Are you sure you want to halt bot{" "}
              <span className="font-bold text-[#EAF3FF]">{bot.name}</span> ({bot.id})?
            </p>
            <div className="text-[11px] text-[#91A7C1] bg-[#050B16] border border-[#1A2B43] p-3 rounded-[6px] leading-relaxed">
              The automated execution loop will stop evaluating incoming quotes and will not place further order intents. Open positions will remain active unless closed manually.
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1A2B43]">
              <button
                type="button"
                onClick={() => setShowStopModal(false)}
                className="px-3 py-1.5 rounded-[4px] border border-[#1A2B43] bg-[#050B16] text-[#91A7C1] hover:text-[#EAF3FF] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowStopModal(false);
                  onAction("STOP");
                }}
                className="px-4 py-1.5 rounded-[4px] bg-[#FF5268] hover:bg-[#E0294A] font-bold text-white shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Square className="h-3.5 w-3.5" />
                <span>Confirm Stop</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Kill Switch Modal */}
      {showKillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-[8px] border-2 border-[#FF5268] bg-[#091426] p-5 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center gap-3 text-[#FF5268]">
              <div className="h-10 w-10 rounded-[6px] bg-[#FF5268]/20 border border-[#FF5268] flex items-center justify-center shrink-0">
                <ShieldAlert className="h-6 w-6 text-[#FF5268] animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">EMERGENCY KILL SWITCH</h3>
                <span className="text-[10px] text-[#FF5268] font-bold uppercase tracking-wider">Immediate Circuit Breaker</span>
              </div>
            </div>
            <p className="text-[#EAF3FF] font-semibold leading-relaxed">
              Triggering this kill switch will immediately halt all strategy evaluation routines, trigger circuit breakers, cancel unplaced intents, and disarm the execution worker for bot {bot.id}.
            </p>
            <div className="text-[11px] text-[#FF5268] bg-[#FF5268]/10 border border-[#FF5268]/30 p-3 rounded-[6px] leading-relaxed">
              WARNING: This is a protective safety action enforced at both the application level and backend risk gates.
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1A2B43]">
              <button
                type="button"
                onClick={() => setShowKillModal(false)}
                className="px-3 py-1.5 rounded-[4px] border border-[#1A2B43] bg-[#050B16] text-[#91A7C1] hover:text-[#EAF3FF] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowKillModal(false);
                  onAction("KILL_SWITCH");
                }}
                className="px-4 py-1.5 rounded-[4px] bg-[#FF5268] hover:bg-[#E0294A] font-bold text-white shadow-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldAlert className="h-4 w-4" />
                <span>CONFIRM KILL SWITCH</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

