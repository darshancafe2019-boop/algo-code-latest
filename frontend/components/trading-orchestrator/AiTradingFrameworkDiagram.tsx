"use client";

import React, { useState } from "react";
import {
  Brain,
  ShieldCheck,
  Zap,
  Building2,
  Database,
  Radio,
  Newspaper,
  FileCheck2,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  Activity,
  Lock,
  Flame,
  Power,
  RotateCcw,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Checkpoint {
  id: string;
  name: string;
  timeRange: string;
  icon: React.ComponentType<{ className?: string }>;
  items: string[];
  status?: "completed" | "active" | "pending";
}

const CHECKPOINTS: Checkpoint[] = [
  {
    id: "pre_market",
    name: "1. PRE-MARKET RESEARCH",
    timeRange: "06:00 – 09:00",
    icon: Newspaper,
    items: [
      "Global news analysis",
      "Economic calendar",
      "Overnight moves",
      "Watchlist prep",
      "AI market outlook",
    ],
  },
  {
    id: "market_open",
    name: "2. MARKET OPEN SCAN",
    timeRange: "09:00 – 09:30",
    icon: BarChart3,
    items: [
      "Scan opportunities",
      "Identify setups",
      "Rank trade ideas",
      "Check liquidity/volatility",
      "Prepare entry plan",
    ],
  },
  {
    id: "position_review",
    name: "3. POSITION REVIEW",
    timeRange: "09:30 – 10:00",
    icon: FileCheck2,
    items: [
      "Review existing positions",
      "Check risk exposure",
      "Adjust stop/targets",
      "Validate thesis",
      "Cancel/modify orders",
    ],
  },
  {
    id: "intraday",
    name: "4. INTRADAY MANAGEMENT",
    timeRange: "10:00 – 15:15",
    icon: Activity,
    items: [
      "Monitor open trades",
      "Manage exits/targets",
      "React to market changes",
      "Look for new opportunities",
      "Risk control in real-time",
    ],
  },
  {
    id: "closing",
    name: "5. CLOSING MANAGEMENT",
    timeRange: "15:15 – 15:30",
    icon: RotateCcw,
    items: [
      "Exit or close positions",
      "Square off if required",
      "Check pending orders",
      "Manage overnight risk",
      "Final trade decisions",
    ],
  },
  {
    id: "eod_report",
    name: "6. END OF DAY REPORT",
    timeRange: "15:30 – 16:00",
    icon: Calendar,
    items: [
      "P&L summary",
      "Trade performance",
      "Lessons learned (AI)",
      "Update strategy notes",
      "Prepare for next day",
    ],
  },
];

interface AiTradingFrameworkDiagramProps {
  onTriggerCheckpoint?: (checkpointId: string) => void;
  onKillSwitch?: () => void;
  isKilled?: boolean;
  tradingMode?: string;
  liveTradingEnabled?: boolean;
  activeCheckpointId?: string;
  latestDecision?: any;
}

export const AiTradingFrameworkDiagram: React.FC<AiTradingFrameworkDiagramProps> = ({
  onTriggerCheckpoint,
  onKillSwitch,
  isKilled = false,
  liveTradingEnabled = false,
  activeCheckpointId,
  latestDecision,
}) => {
  const [liveToggle, setLiveToggle] = useState(liveTradingEnabled);

  return (
    <div className="w-full bg-[#030914] border border-[#0d223a] rounded-xl p-4 sm:p-6 text-slate-100 font-sans shadow-2xl overflow-hidden select-none">
      {/* 1. Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between pb-6 border-b border-[#0e2a47] gap-4">
        {/* Left: Quant.OS Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#00D4FF] via-[#0088FF] to-[#0044CC] flex items-center justify-center shadow-lg shadow-[#00D4FF]/20 ring-1 ring-[#00D4FF]/40">
            <span className="text-white font-black text-xl tracking-tight">Q</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-2xl tracking-tight text-white font-sans">
                Quant<span className="text-[#00D4FF]">.OS</span>
              </span>
              <span className="h-2 w-2 rounded-full bg-[#00D4FF] animate-ping" />
            </div>
            <p className="text-[10px] tracking-[0.18em] font-semibold text-[#00D4FF] uppercase">
              TRADE SMARTER • WITH AI
            </p>
          </div>
        </div>

        {/* Center: Title + Flow Subtitle */}
        <div className="text-center flex-1 max-w-2xl px-2">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            AI-Assisted Scheduled Trading Framework
          </h1>
          <div className="flex items-center justify-center flex-wrap gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold text-[#66C2FF] mt-1">
            <span>Research</span>
            <span className="text-[#00D4FF]">→</span>
            <span>Decide</span>
            <span className="text-[#00D4FF]">→</span>
            <span>Risk Check</span>
            <span className="text-[#00D4FF]">→</span>
            <span>Execute</span>
            <span className="text-[#00D4FF]">→</span>
            <span>Monitor</span>
            <span className="text-[#00D4FF]">→</span>
            <span>Reconcile</span>
          </div>
        </div>

        {/* Right: 24/7 Operation Badge */}
        <div className="flex flex-col items-end text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] text-xs font-bold shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
            24/7 OPERATION
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium tracking-wider">
            AUTOMATED • DISCIPLINED • DATA-DRIVEN
          </div>
          <div className="text-[10px] text-[#00D4FF] font-semibold tracking-wider">
            BUILT FOR TRADERS
          </div>
        </div>
      </div>

      {/* 2. Top Container: Trading Day Schedule */}
      <div className="mt-6 rounded-xl bg-[#040f1f]/90 border border-[#103152] p-4 relative">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-bold text-[#38BDF8] tracking-wider uppercase flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#00D4FF]" />
            TRADING DAY SCHEDULE (AUTOMATED CHECKPOINTS)
          </span>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            SAME WORKFLOW EVERY DAY • PERSISTENT CONTEXT • ADAPTS TO MARKET CONDITIONS
          </span>
        </div>

        {/* 6 Checkpoint Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 relative">
          {CHECKPOINTS.map((cp, idx) => {
            const isLast = idx === CHECKPOINTS.length - 1;
            const isActive = activeCheckpointId === cp.id;

            return (
              <div
                key={cp.id}
                onClick={() => onTriggerCheckpoint && onTriggerCheckpoint(cp.id)}
                className={cn(
                  "relative rounded-lg p-3 bg-[#07192f] border transition-all duration-200 cursor-pointer group hover:bg-[#0a2342]",
                  isActive
                    ? "border-[#00D4FF] shadow-lg shadow-[#00D4FF]/20 bg-[#092547]"
                    : "border-[#143d63] hover:border-[#00D4FF]/60"
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-1.5 border-b border-[#123657]">
                  <span className="font-bold text-[11px] tracking-tight text-white group-hover:text-[#00D4FF] transition-colors">
                    {cp.name}
                  </span>
                </div>

                {/* Time Range */}
                <div className="flex items-center gap-1.5 text-[10px] text-[#38BDF8] font-mono font-medium mt-1">
                  <Clock className="h-3 w-3" />
                  {cp.timeRange}
                </div>

                {/* Bullets */}
                <div className="mt-2.5 space-y-1">
                  {cp.items.map((item, i) => (
                    <div
                      key={i}
                      className="text-[10px] text-slate-300 flex items-center gap-1.5 leading-tight"
                    >
                      <span className="h-1 w-1 rounded-full bg-[#00D4FF]/80 shrink-0" />
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>

                {/* Arrow connector for large screens */}
                {!isLast && (
                  <div className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-[#00D4FF] font-bold text-xs pointer-events-none drop-shadow">
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Schedule Footer Caption */}
        <div className="mt-3 pt-2 border-t border-[#0f2d4a] text-center">
          <p className="text-[10px] text-[#38BDF8] font-mono tracking-wide uppercase">
            ⇅ EACH CHECKPOINT USES SHARED STATE AND UPDATES CONTINUITY RECORDS ⇅
          </p>
        </div>
      </div>

      {/* 3. Middle Section: Flow Pipeline */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        {/* Col 1: MARKET DATA & NEWS (3 cols) */}
        <div className="md:col-span-3 space-y-4 flex flex-col justify-between">
          {/* Top Box: MARKET DATA (LIVE FEED) */}
          <div className="rounded-xl bg-[#051329] border border-[#12385e] p-3.5 flex-1">
            <div className="flex items-center gap-2 pb-2 border-b border-[#0f2f50]">
              <Radio className="h-4 w-4 text-[#00D4FF] animate-pulse" />
              <span className="font-bold text-xs tracking-wide text-white uppercase">
                MARKET DATA (LIVE FEED)
              </span>
            </div>
            <div className="mt-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] p-1.5 rounded bg-[#09223f] border border-[#143e69]">
                <span className="text-slate-200 font-medium">Dhan (Live Feed)</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
              </div>
              <div className="flex items-center justify-between text-[11px] p-1.5 rounded bg-[#09223f] border border-[#143e69]">
                <span className="text-slate-200 font-medium">Delta Exchange</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
              </div>
              <div className="flex items-center justify-between text-[11px] p-1.5 rounded bg-[#09223f] border border-[#143e69]">
                <span className="text-slate-200 font-medium">Fyers (Live Feed)</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8]" />
              </div>
              <div className="flex items-center justify-between text-[11px] p-1.5 rounded bg-[#09223f] border border-[#143e69]">
                <span className="text-slate-200 font-medium">Upstox (Live Feed)</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
              </div>
              <div className="text-[10px] text-slate-400 space-y-1 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#00D4FF]" />
                  <span>Indices / Global Markets</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#00D4FF]" />
                  <span>Options Chain Data</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#00D4FF]" />
                  <span>Real-time WebSocket</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#00D4FF]" />
                  <span>Historical Data</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Box: NEWS & CONTEXT */}
          <div className="rounded-xl bg-[#051329] border border-[#12385e] p-3.5 flex-1">
            <div className="flex items-center gap-2 pb-2 border-b border-[#0f2f50]">
              <Newspaper className="h-4 w-4 text-[#38BDF8]" />
              <span className="font-bold text-xs tracking-wide text-white uppercase">
                NEWS & CONTEXT
              </span>
            </div>
            <div className="mt-2.5 space-y-1 text-[11px] text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-[#38BDF8]" />
                <span>Financial News (Live)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-[#38BDF8]" />
                <span>Economic Calendar</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-[#38BDF8]" />
                <span>Company Announcements</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-[#38BDF8]" />
                <span>Social Sentiment (Optional)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-[#38BDF8]" />
                <span>Earnings & Events</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-[#38BDF8]" />
                <span>Macro Indicators</span>
              </div>
            </div>
          </div>
        </div>

        {/* Col 2: AI STRATEGY AGENT (2 cols) */}
        <div className="md:col-span-2 rounded-xl bg-[#061833] border border-[#00D4FF]/40 p-3.5 shadow-lg shadow-[#00D4FF]/10 flex flex-col">
          <div className="flex items-center gap-2 pb-2 border-b border-[#113a63]">
            <div className="h-7 w-7 rounded-lg bg-[#00D4FF]/20 flex items-center justify-center">
              <Brain className="h-4 w-4 text-[#00D4FF]" />
            </div>
            <div>
              <span className="font-bold text-xs text-white block leading-tight">
                AI STRATEGY AGENT
              </span>
              <span className="text-[10px] text-[#38BDF8] font-mono">GPT-6 Astra (or LLM)</span>
            </div>
          </div>
          <div className="mt-3 space-y-1.5 text-[10px] text-slate-200 flex-1">
            <div className="p-1 rounded bg-[#092447] border border-[#13426e]">Analyze market data</div>
            <div className="p-1 rounded bg-[#092447] border border-[#13426e]">Read news & sentiment</div>
            <div className="p-1 rounded bg-[#092447] border border-[#13426e]">Use strategy rules</div>
            <div className="p-1 rounded bg-[#092447] border border-[#13426e]">Consider current positions</div>
            <div className="p-1 rounded bg-[#092447] border border-[#13426e] text-[#00D4FF] font-semibold">Generate trade decision</div>
            <div className="p-1 rounded bg-[#092447] border border-[#13426e]">Explain reasoning</div>
            <div className="p-1 rounded bg-[#092447] border border-[#13426e]">Adapt to market conditions</div>
            <div className="p-1 rounded bg-[#092447] border border-[#13426e]">Update plan in real-time</div>
          </div>
        </div>

        {/* Col 3: TRADE DECISION (2 cols) */}
        <div className="md:col-span-2 rounded-xl bg-[#061833] border border-[#163f69] p-3.5 flex flex-col">
          <div className="flex items-center gap-2 pb-2 border-b border-[#113a63]">
            <FileCheck2 className="h-4 w-4 text-[#38BDF8]" />
            <span className="font-bold text-xs tracking-wide text-white uppercase">
              TRADE DECISION
            </span>
          </div>
          <div className="mt-3 space-y-1.5 text-[10px] flex-1">
            <div className="flex justify-between p-1 rounded bg-[#0a264a] border border-[#154675]">
              <span className="text-slate-400">Symbol / Instrument</span>
              <span className="text-white font-mono font-bold">{latestDecision?.symbol || "NIFTY26MARFUT"}</span>
            </div>
            <div className="flex justify-between p-1 rounded bg-[#0a264a] border border-[#154675]">
              <span className="text-slate-400">Action</span>
              <span className="text-[#10B981] font-bold">{latestDecision?.action || "BUY"}</span>
            </div>
            <div className="flex justify-between p-1 rounded bg-[#0a264a] border border-[#154675]">
              <span className="text-slate-400">Entry / Exit Price</span>
              <span className="text-white font-mono">22,450.00</span>
            </div>
            <div className="flex justify-between p-1 rounded bg-[#0a264a] border border-[#154675]">
              <span className="text-slate-400">Quantity / Size</span>
              <span className="text-white font-mono">50 Qty (1 Lot)</span>
            </div>
            <div className="flex justify-between p-1 rounded bg-[#0a264a] border border-[#154675]">
              <span className="text-slate-400">Stop Loss / TP</span>
              <span className="text-white font-mono">SL: 22,380 | TP: 22,600</span>
            </div>
            <div className="flex justify-between p-1 rounded bg-[#0a264a] border border-[#154675]">
              <span className="text-slate-400">Time In Force</span>
              <span className="text-white font-mono">DAY</span>
            </div>
            <div className="flex justify-between p-1 rounded bg-[#0a264a] border border-[#154675]">
              <span className="text-slate-400">Strategy Tag</span>
              <span className="text-[#38BDF8] font-mono">MOMENTUM_BREAK</span>
            </div>
            <div className="flex justify-between p-1 rounded bg-[#0a264a] border border-[#154675]">
              <span className="text-slate-400">Confidence</span>
              <span className="text-[#10B981] font-bold">88%</span>
            </div>
          </div>
        </div>

        {/* Col 4: RISK ENGINE & GUARDRAILS (2 cols) */}
        <div className="md:col-span-2 rounded-xl bg-[#061833] border border-[#163f69] p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-[#113a63]">
              <ShieldCheck className="h-4 w-4 text-[#10B981]" />
              <span className="font-bold text-xs tracking-wide text-white uppercase">
                RISK ENGINE & GUARDRAILS
              </span>
            </div>
            <div className="mt-2.5 space-y-1 text-[10px] text-slate-300">
              <div>• Position size limits</div>
              <div>• Max loss per trade</div>
              <div>• Daily loss limit</div>
              <div>• Exposure limits (sector/total)</div>
              <div>• Leverage & margin checks</div>
              <div>• Volatility & liquidity checks</div>
              <div>• Strategy compliance</div>
              <div>• Block unsafe trades</div>
            </div>
          </div>

          <div className="mt-3 p-2 rounded-lg bg-[#10B981]/20 border border-[#10B981]/50 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[#10B981] text-[11px] font-bold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              APPROVED TO EXECUTE
            </div>
            <div className="text-[9px] text-[#10B981]/80 mt-0.5">If all risk checks pass</div>
          </div>
        </div>

        {/* Col 5: EXECUTION LAYER & BROKER API (3 cols) */}
        <div className="md:col-span-3 space-y-3 flex flex-col">
          {/* Execution Layer Box */}
          <div className="rounded-xl bg-[#05142b] border border-[#143e69] p-3.5 flex-1">
            <div className="flex items-center gap-2 pb-2 border-b border-[#113a63]">
              <Zap className="h-4 w-4 text-[#38BDF8]" />
              <span className="font-bold text-xs tracking-wide text-white uppercase">
                EXECUTION LAYER
              </span>
            </div>

            {/* Paper vs Live Box */}
            <div className="mt-2.5 space-y-2">
              {/* Paper Trading Pill */}
              <div className="p-2 rounded-lg bg-[#00D4FF]/10 border border-[#00D4FF]/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#00D4FF]">
                    <Send className="h-3 w-3" />
                    PAPER TRADING (Default)
                  </div>
                  <span className="h-2 w-2 rounded-full bg-[#00D4FF] animate-pulse" />
                </div>
                <div className="mt-1 text-[9px] text-slate-300 grid grid-cols-2 gap-0.5">
                  <div>• Simulated execution</div>
                  <div>• Track performance</div>
                  <div>• Realistic slippage/fees</div>
                  <div>• No real money at risk</div>
                </div>
              </div>

              {/* Live Trading Pill */}
              <div className="p-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#EF4444]">
                    <Flame className="h-3 w-3" />
                    LIVE TRADING (Disabled by Default)
                  </div>
                  <Lock className="h-3 w-3 text-[#EF4444]" />
                </div>
                <div className="mt-1 text-[9px] text-slate-300 grid grid-cols-2 gap-0.5">
                  <div>• Requires manual approval</div>
                  <div>• Real broker execution</div>
                  <div>• Human confirmation gate</div>
                  <div>• Real-time order mgmt</div>
                </div>
              </div>

              {/* Kill Switch Controls */}
              <div className="pt-2 border-t border-[#113a63] space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-medium">Approve Live Trading</span>
                  <button
                    onClick={() => setLiveToggle(!liveToggle)}
                    className={cn(
                      "w-10 h-5 rounded-full transition-colors relative p-0.5",
                      liveToggle ? "bg-[#10B981]" : "bg-slate-700"
                    )}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full bg-white transition-transform",
                        liveToggle ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                <button
                  onClick={onKillSwitch}
                  className={cn(
                    "w-full py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer",
                    isKilled
                      ? "bg-amber-600 hover:bg-amber-500 text-white"
                      : "bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-red-500/20"
                  )}
                >
                  <Power className="h-4 w-4" />
                  {isKilled ? "RESET KILL SWITCH" : "KILL SWITCH (STOP ALL TRADING)"}
                </button>
              </div>
            </div>
          </div>

          {/* Broker API Box */}
          <div className="rounded-xl bg-[#05142b] border border-[#143e69] p-3">
            <div className="flex items-center gap-2 pb-1.5 border-b border-[#113a63]">
              <Building2 className="h-4 w-4 text-[#38BDF8]" />
              <span className="font-bold text-xs tracking-wide text-white uppercase">
                BROKER API
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 my-2">
              <div className="text-center p-1 rounded bg-[#09223f] border border-[#154675] text-[10px] font-bold text-slate-200">
                Dhan
              </div>
              <div className="text-center p-1 rounded bg-[#09223f] border border-[#154675] text-[10px] font-bold text-slate-200">
                Delta
              </div>
              <div className="text-center p-1 rounded bg-[#09223f] border border-[#154675] text-[10px] font-bold text-slate-200">
                Fyers
              </div>
              <div className="text-center p-1 rounded bg-[#09223f] border border-[#154675] text-[10px] font-bold text-slate-200">
                Upstox
              </div>
            </div>
            <div className="mt-1 p-1.5 rounded bg-[#09223f] text-[10px] text-center font-mono font-bold text-[#38BDF8] border border-[#154675]">
              NSE | BSE | MCX | CDS | GLOBAL | CRYPTO
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Container: Shared State / Continuity Store */}
      <div className="mt-6 rounded-xl bg-[#040f1f]/90 border border-[#103152] p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-[#103457] gap-2">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[#00D4FF]" />
            <span className="font-bold text-xs tracking-wide text-white uppercase">
              SHARED STATE / CONTINUITY STORE
            </span>
            <span className="text-[11px] text-[#38BDF8] hidden md:inline">
              (Persistent memory for the trading system)
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            USED BY ALL CHECKPOINTS • PERSISTENT BETWEEN SESSIONS
          </span>
        </div>

        {/* 7 Horizontal Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mt-3">
          <div className="p-2 rounded-lg bg-[#071d36] border border-[#13426e] text-center">
            <div className="text-[11px] font-bold text-white">Current Positions</div>
            <div className="text-[9px] text-[#38BDF8] mt-0.5">Live + Paper</div>
          </div>
          <div className="p-2 rounded-lg bg-[#071d36] border border-[#13426e] text-center">
            <div className="text-[11px] font-bold text-white">Open Orders</div>
            <div className="text-[9px] text-[#38BDF8] mt-0.5">Active / Pending</div>
          </div>
          <div className="p-2 rounded-lg bg-[#071d36] border border-[#13426e] text-center">
            <div className="text-[11px] font-bold text-white">Trade History</div>
            <div className="text-[9px] text-[#38BDF8] mt-0.5">Executed Trades</div>
          </div>
          <div className="p-2 rounded-lg bg-[#071d36] border border-[#13426e] text-center">
            <div className="text-[11px] font-bold text-white">Strategy State</div>
            <div className="text-[9px] text-[#38BDF8] mt-0.5">Plans / Parameters</div>
          </div>
          <div className="p-2 rounded-lg bg-[#071d36] border border-[#13426e] text-center">
            <div className="text-[11px] font-bold text-white">Market Context</div>
            <div className="text-[9px] text-[#38BDF8] mt-0.5">Key Signals / Regime</div>
          </div>
          <div className="p-2 rounded-lg bg-[#071d36] border border-[#13426e] text-center">
            <div className="text-[11px] font-bold text-white">AI Notes & Reasoning</div>
            <div className="text-[9px] text-[#38BDF8] mt-0.5">Daily Journals</div>
          </div>
          <div className="p-2 rounded-lg bg-[#071d36] border border-[#13426e] text-center">
            <div className="text-[11px] font-bold text-white">Performance Metrics</div>
            <div className="text-[9px] text-[#38BDF8] mt-0.5">P&L / Risk / Stats</div>
          </div>
        </div>
      </div>

      {/* 5. Footer Tech Stack & Breadcrumbs Bar */}
      <div className="mt-4 pt-3 border-t border-[#0e2a47] flex flex-col md:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        {/* Left: Tech Badges */}
        <div className="flex items-center flex-wrap gap-2">
          <span className="px-2 py-0.5 rounded bg-[#0a2340] border border-[#123e69] text-slate-300 font-mono">Next.js</span>
          <span className="px-2 py-0.5 rounded bg-[#0a2340] border border-[#123e69] text-slate-300 font-mono">Python</span>
          <span className="px-2 py-0.5 rounded bg-[#0a2340] border border-[#123e69] text-slate-300 font-mono">WebSocket</span>
          <span className="px-2 py-0.5 rounded bg-[#0a2340] border border-[#123e69] text-slate-300 font-mono">Redis</span>
          <span className="px-2 py-0.5 rounded bg-[#0a2340] border border-[#123e69] text-slate-300 font-mono">Scalable</span>
          <span className="px-2 py-0.5 rounded bg-[#0a2340] border border-[#123e69] text-[#10B981] font-mono font-bold">Production Ready</span>
        </div>

        {/* Right: Steps */}
        <div className="flex items-center gap-1.5 font-bold text-slate-400">
          <span>BUILD</span>
          <span className="text-slate-600">›</span>
          <span>BACKTEST</span>
          <span className="text-slate-600">›</span>
          <span>PAPER TRADE</span>
          <span className="text-slate-600">›</span>
          <span>GO LIVE</span>
          <span className="text-slate-600">›</span>
          <span className="text-[#00D4FF] uppercase tracking-wide">BE A BETTER TRADER</span>
        </div>
      </div>
    </div>
  );
};
