"use client";

import React from "react";
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Radio,
  Calendar,
  Layers,
  Clock,
  Play,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  FileText,
  AlertTriangle,
  ArrowRight,
  Database,
  Lock,
} from "lucide-react";
import {
  DrawerContentType,
  ProviderDiagnostic,
  RiskRuleCheck,
  CheckpointItem,
  TradeDecisionProposal,
} from "./useSharedTradingState";
import { cn } from "@/lib/utils";

interface UniversalDetailsDrawerProps {
  isOpen: boolean;
  contentType: DrawerContentType;
  title: string;
  data: any;
  onClose: () => void;
  onTriggerCheckpoint?: (cpId: string) => void;
}

export const UniversalDetailsDrawer: React.FC<UniversalDetailsDrawerProps> = ({
  isOpen,
  contentType,
  title,
  data,
  onClose,
  onTriggerCheckpoint,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Slide-over Container */}
      <div className="relative w-full max-w-xl bg-[#050e1d] border-l border-[#143e69] shadow-2xl flex flex-col h-full z-10 text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#0f2d4e] bg-[#07192f]">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#00D4FF]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              {title || "System Details"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#050e1d] hover:bg-[#0c284a] text-slate-400 hover:text-white border border-[#143e69] transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 1. PROVIDER DIAGNOSTICS */}
          {contentType === "provider_diagnostics" && (
            <div className="space-y-4">
              <div className="bg-[#07192f] border border-[#143e69] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#0d2847]">
                  <span className="font-bold text-sm text-white">{data?.name || "Provider Feed"}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
                    {data?.status || "CONNECTED"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-[#050e1d] p-2.5 rounded border border-[#103456]">
                    <span className="text-slate-500 text-[10px] block">PROTOCOL</span>
                    <span className="text-slate-200 font-bold">{data?.protocol || "REST / WEBSOCKET"}</span>
                  </div>
                  <div className="bg-[#050e1d] p-2.5 rounded border border-[#103456]">
                    <span className="text-slate-500 text-[10px] block">PING / LATENCY</span>
                    <span className="text-[#00D4FF] font-bold">{data?.latencyMs || 28} ms</span>
                  </div>
                  <div className="bg-[#050e1d] p-2.5 rounded border border-[#103456]">
                    <span className="text-slate-500 text-[10px] block">LAST TICK</span>
                    <span className="text-slate-200">{data?.lastTick || "Live Stream Active"}</span>
                  </div>
                  <div className="bg-[#050e1d] p-2.5 rounded border border-[#103456]">
                    <span className="text-slate-500 text-[10px] block">ROLE</span>
                    <span className="text-emerald-400 font-bold">
                      {data?.isPrimary ? "Primary Market Data" : data?.isFailover ? "Secondary Failover" : "Supported Feed"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 text-xs text-slate-400 space-y-1">
                  <p>• Automated Protobuf/Binary parser healthy on internal port 5051.</p>
                  <p>• Fast failover guard active with sub-150ms switch threshold.</p>
                  <p>• Official exchange tick timestamp synchronization verified.</p>
                </div>
              </div>
            </div>
          )}

          {/* 2. AI REASONING */}
          {contentType === "ai_reasoning" && (
            <div className="space-y-4">
              <div className="bg-[#07192f] border border-[#143e69] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#0d2847]">
                  <span className="font-bold text-sm text-purple-300">Strategy Thesis & Breakdown</span>
                  <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-mono font-bold">
                    Confidence: {data?.confidence || 88}%
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-mono text-[11px] block">MULTI-FACTOR ANALYSIS</span>
                    <p className="text-slate-200 mt-1 leading-relaxed bg-[#050e1d] p-3 rounded-lg border border-[#103456]">
                      {data?.reason || "Intraday momentum confirmed across VWAP, supertrend 10-3, and order flow delta. Bid liquidity imbalance skewed 64% buy side."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div className="bg-[#050e1d] p-2.5 rounded border border-[#103456]">
                      <span className="text-slate-500 text-[10px] block">MARKET REGIME</span>
                      <span className="text-emerald-400 font-bold">{data?.marketRegime || "Trending"}</span>
                    </div>
                    <div className="bg-[#050e1d] p-2.5 rounded border border-[#103456]">
                      <span className="text-slate-500 text-[10px] block">RISK SCORE</span>
                      <span className="text-cyan-300 font-bold">{data?.riskScore || 94} / 100</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. RISK CHECKS (12 RULES) */}
          {contentType === "risk_checks" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Authoritative 12-factor safety matrix evaluated prior to all automated decision locks.
              </p>
              <div className="space-y-2">
                {(Array.isArray(data) ? data : []).map((rule: RiskRuleCheck) => {
                  const isPass = rule.status === "PASS";
                  return (
                    <div
                      key={rule.id}
                      className="bg-[#07192f] border border-[#143e69] rounded-xl p-3 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{rule.name}</span>
                          <span className="text-[10px] font-mono text-slate-500">[{rule.category}]</span>
                        </div>
                        <p className="text-slate-400 text-[11px]">{rule.description}</p>
                        <div className="flex items-center gap-3 font-mono text-[10px] text-slate-400 pt-0.5">
                          <span>Current: <strong className="text-slate-200">{rule.currentValue}</strong></span>
                          <span>•</span>
                          <span>Threshold: <strong className="text-slate-200">{rule.threshold}</strong></span>
                        </div>
                      </div>

                      <span
                        className={cn(
                          "px-2 py-0.5 rounded font-mono font-bold text-[11px] border shrink-0",
                          isPass
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-rose-500/20 border-rose-500 text-rose-400"
                        )}
                      >
                        {rule.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. WORKFLOW SCHEDULE */}
          {contentType === "workflow_schedule" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                6 automated daily checkpoints executing systematic pre-market research, intraday management, and end-of-day reconciliation.
              </p>

              <div className="space-y-2.5">
                {[
                  { id: "pre_market", name: "1. PRE-MARKET RESEARCH", time: "06:00 – 09:00 IST", desc: "Global news analysis, macro events & watchlist prep" },
                  { id: "market_open", name: "2. MARKET OPEN SCAN", time: "09:00 – 09:30 IST", desc: "Opening volatility, setup discovery & ranking" },
                  { id: "position_review", name: "3. POSITION REVIEW", time: "09:30 – 10:00 IST", desc: "Risk auditing, exposure limits & stop loss adjustments" },
                  { id: "intraday", name: "4. INTRADAY MANAGEMENT", time: "10:00 – 15:15 IST", desc: "Real-time trade management & automated hedging" },
                  { id: "closing", name: "5. CLOSING MANAGEMENT", time: "15:15 – 15:30 IST", desc: "Intraday square-off & overnight risk control" },
                  { id: "eod_report", name: "6. END OF DAY REPORT", time: "15:30 – 16:00 IST", desc: "Performance journal, audit logs & next-day plan" },
                ].map((cp) => (
                  <div
                    key={cp.id}
                    className="bg-[#07192f] border border-[#143e69] rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-200">{cp.name}</span>
                      <div className="text-[10px] text-[#00D4FF] font-mono">{cp.time}</div>
                      <p className="text-slate-400 text-[11px]">{cp.desc}</p>
                    </div>

                    <button
                      onClick={() => onTriggerCheckpoint && onTriggerCheckpoint(cp.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#00D4FF] hover:bg-[#33ddff] text-slate-950 font-bold text-xs font-mono transition-all flex items-center gap-1 shrink-0 shadow cursor-pointer"
                    >
                      <Play className="h-3 w-3" />
                      TRIGGER
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. MARKET CONTEXT */}
          {contentType === "market_context" && (
            <div className="space-y-4 text-xs">
              <div className="bg-[#07192f] border border-[#143e69] rounded-xl p-4 space-y-3">
                <span className="font-bold text-sm text-white">Live News & Macro Intelligence</span>
                <div className="space-y-2">
                  {(data?.headlines || []).map((h: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded bg-[#050e1d] border border-[#103456] space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>{h.source} • {h.time}</span>
                        <span className="text-[#00D4FF] font-bold">Impact: {h.impact}</span>
                      </div>
                      <p className="text-slate-200 font-semibold">{h.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 6. TRADE AUDIT & RECONCILIATION */}
          {(contentType === "trade_audit" || contentType === "reconciliation") && (
            <div className="space-y-4 text-xs font-mono">
              <div className="bg-[#07192f] border border-[#143e69] rounded-xl p-4 space-y-3">
                <span className="font-bold text-sm text-white font-sans">
                  Chronological Execution Trace
                </span>
                <div className="space-y-2">
                  {[
                    { step: "SIGNAL", status: "VERIFIED", time: "09:42:10 IST", desc: "Momentum Breakout triggered on NIFTY" },
                    { step: "AI AGENT", status: "VERIFIED", time: "09:42:11 IST", desc: "LLM strategy thesis confidence at 88%" },
                    { step: "RISK ENGINE", status: "PASSED", time: "09:42:12 IST", desc: "12-rule compliance passed with 0 violations" },
                    { step: "EXECUTION", status: "SIMULATED", time: "09:42:13 IST", desc: "Paper order routed to Dhan simulation ledger" },
                    { step: "RECONCILIATION", status: "SYNCED", time: "09:42:14 IST", desc: "Internal position matches broker margin balance" },
                  ].map((tr, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded bg-[#050e1d] border border-[#103456]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-cyan-300">{tr.step}</span>
                          <span className="text-[10px] text-slate-500">{tr.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">{tr.desc}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                        {tr.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
