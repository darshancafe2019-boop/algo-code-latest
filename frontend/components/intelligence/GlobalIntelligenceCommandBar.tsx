"use client";

import React from "react";
import {
  Brain,
  Radio,
  ShieldCheck,
  ShieldAlert,
  Bot,
  Zap,
  RefreshCw,
  Clock,
  Layers,
  ChevronDown,
  Activity,
  Sliders,
  ExternalLink,
} from "lucide-react";
import { useActiveBot } from "@/context/ActiveBotContext";

interface GlobalIntelligenceCommandBarProps {
  executionMode?: "PAPER" | "LIVE";
  symbol?: string;
  exchange?: string;
  strategyName?: string;
  timeframe?: string;
  lastUpdatedText?: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onKillSwitch?: () => void;
  feedLatencyMs?: number;
  marketStatus?: string;
}

export function GlobalIntelligenceCommandBar({
  executionMode = "PAPER",
  symbol = "BTC/USDT",
  exchange = "Binance Futures",
  strategyName = "EMA 9/21 MACD Volume Profile Trend Strategy",
  timeframe = "15m Primary",
  lastUpdatedText = "Live Feed Active",
  isRefreshing = false,
  onRefresh,
  onKillSwitch,
  feedLatencyMs = 14.5,
  marketStatus = "MARKET OPEN 24/7",
}: GlobalIntelligenceCommandBarProps) {
  const isLive = executionMode === "LIVE";
  const { activeSymbol, setActiveSymbol } = useActiveBot();

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl flex flex-wrap items-center justify-between gap-4 font-sans select-none">
      {/* Left: Intelligence Engine Identity & Market Context */}
      <div className="flex items-center gap-3.5">
        <div className="p-3 rounded-2xl bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/30 text-[var(--theme-accent)] shadow-md shadow-[var(--theme-accent)]/10">
          <Brain className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--theme-text-primary)]">
              Trading Intelligence Operating System
            </h1>
            {/* Environment Badge */}
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono border flex items-center gap-1.5 ${
                isLive
                  ? "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/40 animate-pulse"
                  : "bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border-[var(--theme-accent)]/30"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isLive ? "bg-[var(--theme-loss)]" : "bg-[var(--theme-accent)]"
                }`}
              />
              {isLive ? "LIVE CAPITAL" : "PAPER SIMULATION"}
            </span>

            {/* Active Symbol Tag */}
            <span className="text-[11px] font-mono font-extrabold px-2 py-0.5 rounded-lg bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] text-[var(--theme-accent)]">
              {symbol}
            </span>
          </div>

          <p className="text-xs text-[var(--theme-text-secondary)] mt-0.5 flex items-center gap-2 flex-wrap font-mono">
            <span>{exchange} • {strategyName} ({timeframe})</span>
            <span className="text-[10px] text-[var(--theme-text-muted)]">
              • {lastUpdatedText}
            </span>
          </p>
        </div>
      </div>

      {/* Right: Operational Telemetry & Safety Actions */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {/* Direct Feed Latency Badge */}
        <div
          className="px-2.5 py-1.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] flex items-center gap-1.5 text-xs font-mono"
          title="Direct WebSocket / Ticker Stream"
        >
          <Radio className="h-3.5 w-3.5 text-[var(--theme-profit)] animate-pulse" />
          <span className="text-[11px] text-[var(--theme-text-secondary)]">FEED:</span>
          <span className="font-bold text-[var(--theme-profit)] text-[11px] tabular-nums">
            {feedLatencyMs.toFixed(1)}ms DIRECT
          </span>
        </div>

        {/* Market Status Badge */}
        <div
          className="px-2.5 py-1.5 rounded-xl bg-[var(--theme-profit)]/10 border border-[var(--theme-profit)]/30 flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--theme-profit)]"
          title="Exchange session operational state"
        >
          <Activity className="h-3.5 w-3.5" />
          <span className="text-[11px]">{marketStatus}</span>
        </div>

        {/* 20-Stage Risk Gate Status */}
        <div
          className="px-2.5 py-1.5 rounded-xl bg-[var(--theme-profit)]/10 border border-[var(--theme-profit)]/30 flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--theme-profit)]"
          title="20 Pre-Order Risk Gate Checks Armed & Continuous Monitoring"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="text-[11px]">20-GATE ARMED</span>
        </div>

        {/* Refresh Tickers Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border)] transition disabled:opacity-50"
            title="Force Refresh Decision Engine & Quotes"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-[var(--theme-accent)]" : ""}`} />
          </button>
        )}

        {/* Emergency Kill Switch (If Live) */}
        {isLive && onKillSwitch && (
          <button
            onClick={onKillSwitch}
            className="px-3 py-1.5 rounded-xl bg-[var(--theme-loss)] text-white text-xs font-bold font-mono flex items-center gap-1.5 shadow-md shadow-[var(--theme-loss)]/30 hover:opacity-90 active:scale-95 transition"
            title="Halt all live execution bots and square off open positions"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>HALT ALL</span>
          </button>
        )}
      </div>
    </div>
  );
}
